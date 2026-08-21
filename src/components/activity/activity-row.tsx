"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { CategoryIcon } from "@/components/shared/category-icon";
import { useAppData } from "@/hooks/use-app-data";
import { formatRelativeDate } from "@/lib/format";
import type { ActivityItem } from "@/lib/build-activity-feed";

export function ActivityRow({ item, showDate = false }: { item: ActivityItem; showDate?: boolean }) {
  const { getMember, currentMember } = useAppData();

  if (item.kind === "expense") {
    const { expense } = item;
    const payer = getMember(expense.paidByFlatMemberId);
    const paidLabel = payer?.id === currentMember.id ? "You paid" : `${payer?.name ?? "Someone"} paid`;

    return (
      <Link href={`/expenses/${expense.id}`} className="flex items-center gap-3 py-3">
        <CategoryIcon category={expense.category} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{expense.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {paidLabel}
            {showDate ? ` · ${formatRelativeDate(expense.date)}` : ""}
          </p>
        </div>
        <Amount amountPaise={expense.amountPaise} className="shrink-0 text-sm" />
      </Link>
    );
  }

  const { settlement } = item;
  const from = getMember(settlement.fromFlatMemberId);
  const to = getMember(settlement.toFlatMemberId);
  const toIsMe = to?.id === currentMember.id;
  const label = `${from?.name ?? "Someone"} paid ${toIsMe ? "you" : (to?.name ?? "someone")}`;

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-settled-muted text-settled-muted-foreground">
        <CheckCircle2 className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Settlement
          {showDate ? ` · ${formatRelativeDate(settlement.date)}` : ""}
        </p>
      </div>
      <Amount amountPaise={settlement.amountPaise} variant="muted" className="shrink-0 text-sm" />
    </div>
  );
}
