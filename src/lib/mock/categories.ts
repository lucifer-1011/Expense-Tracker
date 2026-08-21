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
    iconClassName: "text-emerald-600",
    chipClassName: "bg-emerald-50",
  },
  {
    value: "rent",
    label: "Rent",
    icon: Home,
    iconClassName: "text-indigo-600",
    chipClassName: "bg-indigo-50",
  },
  {
    value: "utilities",
    label: "Utilities",
    icon: Zap,
    iconClassName: "text-amber-600",
    chipClassName: "bg-amber-50",
  },
  {
    value: "internet",
    label: "Internet",
    icon: Wifi,
    iconClassName: "text-sky-600",
    chipClassName: "bg-sky-50",
  },
  {
    value: "food",
    label: "Food & Dining",
    icon: UtensilsCrossed,
    iconClassName: "text-orange-600",
    chipClassName: "bg-orange-50",
  },
  {
    value: "transport",
    label: "Transport",
    icon: Car,
    iconClassName: "text-violet-600",
    chipClassName: "bg-violet-50",
  },
  {
    value: "household",
    label: "Household",
    icon: SprayCan,
    iconClassName: "text-teal-600",
    chipClassName: "bg-teal-50",
  },
  {
    value: "entertainment",
    label: "Entertainment",
    icon: Clapperboard,
    iconClassName: "text-rose-600",
    chipClassName: "bg-rose-50",
  },
  {
    value: "other",
    label: "Other",
    icon: Receipt,
    iconClassName: "text-slate-600",
    chipClassName: "bg-slate-50",
  },
];

export function getCategoryMeta(value: ExpenseCategory): CategoryMeta {
  return (
    EXPENSE_CATEGORIES.find((c) => c.value === value) ??
    EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
  );
}
