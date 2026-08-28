import { isWithinMonth } from "@/lib/filter-activity";
import type { Expense } from "@/types";

/**
 * Total combined spending of the whole flat for the current calendar month
 * -- not any one member's personal spending. Reuses the same month-boundary
 * logic as the Activity page's "This month" filter, so the two stay
 * consistent with each other.
 */
export function calculateMonthlySpending(expenses: Expense[]): number {
  return expenses
    .filter((e) => isWithinMonth(e.date, "this_month"))
    .reduce((sum, e) => sum + e.amountPaise, 0);
}

/**
 * One member's own spending for the current calendar month: the sum of
 * their split share across this month's expenses, regardless of who
 * actually paid each one -- their real financial contribution/consumption,
 * not the cash they happened to front.
 *
 * This is deliberately NOT "amount paid + amount owed" summed separately --
 * on any expense where this member is both payer and participant, that
 * would double-count the same expense. A member's share on a given expense
 * already fully represents their stake in it whether they paid it (and are
 * owed the rest back) or someone else did (and they owe their share), so
 * summing shares alone is the correct, non-double-counting figure. This
 * mirrors calculateMemberBalances' all-time totalOwedPaise, just scoped to
 * one month for one member. Settlements are intentionally excluded: paying
 * off a debt doesn't create new spending, it just closes out spending an
 * expense already accounted for.
 */
export function calculateMyMonthlySpending(expenses: Expense[], flatMemberId: string): number {
  return expenses
    .filter((e) => isWithinMonth(e.date, "this_month"))
    .reduce((sum, e) => {
      const share = e.splits.find((s) => s.flatMemberId === flatMemberId);
      return sum + (share?.shareAmountPaise ?? 0);
    }, 0);
}
