import type { Expense, Settlement } from "@/types";

export type ActivityItem =
  | { kind: "expense"; date: string; expense: Expense }
  | { kind: "settlement"; date: string; settlement: Settlement };

/** Merges expenses and settlements into one reverse-chronological timeline. */
export function buildActivityFeed(expenses: Expense[], settlements: Settlement[]): ActivityItem[] {
  const items: ActivityItem[] = [
    ...expenses.map((expense): ActivityItem => ({ kind: "expense", date: expense.date, expense })),
    ...settlements.map((settlement): ActivityItem => ({ kind: "settlement", date: settlement.date, settlement })),
  ];

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface ActivityGroup {
  label: string;
  items: ActivityItem[];
}

/** "August 2026" -- toLocaleDateString resolves in the viewer's local
 * timezone by default (no explicit UTC conversion), so a transaction near a
 * month boundary groups under the month it actually happened in for the
 * viewer, not whatever month that UTC instant falls in. */
export function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Groups an already-sorted (newest-first) feed into month buckets, in the
 * order they first appear -- so the newest month leads, and within it items
 * stay in the same newest-first order buildActivityFeed already produced.
 */
export function groupByMonth(items: ActivityItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];

  for (const item of items) {
    const label = monthLabel(item.date);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}

/**
 * Total paise spent by the whole flat in each calendar month, keyed by the
 * same label groupByMonth uses. Computed straight from expenses (not the
 * merged activity feed), so settlements -- transfers between members, not
 * new spending -- never contribute, and the figure stays independent of
 * whatever search/category filters the Activity page currently has applied.
 */
export function calculateMonthlyExpenseTotals(expenses: Expense[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    const label = monthLabel(expense.date);
    totals.set(label, (totals.get(label) ?? 0) + expense.amountPaise);
  }
  return totals;
}
