"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Wallet2 } from "lucide-react";

import { AddExpenseFlow } from "@/components/expenses/add-expense-flow";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";
import { cn } from "@/lib/utils";
import { isNavItemActive, NAV_ITEMS } from "./nav-items";

export function TopNav() {
  const pathname = usePathname();
  const { flat, currentMember } = useAppData();

  return (
    <header className="sticky top-0 z-30 hidden border-b border-border bg-background/95 backdrop-blur-sm lg:block">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Wallet2 className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-foreground">{flat.name}</span>
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
          <AddExpenseFlow
            trigger={
              <Button className="cursor-pointer rounded-full">
                <Plus className="h-4 w-4" />
                Add Expense
              </Button>
            }
          />
          <MemberAvatar member={currentMember} size="sm" />
        </div>
      </div>
    </header>
  );
}
