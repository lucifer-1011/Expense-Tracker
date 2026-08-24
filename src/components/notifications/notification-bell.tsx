"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

function formatBadgeCount(count: number): string {
  return count > 9 ? "9+" : String(count);
}

export function NotificationBell({ className }: { className?: string }) {
  const { unreadCount } = useNotifications();

  return (
    <Link
      href="/notifications"
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      className={cn(
        "relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground ring-2 ring-background"
        >
          {formatBadgeCount(unreadCount)}
        </span>
      )}
    </Link>
  );
}
