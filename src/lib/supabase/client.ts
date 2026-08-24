import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Supabase client for use in Client Components. Reads the two public env vars
 * only -- never the secret key, which must stay server-only.
 *
 * Memoized to a single instance: several client components (AuthProvider,
 * FlatProvider, auth forms) each call this, and constructing a fresh
 * GoTrueClient per call triggers Supabase's "Multiple GoTrueClient instances
 * detected" warning and can desync auth state between them.
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  browserClient ??= createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  return browserClient;
}
