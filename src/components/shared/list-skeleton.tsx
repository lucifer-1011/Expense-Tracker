import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/5 rounded-full" />
            <Skeleton className="h-3 w-1/3 rounded-full" />
          </div>
          <Skeleton className="h-4 w-14 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
