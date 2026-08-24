"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ExpensesProvider } from "@/components/providers/expenses-provider";
import { FlatProvider, useCurrentFlat } from "@/components/providers/flat-provider";
import { NotificationsProvider } from "@/components/providers/notifications-provider";
import { SettlementsProvider } from "@/components/providers/settlements-provider";

/**
 * Redirects to /onboarding once we know (not "while we don't yet know") that
 * the signed-in user has no active flat. Renders nothing itself and never
 * blocks its siblings -- the app shell and each page's own skeleton/error
 * state (already wired to ExpensesProvider/SettlementsProvider/etc.) are what
 * the user sees while that's being figured out. `!error` matters here: a
 * transient fetch failure must surface as a retryable error on the page, not
 * bounce the user to onboarding as if they had no flat.
 */
function OnboardingRedirect() {
  const { isLoading, flat, error } = useCurrentFlat();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !flat && !error) {
      router.replace("/onboarding");
    }
  }, [isLoading, flat, error, router]);

  return null;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FlatProvider>
      <OnboardingRedirect />
      <ExpensesProvider>
        <SettlementsProvider>
          <NotificationsProvider>
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </SettlementsProvider>
      </ExpensesProvider>
    </FlatProvider>
  );
}
