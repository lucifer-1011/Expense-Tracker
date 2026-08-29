"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet2 } from "lucide-react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";

function AddExpenseTriggerButton(props: { onClick?: () => void; disabled?: boolean }) {
  return (
    <Button className="cursor-pointer rounded-full" {...props}>
      <Plus className="h-4 w-4" />
      Add Expense
    </Button>
  );
}

// AppShell renders TopNav and BottomNav unconditionally (only CSS toggles
// which is visible per breakpoint), so eagerly importing AddExpenseFlow here
// would still pull its Dialog/Drawer/validation weight into every page's
// bundle even on mobile. Loading it on demand -- same as bottom-nav.tsx --
// keeps that out of the critical path; the fallback is the same button, just
// inert until the chunk arrives.
const AddExpenseFlow = dynamic(
  () => import("@/components/expenses/add-expense-flow").then((mod) => mod.AddExpenseFlow),
  { loading: () => <AddExpenseTriggerButton disabled /> }
);

export function TopNav() {
  const pathname = usePathname();
  const { flat, profile } = useCurrentFlat();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur-sm lg:block">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Wallet2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">{flat?.name}</span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <AddExpenseFlow trigger={<AddExpenseTriggerButton />} />
          <ThemeToggle />
          <NotificationBell />
          {profile && (
            <MemberAvatar
              member={{ id: profile.id, name: profile.displayName, avatarUrl: profile.avatarUrl ?? undefined }}
              size="sm"
            />
          )}
        </div>
      </div>
    </header>
  );
}
