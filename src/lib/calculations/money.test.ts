/**
 * Money regression tests. Run with `npm test` (node:test, no extra deps).
 *
 * The invariant these all defend: money is integer paise end to end, every
 * split reconciles to its expense to the paisa, and nothing in the display
 * layer is allowed to round paise away. The bug that prompted these was the
 * last of those three -- an exact 24950 + 24950 split of Rs 499 rendered as
 * "Rs 250 + Rs 250" because the formatter defaulted to zero decimals.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { splitEqually, validateCustomSplit } from "./expense-split.ts";
import { calculateMemberBalances, getMemberBalance } from "./balances.ts";
import { generateSuggestedSettlements, getRelativeBalance } from "./settlements.ts";
import { calculateMonthlySpending, calculateMyMonthlySpending } from "./monthly-spending.ts";
import { formatPaise } from "../format.ts";
import type { Expense, Settlement } from "@/types";

const RUPEE = 100;
/** Intl emits a narrow no-break space in some locales; normalise for comparison. */
const norm = (s: string) => s.replace(/ | /g, " ");

function expense(overrides: Partial<Expense> & { amountPaise: number; splits: Expense["splits"] }): Expense {
  return {
    id: overrides.id ?? "e1",
    flatId: "f1",
    title: overrides.title ?? "Test",
    category: "other",
    amountPaise: overrides.amountPaise,
    date: overrides.date ?? new Date().toISOString(),
    paidByFlatMemberId: overrides.paidByFlatMemberId ?? "A",
    splitType: overrides.splitType ?? "equal",
    splits: overrides.splits,
    createdAt: new Date().toISOString(),
  } as Expense;
}

// ---------------------------------------------------------------------------
// Equal splits -- the exact amounts from the bug report
// ---------------------------------------------------------------------------
test("Rs 499 split 2 ways is 249.50 each and reconciles exactly", () => {
  const splits = splitEqually(499 * RUPEE, ["A", "B"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [24950, 24950]
  );
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 499 * RUPEE);
  assert.equal(norm(formatPaise(splits[0].shareAmountPaise)), "₹249.50");
});

test("Rs 87 split 2 ways is 43.50 each and reconciles exactly", () => {
  const splits = splitEqually(87 * RUPEE, ["A", "B"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [4350, 4350]
  );
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 87 * RUPEE);
  assert.equal(norm(formatPaise(splits[0].shareAmountPaise)), "₹43.50");
});

test("Rs 370 split 2 ways is 185.00 each", () => {
  const splits = splitEqually(370 * RUPEE, ["A", "B"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [18500, 18500]
  );
  assert.equal(norm(formatPaise(splits[0].shareAmountPaise)), "₹185.00");
});

test("Rs 1 split 2 ways is 0.50 each -- never rounded to a whole rupee", () => {
  const splits = splitEqually(1 * RUPEE, ["A", "B"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [50, 50]
  );
  assert.equal(norm(formatPaise(50)), "₹0.50");
});

test("Rs 100 split 3 ways allocates the odd paisa deterministically: 33.34 + 33.33 + 33.33", () => {
  const splits = splitEqually(100 * RUPEE, ["A", "B", "C"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [3334, 3333, 3333]
  );
  // The exact requirement: floor(totalPaise / n) to everyone, remainder
  // distributed one paisa at a time -- SUM must equal the original amount
  // to the paisa. 3334 + 3333 + 3333 = 10000, i.e. Rs 100.00 exactly (NOT
  // 3333 x 3 = 9999, which would silently lose one paisa).
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 100 * RUPEE);
  assert.deepEqual(splits.map((s) => norm(formatPaise(s.shareAmountPaise))), [
    "₹33.34",
    "₹33.33",
    "₹33.33",
  ]);
});

test("Rs 10 split 3 ways: 3.34 + 3.33 + 3.33, summing to exactly Rs 10.00", () => {
  const splits = splitEqually(10 * RUPEE, ["A", "B", "C"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [334, 333, 333]
  );
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 10 * RUPEE);
  assert.deepEqual(splits.map((s) => norm(formatPaise(s.shareAmountPaise))), [
    "₹3.34",
    "₹3.33",
    "₹3.33",
  ]);
});

test("Rs 1 split 3 ways: 0.34 + 0.33 + 0.33, summing to exactly Rs 1.00", () => {
  const splits = splitEqually(1 * RUPEE, ["A", "B", "C"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [34, 33, 33]
  );
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 1 * RUPEE);
  assert.deepEqual(splits.map((s) => norm(formatPaise(s.shareAmountPaise))), [
    "₹0.34",
    "₹0.33",
    "₹0.33",
  ]);
});

test("Rs 499 split 3 ways: 166.34 + 166.33 + 166.33, summing to exactly Rs 499.00", () => {
  const splits = splitEqually(499 * RUPEE, ["A", "B", "C"]);
  assert.deepEqual(
    splits.map((s) => s.shareAmountPaise),
    [16634, 16633, 16633]
  );
  assert.equal(splits.reduce((n, s) => n + s.shareAmountPaise, 0), 499 * RUPEE);
  assert.deepEqual(splits.map((s) => norm(formatPaise(s.shareAmountPaise))), [
    "₹166.34",
    "₹166.33",
    "₹166.33",
  ]);
});

test("every equal split from 1 to 100000 paise across 1-7 people reconciles exactly", () => {
  for (let amount = 1; amount <= 100000; amount += 7) {
    for (let people = 1; people <= 7; people++) {
      const ids = Array.from({ length: people }, (_, i) => `m${i}`);
      const total = splitEqually(amount, ids).reduce((n, s) => n + s.shareAmountPaise, 0);
      assert.equal(total, amount, `${amount}p across ${people}`);
    }
  }
});

test("equal split shares never differ by more than one paisa", () => {
  for (let people = 2; people <= 9; people++) {
    const ids = Array.from({ length: people }, (_, i) => `m${i}`);
    for (let amount = 1; amount <= 2000; amount++) {
      const shares = splitEqually(amount, ids).map((s) => s.shareAmountPaise);
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1, `${amount}p across ${people}`);
    }
  }
});

test("zero participants yields no splits rather than dividing by zero", () => {
  assert.deepEqual(splitEqually(49900, []), []);
});

// ---------------------------------------------------------------------------
// Custom splits
// ---------------------------------------------------------------------------
test("custom split is valid only when it reconciles to the paisa", () => {
  assert.equal(validateCustomSplit(49900, [{ shareAmountPaise: 24950 }, { shareAmountPaise: 24950 }]).isValid, true);
  // A whole-rupee "rounded" split of Rs 499 is 501 -- must be rejected.
  assert.equal(validateCustomSplit(49900, [{ shareAmountPaise: 25000 }, { shareAmountPaise: 25000 }]).isValid, false);
  assert.equal(validateCustomSplit(49900, [{ shareAmountPaise: 24950 }, { shareAmountPaise: 24949 }]).isValid, false);
  assert.equal(validateCustomSplit(49900, [{ shareAmountPaise: -1 }, { shareAmountPaise: 49901 }]).isValid, false);
});

test("custom split reports the exact remaining paise", () => {
  const v = validateCustomSplit(49900, [{ shareAmountPaise: 24950 }, { shareAmountPaise: 24900 }]);
  assert.equal(v.assignedPaise, 49850);
  assert.equal(v.remainingPaise, 50);
});

// ---------------------------------------------------------------------------
// Balances: "you owe" / "you are owed" must use exact shares
// ---------------------------------------------------------------------------
test("Rs 499 paid by A, split with B: A is owed exactly 249.50, not 250", () => {
  const splits = splitEqually(49900, ["A", "B"]);
  const balances = calculateMemberBalances(
    [{ id: "A" }, { id: "B" }],
    [expense({ amountPaise: 49900, paidByFlatMemberId: "A", splits })],
    []
  );
  const a = getMemberBalance(balances, "A");
  const b = getMemberBalance(balances, "B");

  assert.equal(a.totalPaidPaise, 49900);
  assert.equal(a.totalOwedPaise, 24950);
  assert.equal(a.netBalancePaise, 24950); // owed Rs 249.50
  assert.equal(b.netBalancePaise, -24950); // owes Rs 249.50
  assert.equal(norm(formatPaise(a.netBalancePaise)), "₹249.50");
  // Balances across a flat must always net to zero.
  assert.equal(a.netBalancePaise + b.netBalancePaise, 0);
});

test("balances net to zero for an odd 3-way split", () => {
  const splits = splitEqually(10000, ["A", "B", "C"]);
  const balances = calculateMemberBalances(
    [{ id: "A" }, { id: "B" }, { id: "C" }],
    [expense({ amountPaise: 10000, paidByFlatMemberId: "A", splits })],
    []
  );
  assert.equal(balances.reduce((n, b) => n + b.netBalancePaise, 0), 0);
  assert.equal(getMemberBalance(balances, "A").netBalancePaise, 10000 - 3334);
});

test("a settlement moves the exact paise, leaving no residue", () => {
  const splits = splitEqually(49900, ["A", "B"]);
  const settlement: Settlement = {
    id: "s1",
    flatId: "f1",
    fromFlatMemberId: "B",
    toFlatMemberId: "A",
    amountPaise: 24950,
    method: "upi",
    date: new Date().toISOString(),
  };
  const balances = calculateMemberBalances(
    [{ id: "A" }, { id: "B" }],
    [expense({ amountPaise: 49900, paidByFlatMemberId: "A", splits })],
    [settlement]
  );
  assert.equal(getMemberBalance(balances, "A").netBalancePaise, 0);
  assert.equal(getMemberBalance(balances, "B").netBalancePaise, 0);
});

// ---------------------------------------------------------------------------
// Suggested settlements
// ---------------------------------------------------------------------------
test("suggested settlement carries the exact fractional amount", () => {
  const splits = splitEqually(49900, ["A", "B"]);
  const balances = calculateMemberBalances(
    [{ id: "A" }, { id: "B" }],
    [expense({ amountPaise: 49900, paidByFlatMemberId: "A", splits })],
    []
  );
  const suggestions = generateSuggestedSettlements(balances);
  assert.equal(suggestions.length, 1);
  assert.deepEqual(suggestions[0], { fromFlatMemberId: "B", toFlatMemberId: "A", amountPaise: 24950 });
  assert.equal(getRelativeBalance(suggestions, "A", "B"), 24950);
  assert.equal(getRelativeBalance(suggestions, "B", "A"), -24950);
});

test("suggested settlements always move exactly the total debt", () => {
  const splits = splitEqually(10000, ["A", "B", "C"]);
  const balances = calculateMemberBalances(
    [{ id: "A" }, { id: "B" }, { id: "C" }],
    [expense({ amountPaise: 10000, paidByFlatMemberId: "A", splits })],
    []
  );
  const moved = generateSuggestedSettlements(balances).reduce((n, s) => n + s.amountPaise, 0);
  const owed = balances.reduce((n, b) => n + Math.max(0, b.netBalancePaise), 0);
  assert.equal(moved, owed);
});

// ---------------------------------------------------------------------------
// Monthly spending
// ---------------------------------------------------------------------------
test("monthly totals sum exact paise, personal total uses the member's own share", () => {
  const now = new Date().toISOString();
  const expenses = [
    expense({ id: "e1", amountPaise: 49900, paidByFlatMemberId: "A", date: now, splits: splitEqually(49900, ["A", "B"]) }),
    expense({ id: "e2", amountPaise: 8700, paidByFlatMemberId: "B", date: now, splits: splitEqually(8700, ["A", "B"]) }),
  ];
  assert.equal(calculateMonthlySpending(expenses), 58600); // Rs 586.00
  assert.equal(calculateMyMonthlySpending(expenses, "A"), 24950 + 4350); // Rs 293.00
  assert.equal(norm(formatPaise(calculateMyMonthlySpending(expenses, "A"))), "₹293.00");
});

// ---------------------------------------------------------------------------
// Formatting -- two decimals always, integer arithmetic only
// ---------------------------------------------------------------------------
test("formatPaise always renders exactly two decimals", () => {
  assert.equal(norm(formatPaise(0)), "₹0.00");
  assert.equal(norm(formatPaise(5)), "₹0.05");
  assert.equal(norm(formatPaise(50)), "₹0.50");
  assert.equal(norm(formatPaise(100)), "₹1.00");
  assert.equal(norm(formatPaise(4350)), "₹43.50");
  assert.equal(norm(formatPaise(24950)), "₹249.50");
  assert.equal(norm(formatPaise(18500)), "₹185.00");
  assert.equal(norm(formatPaise(-24950)), "-₹249.50");
});

test("formatPaise uses en-IN lakh grouping and never loses a paisa", () => {
  assert.equal(norm(formatPaise(10000000)), "₹1,00,000.00");
  assert.equal(norm(formatPaise(10000001)), "₹1,00,000.01");
  assert.equal(norm(formatPaise(123456789)), "₹12,34,567.89");
});

test("formatPaise round-trips every paisa value 0-9999 without drift", () => {
  for (let p = 0; p <= 9999; p++) {
    const text = norm(formatPaise(p));
    const digits = text.replace(/[^\d.]/g, "");
    assert.equal(Math.round(parseFloat(digits) * 100), p, `paise ${p} -> ${text}`);
  }
});
