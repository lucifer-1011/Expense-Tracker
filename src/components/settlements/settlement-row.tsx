import { CheckCircle2 } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatPaise } from "@/lib/format";
import type { FlatMember, Settlement, SettlementMethod } from "@/types";

const METHOD_LABELS: Record<SettlementMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

/** "Rahul owes you ₹850 [Mark as paid]" or "You owe Aman ₹500 [Settle up]" */
export function SuggestedSettlementRow({
  member,
  amountPaise,
  youAreOwed,
  onAction,
}: {
  member: FlatMember;
  amountPaise: number;
  youAreOwed: boolean;
  onAction: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <MemberAvatar member={member} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {youAreOwed ? `${member.name} owes you` : `You owe ${member.name}`}
        </p>
        <p
          className={
            youAreOwed ? "text-sm font-semibold text-positive-muted-foreground" : "text-sm font-semibold text-owing-muted-foreground"
          }
        >
          {formatPaise(amountPaise)}
        </p>
      </div>
      <Button size="sm" className="shrink-0 cursor-pointer rounded-full" onClick={onAction}>
        {youAreOwed ? "Mark as paid" : "Settle up"}
      </Button>
    </div>
  );
}

/** "Rahul paid you -- ₹850" completed settlement, distinct from the suggested style above */
export function SettlementHistoryRow({
  settlement,
  from,
  to,
}: {
  settlement: Settlement;
  from: FlatMember;
  to: FlatMember;
}) {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-settled-muted text-settled-muted-foreground">
        <CheckCircle2 className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {from.name} <span className="text-muted-foreground">paid</span> {to.name}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {METHOD_LABELS[settlement.method]} · {formatDate(settlement.date, { withYear: true })}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
        {formatPaise(settlement.amountPaise)}
      </span>
    </div>
  );
}
