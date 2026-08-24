"use client";

import { DashboardSummary } from "@/components/home/dashboard-summary";
import { Greeting } from "@/components/home/greeting";
import { RecentActivity } from "@/components/home/recent-activity";
import { WhoOwesWhat } from "@/components/home/who-owes-what";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";

export default function HomePage() {
  const { isLoading: expensesLoading, error: expensesError, refresh: refreshExpenses } = useExpenses();
  const { isLoading: settlementsLoading, error: settlementsError, refresh: refreshSettlements } = useSettlements();
  const isLoading = expensesLoading || settlementsLoading;
  const error = expensesError ?? settlementsError;
  const refresh = () => Promise.all([refreshExpenses(), refreshSettlements()]);

  if (isLoading) {
    return (
      <div className="space-y-10 pb-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Skeleton className="h-12 w-48 rounded-full" />
        </div>
        <ListSkeleton rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10 pb-6">
        <Greeting />
        <ErrorState title="Couldn't load your dashboard" description={error} onRetry={refresh} />
      </div>
    );
  }

  return (
    <div className="pb-6">
      <Greeting />
      {/* Spacing widens progressively -- the summary continues straight from
          the greeting, "who owes what" is a related-but-distinct topic, and
          activity is the clearest break (a history log, not a balance). */}
      <div className="mt-6">
        <DashboardSummary />
      </div>
      <div className="mt-9">
        <WhoOwesWhat />
      </div>
      <div className="mt-10">
        <RecentActivity />
      </div>
    </div>
  );
}
