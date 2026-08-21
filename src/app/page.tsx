"use client";

import { BalanceHero } from "@/components/home/balance-hero";
import { Greeting } from "@/components/home/greeting";
import { RecentActivity } from "@/components/home/recent-activity";
import { WhoOwesWhat } from "@/components/home/who-owes-what";
import { Skeleton } from "@/components/ui/skeleton";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { useAppData } from "@/hooks/use-app-data";

export default function HomePage() {
  const { isLoading } = useAppData();

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

  return (
    <div className="space-y-10 pb-6">
      <Greeting />
      <BalanceHero />
      <WhoOwesWhat />
      <RecentActivity />
    </div>
  );
}
