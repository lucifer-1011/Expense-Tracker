"use client";

import { useAppData } from "@/hooks/use-app-data";
import { getMemberBalance } from "@/lib/calculations/balances";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

export function BalanceHero() {
  const { balances, currentMember } = useAppData();
  const balance = getMemberBalance(balances, currentMember.id);
  const isSettled = balance.netBalancePaise === 0;
  const isOwed = balance.netBalancePaise > 0;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your balance</p>
      <p className="mt-2 text-5xl font-extrabold tracking-tight tabular-nums text-foreground">
        {formatPaise(Math.abs(balance.netBalancePaise))}
      </p>
      <p
        className={cn(
          "mt-1.5 text-sm font-medium",
          isSettled && "text-settled-muted-foreground",
          !isSettled && isOwed && "text-positive-muted-foreground",
          !isSettled && !isOwed && "text-owing-muted-foreground"
        )}
      >
        {isSettled ? "You're all settled up" : isOwed ? "You are owed money" : "You owe money"}
      </p>

      <div className="mt-6 divide-y divide-border border-t border-border">
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-muted-foreground">You paid</span>
          <span className="font-semibold tabular-nums text-foreground">{formatPaise(balance.totalPaidPaise)}</span>
        </div>
        <div className="flex items-center justify-between py-3 text-sm">
          <span className="text-muted-foreground">Your share</span>
          <span className="font-semibold tabular-nums text-foreground">{formatPaise(balance.totalOwedPaise)}</span>
        </div>
      </div>
    </div>
  );
}
