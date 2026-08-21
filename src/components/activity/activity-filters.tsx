"use client";

import { Search } from "lucide-react";

import { CategoryPill } from "@/components/shared/category-pill";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPENSE_CATEGORIES } from "@/lib/mock/categories";
import type { ActivityFiltersState, MonthFilter } from "@/lib/filter-activity";
import { cn } from "@/lib/utils";

const MONTH_LABELS: Record<MonthFilter, string> = {
  all: "All time",
  this_month: "This month",
  last_month: "Last month",
};

export function ActivityFilters({
  value,
  onChange,
}: {
  value: ActivityFiltersState;
  onChange: (next: ActivityFiltersState) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Search activity..."
            className="h-11 rounded-full pl-10"
          />
        </div>
        <Select
          items={MONTH_LABELS}
          value={value.month}
          onValueChange={(v) => onChange({ ...value, month: v as MonthFilter })}
        >
          <SelectTrigger className="h-11 shrink-0 rounded-full px-4">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MONTH_LABELS) as MonthFilter[]).map((key) => (
              <SelectItem key={key} value={key}>
                {MONTH_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button
          type="button"
          onClick={() => onChange({ ...value, category: "all" })}
          className={cn(
            "shrink-0 cursor-pointer rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
            value.category === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-secondary text-foreground hover:bg-accent"
          )}
        >
          All
        </button>
        {EXPENSE_CATEGORIES.map((c) => (
          <CategoryPill
            key={c.value}
            category={c}
            selected={value.category === c.value}
            onClick={() => onChange({ ...value, category: c.value })}
          />
        ))}
      </div>
    </div>
  );
}
