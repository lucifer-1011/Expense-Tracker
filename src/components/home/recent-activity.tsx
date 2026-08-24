"use client";

import Link from "next/link";
import { ArrowRight, Receipt } from "lucide-react";

import { ActivityRow } from "@/components/activity/activity-row";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettlements } from "@/hooks/use-settlements";
import { buildActivityFeed } from "@/lib/build-activity-feed";

export function RecentActivity() {
  const { members, membership } = useCurrentFlat();
  const { expenses } = useExpenses();
  const { settlements } = useSettlements();
  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);
  const feed = buildActivityFeed(expenses, settlements).slice(0, 6);

  return (
    <section>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent activity</p>
        {feed.length > 0 && (
          <Link href="/activity" className="flex items-center gap-1 text-xs font-medium text-foreground">
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {feed.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No activity yet"
          description="Add your first expense to get started."
          className="py-10"
        />
      ) : (
        <div className="mt-2 divide-y divide-border">
          {feed.map((item) => (
            <ActivityRow
              key={item.kind === "expense" ? item.expense.id : item.settlement.id}
              item={item}
              getMember={getMember}
              currentMemberId={membership?.id}
            />
          ))}
        </div>
      )}
    </section>
  );
}
