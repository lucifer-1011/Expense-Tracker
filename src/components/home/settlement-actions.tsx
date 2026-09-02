"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useSettlements } from "@/hooks/use-settlements";
import { useCountUp } from "@/hooks/use-count-up";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExpenseSettlementGroup, FlatMember } from "@/types";

interface SettlementGroupRow {
  group: ExpenseSettlementGroup;
  member: FlatMember;
}

const MAX_VISIBLE = 2;

/**
 * One uniform row-card per purpose (a group of one or more same-purpose
 * expenses with the same counterpart): the purpose/title is the primary
 * label, the counterpart's name is secondary context, and the amount stays
 * the main visual emphasis on the right, stacked above a compact action
 * button.
 */
function SettlementCard({
  title,
  youAreOwed,
  member,
  amountPaise,
  isPending,
  onAction,
}: {
  title: string;
  youAreOwed: boolean;
  member: FlatMember;
  amountPaise: number;
  isPending: boolean;
  onAction: () => void;
}) {
  const animatedPaise = useCountUp(amountPaise);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <MemberAvatar member={member} size="md" />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {youAreOwed ? `${member.name} owes you` : `You owe ${member.name}`}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <p
          className={cn(
            "text-lg font-bold tabular-nums",
            youAreOwed ? "text-positive-muted-foreground" : "text-negative-muted-foreground"
          )}
        >
          {formatPaise(animatedPaise)}
        </p>
        {isPending ? (
          <span className="flex h-7 items-center rounded-full bg-secondary px-3 text-xs font-medium text-muted-foreground">
            Pending
          </span>
        ) : (
          <Button size="sm" className="cursor-pointer rounded-full" onClick={onAction}>
            {youAreOwed ? "Mark as paid" : "Settle up"}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * The only actionable section on Home. Unlike a net per-person balance, a
 * member can simultaneously owe on one purpose and be owed on another, so
 * this renders one card per still-outstanding purpose, in either direction
 * -- never netted together. Every color here is a theme token; cards use
 * the app's existing subtle card surface (bg-card + ring), never a
 * semantic-colored fill -- only the amount text carries direction color.
 */
export function SettlementActions() {
  const { members } = useCurrentFlat();
  const { expenseSettlementGroups } = useSettlements();
  const [active, setActive] = useState<ExpenseSettlementGroup | null>(null);
  const [expanded, setExpanded] = useState(false);

  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);

  const rows: SettlementGroupRow[] = expenseSettlementGroups
    .map((group) => ({ group, member: getMember(group.counterpartFlatMemberId) }))
    .filter((row): row is SettlementGroupRow => Boolean(row.member))
    .sort((a, b) => b.group.amountPaise - a.group.amountPaise);

  const hasMore = rows.length > MAX_VISIBLE;
  const visible = expanded ? rows : rows.slice(0, MAX_VISIBLE);

  if (rows.length === 0) {
    return (
      <div className="flex items-center gap-2 px-[22px] py-[22px]">
        <Check className="h-[17px] w-[17px] text-foreground" strokeWidth={2.5} />
        <p className="text-[14.5px] font-semibold text-foreground">You&apos;re all settled up</p>
      </div>
    );
  }

  return (
    <div className="px-[22px] py-[26px]">
      <div className="space-y-3">
        {visible.map(({ group, member }) => (
          <SettlementCard
            key={group.key}
            title={group.title}
            youAreOwed={group.youAreOwed}
            member={member}
            amountPaise={group.amountPaise}
            isPending={group.isPending}
            onAction={() => setActive(group)}
          />
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 flex cursor-pointer items-center gap-1 text-[13px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          {expanded ? "Show less" : `View all ${rows.length} balances`}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      )}

      <SettleUpDialog group={active} open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)} />
    </div>
  );
}
