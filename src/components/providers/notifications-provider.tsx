"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";
import { mapNotificationRow } from "@/lib/supabase/mappers";
import { withSessionRetry } from "@/lib/supabase/with-session-retry";
import type { Notification } from "@/types";
import { useCurrentFlat } from "./flat-provider";

interface NotificationsContextValue {
  /** True only until the first fetch for the current flat resolves -- a
   * background refresh never flips this back to true, so it never hides
   * already-correct data behind a full-page skeleton. */
  isLoading: boolean;
  /** Set only when there's no previously-loaded data to fall back on; a
   * background refresh that fails leaves the last-known-good state in place
   * instead of replacing it with an error screen. */
  error: string | null;
  /** Every notification addressed to the current user in this flat, newest first. */
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

/**
 * Real notifications for the current user within the current flat, backed by
 * Supabase. Queried independently from expenses/settlements/settlement
 * requests -- this list is never derived from or filtered by any of that
 * other data, only by `recipient_user_id` (RLS-enforced) and `flat_id`, so it
 * can never be accidentally emptied by an unrelated refresh.
 */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { flat, isLoading: flatLoading, profile } = useCurrentFlat();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    // See ExpensesProvider's identical guard: `flat`/`profile` still
    // resolving isn't the same as "nothing to notify about".
    if (flatLoading) return;

    if (!flat || !profile) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    // Only the very first load should block the UI with a skeleton -- a
    // later call (AppRevalidator on visibility/online, pull-to-refresh) is
    // refreshing data that's already correctly on screen.
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const { data, error: fetchError } = await withSessionRetry(() =>
      supabase
        .from("notifications")
        .select("*")
        .eq("flat_id", flat.id)
        .eq("recipient_user_id", profile.id)
        .order("created_at", { ascending: false })
    );

    if (fetchError) {
      // A background refresh failing shouldn't blank out data that's
      // already correctly displayed -- only surface it if we have nothing.
      if (isInitialLoad) {
        setError(fetchError.message);
        setNotifications([]);
      }
      setIsLoading(false);
      return;
    }

    setNotifications((data ?? []).map(mapNotificationRow));
    hasLoadedRef.current = true;
    setIsLoading(false);
  }, [flat, flatLoading, profile]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const readAt = new Date().toISOString();
    // Optimistic: this is a low-stakes, self-only mutation (column-scoped
    // grant + RLS already guarantee it can only ever affect the caller's own
    // row), so there's no need to block the UI on the round trip.
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId && !n.isRead ? { ...n, isRead: true, readAt } : n))
    );

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("id", notificationId);

    if (updateError) {
      // Roll back on failure rather than leave the UI claiming a state the
      // database doesn't actually have.
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: false, readAt: undefined } : n))
      );
      throw new Error(updateError.message);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => (n.isRead ? n : { ...n, isRead: true, readAt })));

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: readAt })
      .in("id", unreadIds);

    if (updateError) {
      setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: false, readAt: undefined } : n)));
      throw new Error(updateError.message);
    }
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  return (
    <NotificationsContext.Provider
      value={{ isLoading, error, notifications, unreadCount, markAsRead, markAllAsRead, refresh: load }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationsProvider");
  }
  return context;
}
