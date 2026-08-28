"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useSettlements } from "@/hooks/use-settlements";
import { useCountUp } from "@/hooks/use-count-up";
import { getMemberBalance } from "@/lib/calculations/balances";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FlatMember, SuggestedSettlement } from "@/types";

interface CounterpartRow {
  settlement: SuggestedSettlement;
  member: FlatMember;
}

const MAX_VISIBLE = 2;

/**
 * One uniform row-card per relationship: avatar + name + status on the
 * left, amount (the main emphasis) stacked above a compact action button
 * on the right. Every card shares the same structure/padding/height, so a
 * list of them reads as one consistent grid rather than mismatched rows.
 */
function SettlementCard({
  youAreOwed,
  member,
  amountPaise,
  isPending,
  onAction,
}: {
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
        <p className="truncate text-sm font-semibold text-foreground">{member.name}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {youAreOwed ? "Owes you" : `You owe ${member.name}`}
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
 * The only actionable section on Home. A member's net balance points one
 * direction only (owing out or being owed, never both), so this always
 * renders cards for a single direction. Every color here is a theme token;
 * cards use the app's existing subtle card surface (bg-card + ring), never
 * a semantic-colored fill -- only the amount text carries direction color.
 */
export function SettlementActions() {
  const { members, membership } = useCurrentFlat();
  const { balances, suggestedSettlements, settlementRequests } = useSettlements();
  const [active, setActive] = useState<SuggestedSettlement | null>(null);

  const currentMemberId = membership?.id ?? "";
  const balance = getMemberBalance(balances, currentMemberId);
  const youAreOwed = balance.netBalancePaise > 0;

  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);
  const pending = settlementRequests.filter((r) => r.status === "pending");
  const pendingBetween = (otherId: string) =>
    pending.find(
      (r) =>
        (r.payerFlatMemberId === currentMemberId && r.receiverFlatMemberId === otherId) ||
        (r.receiverFlatMemberId === currentMemberId && r.payerFlatMemberId === otherId)
    );

  const rows: CounterpartRow[] = suggestedSettlements
    .filter((s) => (youAreOwed ? s.toFlatMemberId === currentMemberId : s.fromFlatMemberId === currentMemberId))
    .map((settlement) => ({
      settlement,
      member: getMember(youAreOwed ? settlement.fromFlatMemberId : settlement.toFlatMemberId),
    }))
    .filter((row): row is CounterpartRow => Boolean(row.member))
    .sort((a, b) => b.settlement.amountPaise - a.settlement.amountPaise);

  const visible = rows.slice(0, MAX_VISIBLE);
  const hasMore = rows.length > visible.length;

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
        {visible.map(({ settlement, member }) => (
          <SettlementCard
            key={`${settlement.fromFlatMemberId}-${settlement.toFlatMemberId}`}
            youAreOwed={youAreOwed}
            member={member}
            amountPaise={settlement.amountPaise}
            isPending={Boolean(pendingBetween(member.id))}
            onAction={() => setActive(settlement)}
          />
        ))}
      </div>

      {hasMore && (
        <Link
          href="/members"
          className="mt-4 block text-[13px] text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
        >
          View all {rows.length} balances
        </Link>
      )}

      <SettleUpDialog suggestion={active} open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)} />
    </div>
  );
}
