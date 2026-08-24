"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, CheckCircle2 } from "lucide-react";

import { Amount } from "@/components/shared/amount";
import { CategoryIcon } from "@/components/shared/category-icon";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/lib/build-activity-feed";
import type { FlatMember } from "@/types";

interface ActivityRowProps {
  item: ActivityItem;
  getMember: (flatMemberId: string) => FlatMember | undefined;
  currentMemberId: string | undefined;
}

export function ActivityRow({ item, getMember, currentMemberId }: ActivityRowProps) {
  if (item.kind === "expense") {
    const { expense } = item;
    const payer = getMember(expense.paidByFlatMemberId);
    const isMePaying = payer?.id === currentMemberId;
    const paidLabel = isMePaying ? "You paid" : `${payer?.name ?? "Someone"} paid`;

    return (
      <Link href={`/expenses/${expense.id}`} className="flex items-center gap-3 py-3">
        <CategoryIcon category={expense.category} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{expense.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {paidLabel} · {formatDateTime(expense.date)}
          </p>
        </div>
        {/* Colored (and arrow-marked) only when the current viewer is the one
            who actually paid -- everyone else here has an outstanding share,
            not money that moved. */}
        <div className={cn("flex shrink-0 items-center gap-0.5", isMePaying && "text-negative-muted-foreground")}>
          {isMePaying && <ArrowDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
          <Amount amountPaise={expense.amountPaise} variant={isMePaying ? "negative" : "default"} className="text-sm" />
        </div>
      </Link>
    );
  }

  const { settlement } = item;
  const from = getMember(settlement.fromFlatMemberId);
  const to = getMember(settlement.toFlatMemberId);
  const fromIsMe = from?.id === currentMemberId;
  const toIsMe = to?.id === currentMemberId;
  const label = `${from?.name ?? "Someone"} paid ${toIsMe ? "you" : (to?.name ?? "someone")}`;

  // Money direction is always relative to the signed-in viewer: red if it
  // left their pocket, green if it landed in it, neutral if they weren't a
  // party to this particular settlement at all.
  const variant = toIsMe ? "positive" : fromIsMe ? "negative" : "muted";
  const directionColorClass = toIsMe
    ? "text-positive-muted-foreground"
    : fromIsMe
      ? "text-negative-muted-foreground"
      : undefined;

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-settled-muted text-settled-muted-foreground">
        <CheckCircle2 className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          Settlement · {formatDateTime(settlement.date)}
        </p>
      </div>
      <div className={cn("flex shrink-0 items-center gap-0.5", directionColorClass)}>
        {toIsMe && <ArrowUp className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
        {fromIsMe && <ArrowDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
        <Amount amountPaise={settlement.amountPaise} variant={variant} className="text-sm" />
      </div>
    </div>
  );
}
