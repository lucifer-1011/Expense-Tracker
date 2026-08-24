import { Wallet2 } from "lucide-react";

/**
 * Next.js shows this automatically while this route segment is being
 * prepared -- covering the gap before any of our own client-side providers
 * have even mounted (e.g. a dev-mode on-demand compile, or the first paint
 * of a fresh navigation), so the user never sees a bare blank tab. Once the
 * page itself renders, each provider's own skeleton/error state takes over;
 * this is only the branded placeholder for the moment before that.
 */
export default function AppLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Wallet2 className="h-6 w-6 animate-pulse" />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">FlatSplit</p>
        <p className="mt-1 text-sm text-muted-foreground">Loading your flat…</p>
      </div>
    </div>
  );
}
