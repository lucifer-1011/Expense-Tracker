"use client";

import { DashboardSummary } from "@/components/home/dashboard-summary";
import { Greeting } from "@/components/home/greeting";
import { SettlementActions } from "@/components/home/settlement-actions";
import { ErrorState } from "@/components/shared/error-state";
import { cn } from "@/lib/utils";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";

function LoadingBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse bg-muted", className)} />;
}

export default function HomePage() {
  const { isLoading: expensesLoading, error: expensesError, refresh: refreshExpenses } = useExpenses();
  const { isLoading: settlementsLoading, error: settlementsError, refresh: refreshSettlements } = useSettlements();
  const isLoading = expensesLoading || settlementsLoading;
  const error = expensesError ?? settlementsError;
  const refresh = () => Promise.all([refreshExpenses(), refreshSettlements()]);

  return (
    <div className="-mx-4 -mt-5 pb-10 text-foreground sm:-mx-6 lg:-mx-6 lg:-mt-10">
      <div className="mx-auto max-w-[480px]">
        {isLoading ? (
          <>
            <div className="px-[22px] pt-[22px] pb-[18px]">
              <LoadingBlock className="h-[12px] w-24" />
              <LoadingBlock className="mt-2 h-[19px] w-32" />
            </div>
            <div className="h-[2px] w-full bg-border" />
            <div className="px-[22px] pt-[34px] pb-[30px]">
              <LoadingBlock className="h-[13px] w-36" />
              <LoadingBlock className="mt-[10px] h-[76px] w-52" />
              <LoadingBlock className="mt-[10px] h-[13px] w-44" />
            </div>
            <div className="h-px w-full bg-border" />
            <div className="space-y-4 px-[22px] py-[26px]">
              <LoadingBlock className="h-[22px] w-full" />
              <LoadingBlock className="h-[22px] w-full" />
            </div>
          </>
        ) : error ? (
          <>
            <Greeting />
            <div className="px-[22px]">
              <ErrorState title="Couldn't load your dashboard" description={error} onRetry={refresh} />
            </div>
          </>
        ) : (
          <>
            <Greeting />
            <div className="h-[2px] w-full bg-border" />
            <DashboardSummary />
            <div className="h-[2px] w-full bg-border" />
            <SettlementActions />
          </>
        )}
      </div>
    </div>
  );
}
