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
