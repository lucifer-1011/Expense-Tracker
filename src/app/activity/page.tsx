"use client";

import { useMemo, useState } from "react";
import { Receipt, SearchX } from "lucide-react";

import { ActivityFilters } from "@/components/activity/activity-filters";
import { ActivityRow } from "@/components/activity/activity-row";
import { EmptyState } from "@/components/shared/empty-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { useAppData } from "@/hooks/use-app-data";
import { buildActivityFeed, groupByDay } from "@/lib/build-activity-feed";
import { DEFAULT_ACTIVITY_FILTERS, filterActivity } from "@/lib/filter-activity";

export default function ActivityPage() {
  const { expenses, settlements, isLoading } = useAppData();
  const [filters, setFilters] = useState(DEFAULT_ACTIVITY_FILTERS);

  const feed = useMemo(() => buildActivityFeed(expenses, settlements), [expenses, settlements]);
  const filtered = useMemo(() => filterActivity(feed, filters), [feed, filters]);
  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const hasAnyActivity = feed.length > 0;

  return (
    <div className="space-y-6 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Activity</h1>

      <ActivityFilters value={filters} onChange={setFilters} />

      {isLoading ? (
        <ListSkeleton rows={6} />
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
