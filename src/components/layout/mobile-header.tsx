"use client";

import { Wallet2 } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { ThemeToggle } from "./theme-toggle";

/**
 * Mobile counterpart to TopNav (which is desktop-only, `hidden lg:block`) --
 * there was previously no persistent header at all below the `lg` breakpoint.
 * Kept intentionally minimal: just enough branding to anchor the bar, plus
 * the one thing that needed a home, the notification bell.
 */
export function MobileHeader() {
  const { flat } = useCurrentFlat();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Wallet2 className="h-3.5 w-3.5" />
        </div>
        <span className="truncate text-xs font-medium text-muted-foreground">{flat?.name}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
}
