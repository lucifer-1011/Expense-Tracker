"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { SuggestedSettlementRow } from "@/components/settlements/settlement-row";
import { useAppData } from "@/hooks/use-app-data";
import type { SuggestedSettlement } from "@/types";

export function WhoOwesWhat() {
  const { suggestedSettlements, currentMember, getMember } = useAppData();
  const [active, setActive] = useState<SuggestedSettlement | null>(null);

  const mine = suggestedSettlements.filter(
    (s) => s.fromFlatMemberId === currentMember.id || s.toFlatMemberId === currentMember.id
  );

  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who owes what</p>

      {mine.length === 0 ? (
        <EmptyState icon={PartyPopper} title="Everyone's settled up" className="py-8" />
      ) : (
        <div className="mt-2 divide-y divide-border">
          {mine.map((s, i) => {
            const youAreOwed = s.toFlatMemberId === currentMember.id;
            const other = getMember(youAreOwed ? s.fromFlatMemberId : s.toFlatMemberId);
            if (!other) return null;
            return (
              <SuggestedSettlementRow
                key={`${s.fromFlatMemberId}-${s.toFlatMemberId}-${i}`}
                member={other}
                amountPaise={s.amountPaise}
                youAreOwed={youAreOwed}
                onAction={() => setActive(s)}
              />
            );
          })}
        </div>
      )}

      <SettleUpDialog suggestion={active} open={Boolean(active)} onOpenChange={(open) => !open && setActive(null)} />
    </section>
  );
}
