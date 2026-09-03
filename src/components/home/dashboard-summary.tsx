"use client";

import { useMemo } from "react";

import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";
import { useCountUp } from "@/hooks/use-count-up";
import { useHeroFontSize } from "@/hooks/use-hero-font-size";
import { getMemberBalance } from "@/lib/calculations/balances";
import { calculateMonthlySpending, calculateMyMonthlySpending } from "@/lib/calculations/monthly-spending";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * My Spending + Balance as one continuous panel with a single soft rule
 * between them. Every color here is a theme token (text-foreground,
 * text-muted-foreground, text-positive/negative-muted-foreground) so light
 * and dark mode both resolve correctly automatically -- nothing here is a
 * hardcoded hex value. The hero continuously scales its font size (see
 * useHeroFontSize) so a wide amount never overflows its column, however long
 * it gets; the count-up animates off the real (paise) target, not the
 * display string.
 */
export function DashboardSummary() {
  const { membership } = useCurrentFlat();
  const { expenses } = useExpenses();
  const { balances } = useSettlements();

  const currentMemberId = membership?.id ?? "";
  const flatMonthlySpendingPaise = useMemo(() => calculateMonthlySpending(expenses), [expenses]);
  const myMonthlySpendingPaise = useMemo(
    () => calculateMyMonthlySpending(expenses, currentMemberId),
    [expenses, currentMemberId]
  );
  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long" });

  const balance = getMemberBalance(balances, currentMemberId);
  const youOwePaise = Math.max(0, -balance.netBalancePaise);
  const youAreOwedPaise = Math.max(0, balance.netBalancePaise);

  const animatedMyPaise = useCountUp(myMonthlySpendingPaise);
  const animatedYouOwePaise = useCountUp(youOwePaise);
  const animatedYouAreOwedPaise = useCountUp(youAreOwedPaise);

  const heroRef = useHeroFontSize(formatPaise(myMonthlySpendingPaise));

  return (
    <div>
      <div className="px-[22px] pt-[34px] pb-[30px]">
        <p className="text-[13px] text-muted-foreground">My spending in {currentMonthName}</p>
        <p
          ref={heroRef}
          className="mt-[10px] font-extrabold tabular-nums text-foreground"
          style={{ fontSize: 76, lineHeight: 0.92, letterSpacing: "-0.045em" }}
        >
          {formatPaise(animatedMyPaise)}
        </p>
        <p className="mt-[10px] text-[13.5px] text-muted-foreground">
          Flat spending in {currentMonthName} ·{" "}
          <span className="font-semibold text-foreground">{formatPaise(flatMonthlySpendingPaise)}</span>
        </p>
      </div>

      <div className="h-px w-full bg-border" />

      <div className="px-[22px] py-[26px]">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14.5px] text-muted-foreground">You owe</p>
          <p
            className={cn(
              "tabular-nums",
              youOwePaise > 0
                ? "text-[30px] font-extrabold tracking-[-0.03em] text-negative-muted-foreground"
                : "text-[22px] font-semibold text-muted-foreground"
            )}
          >
            {formatPaise(animatedYouOwePaise)}
          </p>
        </div>
        <div className="mt-[16px] flex items-baseline justify-between gap-4">
          <p className="text-[14.5px] text-muted-foreground">You are owed</p>
          <p
            className={cn(
              "tabular-nums",
              youAreOwedPaise > 0
                ? "text-[30px] font-extrabold tracking-[-0.03em] text-positive-muted-foreground"
                : "text-[22px] font-semibold text-muted-foreground"
            )}
          >
            {formatPaise(animatedYouAreOwedPaise)}
          </p>
        </div>
      </div>
    </div>
  );
}
