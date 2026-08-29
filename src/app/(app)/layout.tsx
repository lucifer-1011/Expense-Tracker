"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { ExpensesProvider, useExpenses } from "@/components/providers/expenses-provider";
import { FlatProvider, useCurrentFlat } from "@/components/providers/flat-provider";
import { NotificationsProvider, useNotifications } from "@/components/providers/notifications-provider";
import { SettlementsProvider, useSettlements } from "@/components/providers/settlements-provider";
import { getFreshSession } from "@/lib/supabase/session";

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

const REVALIDATE_MIN_INTERVAL_MS = 30_000;

/**
 * Re-fetches every provider's data when the tab/window regains visibility or
 * the browser comes back online -- the scenario a Chrome app-shortcut window
 * left idle for a while hits most often, where the data on screen was fetched
 * long enough ago that it's worth treating as stale rather than trusting it
 * silently. Purely event-driven (visibilitychange/online), never a timer or
 * poll, and rate-limited to once per 30s so rapid tab-switching can't turn
 * this into a burst of Supabase requests. If the session itself has actually
 * expired, AuthProvider's own SIGNED_OUT handling (src/components/providers/
 * auth-provider.tsx) is what redirects to /login -- this only ever refreshes
 * data for a still-valid session.
 */
function AppRevalidator() {
  const { refresh: refreshFlat } = useCurrentFlat();
  const { refresh: refreshExpenses } = useExpenses();
  const { refresh: refreshSettlements } = useSettlements();
  const { refresh: refreshNotifications } = useNotifications();
  const lastRunRef = useRef(0);
  const refreshersRef = useRef({ refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications });

  useEffect(() => {
    refreshersRef.current = { refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications };
  });

  useEffect(() => {
    async function revalidate() {
      const now = Date.now();
      if (now - lastRunRef.current < REVALIDATE_MIN_INTERVAL_MS) return;
      lastRunRef.current = now;

      // Let a resume-time token refresh (the SDK's own or one already
      // in flight elsewhere) settle before firing any query -- this is
      // what a burst of parallel requests racing that refresh looked like:
      // an intermittent "JWT issued at future" from PostgREST.
      const session = await getFreshSession();
      if (!session) return;

      const { refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications } = refreshersRef.current;
      void Promise.all([refreshFlat(), refreshExpenses(), refreshSettlements(), refreshNotifications()]);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        revalidate();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", revalidate);
    };
  }, []);

  return null;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <FlatProvider>
      <OnboardingRedirect />
      <ExpensesProvider>
        <SettlementsProvider>
          <NotificationsProvider>
            <AppRevalidator />
            <AppShell>{children}</AppShell>
          </NotificationsProvider>
        </SettlementsProvider>
      </ExpensesProvider>
    </FlatProvider>
  );
}
