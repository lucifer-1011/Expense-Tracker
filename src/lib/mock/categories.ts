import {
  Car,
  Clapperboard,
  Home,
  Receipt,
  ShoppingCart,
  SprayCan,
  UtensilsCrossed,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/types";

export interface CategoryMeta {
  value: ExpenseCategory;
  label: string;
  icon: LucideIcon;
  iconClassName: string;
  chipClassName: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  {
    value: "groceries",
    label: "Groceries",
    icon: ShoppingCart,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
    chipClassName: "bg-emerald-50 dark:bg-emerald-500/15",
  },
  {
    value: "rent",
    label: "Rent",
    icon: Home,
    iconClassName: "text-indigo-600 dark:text-indigo-400",
    chipClassName: "bg-indigo-50 dark:bg-indigo-500/15",
  },
  {
    value: "utilities",
    label: "Utilities",
    icon: Zap,
    iconClassName: "text-amber-600 dark:text-amber-400",
    chipClassName: "bg-amber-50 dark:bg-amber-500/15",
  },
  {
    value: "internet",
    label: "Internet",
    icon: Wifi,
    iconClassName: "text-sky-600 dark:text-sky-400",
    chipClassName: "bg-sky-50 dark:bg-sky-500/15",
  },
  {
    value: "food",
    label: "Food & Dining",
    icon: UtensilsCrossed,
    iconClassName: "text-orange-600 dark:text-orange-400",
    chipClassName: "bg-orange-50 dark:bg-orange-500/15",
  },
  {
    value: "transport",
    label: "Transport",
    icon: Car,
    iconClassName: "text-violet-600 dark:text-violet-400",
    chipClassName: "bg-violet-50 dark:bg-violet-500/15",
  },
  {
    value: "household",
    label: "Household",
    icon: SprayCan,
    iconClassName: "text-teal-600 dark:text-teal-400",
    chipClassName: "bg-teal-50 dark:bg-teal-500/15",
  },
  {
    value: "entertainment",
    label: "Entertainment",
    icon: Clapperboard,
    iconClassName: "text-rose-600 dark:text-rose-400",
    chipClassName: "bg-rose-50 dark:bg-rose-500/15",
  },
  {
    value: "other",
    label: "Other",
    icon: Receipt,
    iconClassName: "text-slate-600 dark:text-slate-400",
    chipClassName: "bg-slate-50 dark:bg-slate-500/15",
  },
];

export function getCategoryMeta(value: ExpenseCategory): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
