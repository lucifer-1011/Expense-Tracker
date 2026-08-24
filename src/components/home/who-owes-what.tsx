"use client";

import { useState } from "react";
import { Clock, PartyPopper } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { SuggestedSettlementRow } from "@/components/settlements/settlement-row";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useSettlements } from "@/hooks/use-settlements";
import type { SuggestedSettlement } from "@/types";

/**
 * Purely a balance summary -- "who owes what". Settlement request
 * approval/rejection lives in Notifications (src/app/(app)/notifications),
 * not here. This still needs to know whether a pending request already
 * exists for a pair, though: without that, a user could fire off a second,
 * duplicate "Settle up"/"Mark as paid" action while one is already pending.
 */
export function WhoOwesWhat() {
  const { members, membership } = useCurrentFlat();
  const { suggestedSettlements, settlementRequests } = useSettlements();
  const [active, setActive] = useState<SuggestedSettlement | null>(null);

  const currentMemberId = membership?.id ?? "";
  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);

  const pending = settlementRequests.filter((r) => r.status === "pending");
  const pendingBetween = (otherId: string) =>
    pending.find(
      (r) =>
        (r.payerFlatMemberId === currentMemberId && r.receiverFlatMemberId === otherId) ||
        (r.receiverFlatMemberId === currentMemberId && r.payerFlatMemberId === otherId)
    );

  const mine = suggestedSettlements.filter(
    (s) => s.fromFlatMemberId === currentMemberId || s.toFlatMemberId === currentMemberId
  );

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who owes what</p>

      {mine.length === 0 ? (
        <EmptyState icon={PartyPopper} title="Everyone's settled up" className="py-8" />
      ) : (
        <div className="mt-2 divide-y divide-border">
          {mine.map((s, i) => {
            const youAreOwed = s.toFlatMemberId === currentMemberId;
            const other = getMember(youAreOwed ? s.fromFlatMemberId : s.toFlatMemberId);
            if (!other) return null;

            const hasPendingRequest = Boolean(pendingBetween(other.id));

            return (
              <SuggestedSettlementRow
                key={`${s.fromFlatMemberId}-${s.toFlatMemberId}-${i}`}
                member={other}
                amountPaise={s.amountPaise}
                youAreOwed={youAreOwed}
                onAction={() => setActive(s)}
                action={
                  hasPendingRequest ? (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      Pending request
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

      <SettleUpDialog suggestion={active} open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)} />
    </section>
  );
}
