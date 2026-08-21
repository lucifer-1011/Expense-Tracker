"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryPill } from "@/components/shared/category-pill";
import { EXPENSE_CATEGORIES } from "@/lib/mock/categories";
import type { ExpenseCategory } from "@/types";

export function PurposeStep({
  title,
  category,
  onSelectCategory,
  onTitleChange,
  onContinue,
}: {
  title: string;
  category: ExpenseCategory;
  onSelectCategory: (category: ExpenseCategory) => void;
  onTitleChange: (value: string) => void;
  onContinue: () => void;
}) {
  const canContinue = title.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-8 overflow-y-auto px-5 pt-2 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">What was this for?</h1>

        <div className="flex flex-wrap gap-2">
          {EXPENSE_CATEGORIES.map((c) => (
            <CategoryPill
              key={c.value}
              category={c}
              selected={c.value === category}
              onClick={() => onSelectCategory(c.value)}
            />
          ))}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="purpose-title" className="text-sm font-medium text-muted-foreground">
            Expense name
          </label>
          <Input
            id="purpose-title"
            autoFocus
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Big Bazaar run"
            className="h-12 rounded-xl text-base"
          />
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
