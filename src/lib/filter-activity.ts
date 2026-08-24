import type { ExpenseCategory } from "@/types";
import type { ActivityItem } from "./build-activity-feed";

export type MonthFilter = "all" | "this_month" | "last_month";

export interface ActivityFiltersState {
  search: string;
  category: ExpenseCategory | "all";
  month: MonthFilter;
}

export const DEFAULT_ACTIVITY_FILTERS: ActivityFiltersState = {
  search: "",
  category: "all",
  month: "all",
};

export function isWithinMonth(iso: string, month: MonthFilter): boolean {
  if (month === "all") return true;

  const date = new Date(iso);
  const now = new Date();

  if (month === "this_month") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return date.getFullYear() === lastMonth.getFullYear() && date.getMonth() === lastMonth.getMonth();
}

export function filterActivity(items: ActivityItem[], filters: ActivityFiltersState): ActivityItem[] {
  const query = filters.search.trim().toLowerCase();

  return items.filter((item) => {
    if (!isWithinMonth(item.date, filters.month)) return false;

    if (item.kind === "settlement") {
      // Settlements aren't categorized or titled -- hide them once a category or search filter is active.
      return filters.category === "all" && query.length === 0;
    }

    const matchesCategory = filters.category === "all" || item.expense.category === filters.category;
    const matchesSearch = query.length === 0 || item.expense.title.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
}
