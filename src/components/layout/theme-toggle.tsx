"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";

/**
 * A single light/dark switch, not a 3-way system/light/dark picker -- the
 * user's system preference is only the *initial* default (set on
 * ThemeProvider in src/app/layout.tsx); once toggled, next-themes persists
 * the explicit choice to localStorage and it wins on every future load.
 *
 * `resolvedTheme` (not `theme`) is used so a still-"system" user sees the
 * icon for what's actually rendered, not the literal string "system".
 * Rendered inert until mounted: the server can't know the client's saved
 * theme, so showing an icon before hydration would either flash-swap or
 * mismatch -- an empty same-sized button avoids both.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      className={cn(
        "flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent",
        className
      )}
    >
      {mounted && (isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />)}
    </button>
  );
}
