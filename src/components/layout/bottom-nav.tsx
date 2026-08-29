"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, Receipt, User, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { isNavItemActive } from "./nav-items";

function AddExpenseFab({ onClick, disabled }: { onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      aria-label="Add expense"
      onClick={onClick}
      disabled={disabled}
      className="-mt-6 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition active:scale-95 disabled:cursor-default"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}

// AddExpenseFlow pulls in Dialog/Drawer/Checkbox/zod validation/category data
// -- real weight that every single page was paying for in its critical
// bundle just to render this one always-visible trigger. Loading it on
// demand keeps that out of the initial JS every route ships; the fallback
// renders the identical-looking button (just inert) so the FAB never
// visibly changes, only becomes clickable a moment later.
const AddExpenseFlow = dynamic(
  () => import("@/components/expenses/add-expense-flow").then((mod) => mod.AddExpenseFlow),
  { loading: () => <AddExpenseFab disabled /> }
);

const ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/activity", label: "Activity", icon: Receipt },
  null,
  { href: "/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-1">
        {ITEMS.map((item) => {
          if (!item) {
            return (
              <div key="add-expense-fab" className="flex items-center justify-center">
                <AddExpenseFlow trigger={<AddExpenseFab />} />
              </div>
            );
          }

          const isActive = isNavItemActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
