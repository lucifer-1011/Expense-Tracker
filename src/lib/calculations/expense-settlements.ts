import type { Expense, ExpenseSettlementGroup, ExpenseSettlementItem, Settlement, SettlementRequest } from "@/types";

interface RawEdge {
  expenseId: string;
  expenseTitle: string;
  expenseDate: string;
  counterpartId: string;
  /** True when the counterpart owes the current user; false when the current user owes the counterpart. */
  youAreOwed: boolean;
  originalPaise: number;
}

function edgeKey(expenseId: string, counterpartId: string): string {
  return `${expenseId}:${counterpartId}`;
}

function directionMatches(
  s: { fromFlatMemberId: string; toFlatMemberId: string },
  edge: RawEdge,
  currentMemberId: string
): boolean {
  return edge.youAreOwed
    ? s.fromFlatMemberId === edge.counterpartId && s.toFlatMemberId === currentMemberId
    : s.fromFlatMemberId === currentMemberId && s.toFlatMemberId === edge.counterpartId;
}

/**
 * Per-expense (not per-counterpart) amounts still owed between the current
 * user and each of their flatmates -- deliberately never netted across
 * expenses, unlike generateSuggestedSettlements. Each returned item is
 * traceable to exactly one expense.
 *
 * A settlement/settlement_request tied to a specific expense_id reduces only
 * that expense's edge. Older settlements recorded before expense-level
 * tracking existed (expense_id null) are applied, oldest-expense-first,
 * against the same counterpart's outstanding edges in the matching
 * direction -- a best-effort reconciliation of historical data, not a new
 * financial record; nothing is written back to the database by this.
 */
export function getExpenseSettlementItems(
  currentMemberId: string,
  expenses: Expense[],
  settlements: Settlement[],
  settlementRequests: SettlementRequest[]
): ExpenseSettlementItem[] {
  if (!currentMemberId) return [];

  const edges: RawEdge[] = [];
  for (const expense of expenses) {
    const payerId = expense.paidByFlatMemberId;
    for (const split of expense.splits) {
      if (split.flatMemberId === payerId || split.shareAmountPaise <= 0) continue;

      if (split.flatMemberId === currentMemberId) {
        edges.push({
          expenseId: expense.id,
          expenseTitle: expense.title,
          expenseDate: expense.date,
          counterpartId: payerId,
          youAreOwed: false,
          originalPaise: split.shareAmountPaise,
        });
      } else if (payerId === currentMemberId) {
        edges.push({
          expenseId: expense.id,
          expenseTitle: expense.title,
          expenseDate: expense.date,
          counterpartId: split.flatMemberId,
          youAreOwed: true,
          originalPaise: split.shareAmountPaise,
        });
      }
    }
  }

  const edgeByKey = new Map(edges.map((e) => [edgeKey(e.expenseId, e.counterpartId), e]));
  const remainingByKey = new Map(edges.map((e) => [edgeKey(e.expenseId, e.counterpartId), e.originalPaise]));

  const approvedSettlements = settlements.filter(
    (s) => s.fromFlatMemberId === currentMemberId || s.toFlatMemberId === currentMemberId
  );

  // Exactly-attributed settlements first.
  for (const s of approvedSettlements) {
    if (!s.expenseId) continue;
    const counterpartId = s.fromFlatMemberId === currentMemberId ? s.toFlatMemberId : s.fromFlatMemberId;
    const key = edgeKey(s.expenseId, counterpartId);
    const edge = edgeByKey.get(key);
    if (!edge || !directionMatches(s, edge, currentMemberId)) continue;
    remainingByKey.set(key, (remainingByKey.get(key) ?? 0) - s.amountPaise);
  }

  // Legacy (pre-expense-tracking) settlements: FIFO against the same
  // counterpart + direction's oldest still-outstanding edges.
  const legacySettlements = approvedSettlements
    .filter((s) => !s.expenseId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (const s of legacySettlements) {
    const youAreOwed = s.toFlatMemberId === currentMemberId;
    const counterpartId = youAreOwed ? s.fromFlatMemberId : s.toFlatMemberId;
    let left = s.amountPaise;

    const candidates = edges
      .filter((e) => e.counterpartId === counterpartId && e.youAreOwed === youAreOwed)
      .sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());

    for (const edge of candidates) {
      if (left <= 0) break;
      const key = edgeKey(edge.expenseId, edge.counterpartId);
      const rem = remainingByKey.get(key) ?? 0;
      if (rem <= 0) continue;
      const consume = Math.min(rem, left);
      remainingByKey.set(key, rem - consume);
      left -= consume;
    }
  }

  const pendingByKey = new Map<string, string>();
  for (const r of settlementRequests) {
    if (r.status !== "pending" || !r.expenseId) continue;
    if (r.payerFlatMemberId !== currentMemberId && r.receiverFlatMemberId !== currentMemberId) continue;
    const counterpartId = r.payerFlatMemberId === currentMemberId ? r.receiverFlatMemberId : r.payerFlatMemberId;
    const edge = edgeByKey.get(edgeKey(r.expenseId, counterpartId));
    if (!edge || !directionMatches({ fromFlatMemberId: r.payerFlatMemberId, toFlatMemberId: r.receiverFlatMemberId }, edge, currentMemberId)) {
      continue;
    }
    pendingByKey.set(edgeKey(r.expenseId, counterpartId), r.id);
  }

  const items: ExpenseSettlementItem[] = [];
  for (const edge of edges) {
    const key = edgeKey(edge.expenseId, edge.counterpartId);
    const remaining = remainingByKey.get(key) ?? 0;
    if (remaining <= 0) continue;
    items.push({
      key,
      expenseId: edge.expenseId,
      expenseTitle: edge.expenseTitle,
      expenseDate: edge.expenseDate,
      counterpartFlatMemberId: edge.counterpartId,
      youAreOwed: edge.youAreOwed,
      amountPaise: remaining,
      pendingRequestId: pendingByKey.get(key),
    });
  }

  return items;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Collapses per-expense items into one card per purpose: same (normalized)
 * title + same counterpart + same direction. Two expenses titled "Utilities"
 * merge into one card; "Utilities" and "WiFi" never do, even between the
 * same two people -- and the same title between two *different* people
 * never merges either, since counterpart is part of the key. Category is
 * deliberately not part of the key: it's a coarse 9-value enum shared by
 * unrelated expenses (e.g. "Netflix" and "Spotify" are both "entertainment"),
 * so grouping by it would merge things a user would never consider the same
 * purpose. Title is what the user actually names the expense, which is what
 * every example of "same purpose" in practice comes down to here.
 */
export function groupExpenseSettlementItems(items: ExpenseSettlementItem[]): ExpenseSettlementGroup[] {
  const groups = new Map<string, ExpenseSettlementItem[]>();
  for (const item of items) {
    const key = `${normalizeTitle(item.expenseTitle)}:${item.counterpartFlatMemberId}:${item.youAreOwed}`;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else groups.set(key, [item]);
  }

  return Array.from(groups.entries()).map(([key, groupItems]) => {
    const oldestFirst = [...groupItems].sort(
      (a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime()
    );
    const mostRecent = groupItems.reduce((latest, i) =>
      new Date(i.expenseDate) > new Date(latest.expenseDate) ? i : latest
    );
    return {
      key,
      title: mostRecent.expenseTitle,
      counterpartFlatMemberId: mostRecent.counterpartFlatMemberId,
      youAreOwed: mostRecent.youAreOwed,
      amountPaise: groupItems.reduce((sum, i) => sum + i.amountPaise, 0),
      isPending: groupItems.every((i) => Boolean(i.pendingRequestId)),
      items: oldestFirst,
    };
  });
}

/**
 * Splits one entered amount across a group's underlying expenses, oldest
 * first, never allocating more to an expense than it actually still owes --
 * so settling a group records one precisely-attributed settlement per
 * expense instead of one untraceable lump sum.
 */
export function allocateAmountAcrossItems(
  items: Pick<ExpenseSettlementItem, "expenseId" | "amountPaise">[],
  amountPaise: number
): { expenseId: string; amountPaise: number }[] {
  let left = amountPaise;
  const allocations: { expenseId: string; amountPaise: number }[] = [];
  for (const item of items) {
    if (left <= 0) break;
    const take = Math.min(item.amountPaise, left);
    if (take > 0) allocations.push({ expenseId: item.expenseId, amountPaise: take });
    left -= take;
  }
  return allocations;
}
