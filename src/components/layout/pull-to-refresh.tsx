"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";

import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useNotifications } from "@/hooks/use-notifications";
import { useSettlements } from "@/hooks/use-settlements";
import { getFreshSession } from "@/lib/supabase/session";
import { cn } from "@/lib/utils";

const MAX_PULL_PX = 80;
const REFRESH_THRESHOLD_PX = 64;
const DAMPING = 0.5;

/**
 * A native-feeling pull-to-refresh, scoped to the app's one real scroll
 * container: the document itself (AppShell has no nested `overflow` region,
 * confirmed by inspection -- MobileHeader/BottomNav are sticky/fixed against
 * the viewport, not a scrolling ancestor). Wraps the scrollable content
 * inside <main>, below the sticky header, so the gesture and indicator never
 * touch the fixed chrome.
 *
 * Only ever arms when a touch starts at true scroll-top, and only engages
 * (and preventDefault()s) once the movement is clearly a downward pull
 * rather than a horizontal swipe (e.g. Activity's category chips) or normal
 * scrolling -- so it can never hijack either. preventDefault() during the
 * pull also takes over from the browser's own native pull-to-refresh (which
 * would otherwise trigger a full page reload), letting this drive a
 * data-only refresh instead.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const eligibleRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const { refresh: refreshFlat } = useCurrentFlat();
  const { refresh: refreshExpenses } = useExpenses();
  const { refresh: refreshSettlements } = useSettlements();
  const { refresh: refreshNotifications } = useNotifications();
  const refreshersRef = useRef({ refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications });
  useEffect(() => {
    refreshersRef.current = { refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function setDistance(value: number) {
      pullDistanceRef.current = value;
      setPullDistance(value);
    }

    function scrollTop() {
      return document.scrollingElement?.scrollTop ?? window.scrollY;
    }

    function handleTouchStart(e: TouchEvent) {
      if (isRefreshingRef.current || scrollTop() > 0) {
        eligibleRef.current = false;
        return;
      }
      eligibleRef.current = true;
      const touch = e.touches[0]!;
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }

    function handleTouchMove(e: TouchEvent) {
      if (!eligibleRef.current || !touchStartRef.current || isRefreshingRef.current) return;

      const touch = e.touches[0]!;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const deltaX = touch.clientX - touchStartRef.current.x;

      if (scrollTop() > 0 || deltaY <= 0 || Math.abs(deltaX) > Math.abs(deltaY)) {
        // Normal scrolling, or a horizontal swipe -- leave it to the browser.
        eligibleRef.current = false;
        setIsDragging(false);
        setDistance(0);
        return;
      }

      setIsDragging(true);
      e.preventDefault();
      setDistance(Math.min(MAX_PULL_PX, deltaY * DAMPING));
    }

    async function handleTouchEnd() {
      if (!eligibleRef.current) return;
      eligibleRef.current = false;
      touchStartRef.current = null;
      setIsDragging(false);

      if (pullDistanceRef.current >= REFRESH_THRESHOLD_PX) {
        isRefreshingRef.current = true;
        setIsRefreshing(true);
        setDistance(REFRESH_THRESHOLD_PX);

        try {
          // Same reasoning as AppRevalidator: let a resume-time (or just
          // in-flight) token refresh settle before firing the actual
          // queries, rather than racing it.
          const session = await getFreshSession();
          if (session) {
            const { refreshFlat, refreshExpenses, refreshSettlements, refreshNotifications } = refreshersRef.current;
            await Promise.all([refreshFlat(), refreshExpenses(), refreshSettlements(), refreshNotifications()]);
          }
        } finally {
          isRefreshingRef.current = false;
          setIsRefreshing(false);
          setDistance(0);
        }
      } else {
        setDistance(0);
      }
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, []);

  const progress = Math.min(pullDistance / REFRESH_THRESHOLD_PX, 1);
  const showIndicator = pullDistance > 0 || isRefreshing;

  return (
    <div ref={containerRef} className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden"
        style={{ height: pullDistance }}
      >
        <div className="flex h-10 w-10 items-end justify-center pb-2" style={{ opacity: showIndicator ? 1 : 0 }}>
          <RefreshCw
            className={cn("h-4 w-4 text-muted-foreground", isRefreshing && "animate-spin")}
            style={isRefreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
          />
        </div>
      </div>
      <div
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition: isDragging ? "none" : "transform 200ms ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
