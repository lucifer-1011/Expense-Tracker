import type { ReactNode } from "react";

import { BottomNav } from "./bottom-nav";
import { MobileHeader } from "./mobile-header";
import { PullToRefresh } from "./pull-to-refresh";
import { TopNav } from "./top-nav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <MobileHeader />
      <main className="pb-28 lg:pb-16">
        <PullToRefresh>
          <div className="mx-auto w-full max-w-2xl px-4 pt-5 sm:px-6 lg:px-6 lg:pt-10">{children}</div>
        </PullToRefresh>
      </main>
      <BottomNav />
    </div>
  );
}
