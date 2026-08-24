"use client";

import { useMemo } from "react";

import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";
import { getMemberBalance } from "@/lib/calculations/balances";
import { calculateMonthlySpending } from "@/lib/calculations/monthly-spending";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FlatMember } from "@/types";

interface BreakdownRow {
  member: FlatMember;
  amountPaise: number;
}

const MAX_VISIBLE_ROWS = 3;

/**
 * Replaces the old "Your balance / You paid / Your share" hero, which made a
 * first-time user reconcile three numbers to understand their situation.
 * Shows three independent, already-plain-language facts instead: how much
 * the whole flat spent this month, how much the signed-in member owes, and
 * how much they're owed -- each sourced directly from the same
 * ExpensesProvider/SettlementsProvider data (and the same balances/suggested-
 * settlements calculations) the rest of the app already uses, so there's no
 * second, divergent notion of "balance" anywhere.
 */
export function DashboardSummary() {
  const { flat, membership, members } = useCurrentFlat();
  const { expenses } = useExpenses();
  const { balances, suggestedSettlements } = useSettlements();

  const monthlySpendingPaise = useMemo(() => calculateMonthlySpending(expenses), [expenses]);
  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long" });

  const currentMemberId = membership?.id ?? "";
  const balance = getMemberBalance(balances, currentMemberId);
  const youOwePaise = Math.max(0, -balance.netBalancePaise);
  const youAreOwedPaise = Math.max(0, balance.netBalancePaise);

  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);

  const oweBreakdown: BreakdownRow[] = suggestedSettlements
    .filter((s) => s.fromFlatMemberId === currentMemberId)
    .map((s) => ({ member: getMember(s.toFlatMemberId), amountPaise: s.amountPaise }))
    .filter((row): row is BreakdownRow => Boolean(row.member));

  const owedBreakdown: BreakdownRow[] = suggestedSettlements
    .filter((s) => s.toFlatMemberId === currentMemberId)
    .map((s) => ({ member: getMember(s.fromFlatMemberId), amountPaise: s.amountPaise }))
    .filter((row): row is BreakdownRow => Boolean(row.member));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {currentMonthName} flat spending
        </p>
        <p className="mt-2 text-5xl font-extrabold tracking-tight tabular-nums text-foreground">
          {formatPaise(monthlySpendingPaise)}
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {monthlySpendingPaise === 0
            ? "No expenses added this month"
            : `Total spent by everyone in ${flat?.name ?? "your flat"}`}
        </p>
      </div>

      <div className="grid grid-cols-2 divide-x divide-border border-t border-border pt-5">
        <SummaryColumn
          label="You owe"
          amountPaise={youOwePaise}
          tone="negative"
          emptyText="You're all settled up"
          breakdown={oweBreakdown}
          className="pr-4"
        />
        <SummaryColumn
          label="You are owed"
          amountPaise={youAreOwedPaise}
          tone="positive"
          emptyText="No one owes you money"
          breakdown={owedBreakdown}
          className="pl-4"
        />
      </div>
    </div>
  );
}

function SummaryColumn({
  label,
  amountPaise,
  tone,
  emptyText,
  breakdown,
  className,
}: {
  label: string;
  amountPaise: number;
  tone: "negative" | "positive";
  emptyText: string;
  breakdown: BreakdownRow[];
  className?: string;
}) {
  const visible = breakdown.slice(0, MAX_VISIBLE_ROWS);
  const extraCount = breakdown.length - visible.length;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-extrabold tracking-tight tabular-nums",
          amountPaise > 0
            ? tone === "negative"
              ? "text-negative-muted-foreground"
              : "text-positive-muted-foreground"
            : "text-foreground"
        )}
      >
        {formatPaise(amountPaise)}
      </p>

      {breakdown.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="mt-1.5 space-y-0.5">
          {visible.map(({ member, amountPaise: rowAmountPaise }) => (
            <p key={member.id} className="truncate text-xs text-muted-foreground">
              {member.name} <span className="font-medium text-foreground">{formatPaise(rowAmountPaise)}</span>
            </p>
          ))}
          {extraCount > 0 && <p className="text-xs text-muted-foreground">+{extraCount} more</p>}
        </div>
      )}
    </div>
  );
}
