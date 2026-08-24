"use client";

import { useMemo, useState } from "react";
import { Receipt, SearchX } from "lucide-react";

import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityRow } from "@/components/activity/activity-row";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";
import { buildActivityFeed, groupByMonth } from "@/lib/build-activity-feed";
import { DEFAULT_ACTIVITY_FILTERS, filterActivity } from "@/lib/filter-activity";

export default function ActivityPage() {
  const {
    expenses,
    isLoading: expensesLoading,
    error: expensesError,
    refresh: refreshExpenses,
  } = useExpenses();
  const {
    settlements,
    isLoading: settlementsLoading,
    error: settlementsError,
    refresh: refreshSettlements,
  } = useSettlements();
  const { members, membership } = useCurrentFlat();
  const [filters, setFilters] = useState(DEFAULT_ACTIVITY_FILTERS);

  const isLoading = expensesLoading || settlementsLoading;
  const error = expensesError ?? settlementsError;
  const refresh = () => Promise.all([refreshExpenses(), refreshSettlements()]);

  const getMember = useMemo(
    () => (flatMemberId: string) => members.find((m) => m.id === flatMemberId),
    [members]
  );

  const feed = useMemo(() => buildActivityFeed(expenses, settlements), [expenses, settlements]);
  const filtered = useMemo(() => filterActivity(feed, filters), [feed, filters]);
  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const hasAnyActivity = feed.length > 0;

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity</h1>

      <ActivityFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState
          title="Couldn't load activity"
          description={error}
          onRetry={refresh}
        />
      ) : groups.length === 0 ? (
        hasAnyActivity ? (
          <EmptyState
            icon={SearchX}
            title="No matching activity"
            description="Try adjusting your search or filters."
          />
        ) : (
          <EmptyState icon={Receipt} title="No activity yet" description="Add your first expense to see it here." />
        )
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              <div className="mt-1 divide-y divide-border">
                {group.items.map((item) => (
                  <ActivityRow
                    key={item.kind === "expense" ? item.expense.id : item.settlement.id}
                    item={item}
                    getMember={getMember}
                    currentMemberId={membership?.id}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
