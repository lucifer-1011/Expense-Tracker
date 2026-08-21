import type { ReactNode } from "react";

import { BottomNav } from "./bottom-nav";
import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pb-28 lg:pb-16" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="mx-auto w-full max-w-2xl px-4 pt-5 sm:px-6 lg:px-6 lg:pt-10">{children}</div>
      </main>
      <BottomNav />
    </div>
  );
}
