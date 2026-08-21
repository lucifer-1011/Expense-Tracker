import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "./database.types";

/**
 * Supabase client for use in Client Components. Reads the two public env vars
 * only -- never the service role key, which must stay server-only.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
