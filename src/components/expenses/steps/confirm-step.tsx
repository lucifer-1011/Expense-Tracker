import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/shared/category-icon";
import { formatPaise } from "@/lib/format";
import { getCategoryMeta } from "@/lib/mock/categories";
import type { ExpenseCategory, FlatMember } from "@/types";

export function ConfirmStep({
  title,
  category,
  amountPaise,
  payer,
  participants,
  eachSharePaise,
  isCustomSplit,
  customValues,
  isEditing,
  isSubmitting,
  onConfirm,
}: {
  title: string;
  category: ExpenseCategory;
  amountPaise: number;
  payer: FlatMember;
  participants: FlatMember[];
  eachSharePaise: number;
  isCustomSplit: boolean;
  customValues: Record<string, string>;
  isEditing: boolean;
  isSubmitting: boolean;
  onConfirm: () => void;
}) {
  const categoryMeta = getCategoryMeta(category);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-8 overflow-y-auto px-5 pt-4 pb-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CategoryIcon category={category} size="lg" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {categoryMeta.label}
            </p>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
          </div>
          <p className="text-4xl font-extrabold tracking-tight tabular-nums text-foreground">
            {formatPaise(amountPaise)}
          </p>
        </div>

        <div className="divide-y divide-border rounded-xl border border-border">
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Paid by</span>
            <span className="font-medium text-foreground">{payer.name}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Split between</span>
            <span className="font-medium text-foreground">
              {participants.length} {participants.length === 1 ? "person" : "people"}
            </span>
          </div>
          {!isCustomSplit
            ? (
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Each pays</span>
                  <span className="font-medium text-foreground">{formatPaise(eachSharePaise)}</span>
                </div>
              )
            : participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="font-medium text-foreground">
                    {formatPaise(Math.round((parseFloat(customValues[p.id] || "0") || 0) * 100))}
                  </span>
                </div>
              ))}
        </div>
      </div>

      <div className="border-t border-border px-5 py-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isEditing ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </div>
  );
}
