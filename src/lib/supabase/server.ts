import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "./database.types";

/**
 * Supabase client for use in Server Components, Server Actions, and Route
 * Handlers. Must be created fresh per request (it captures the current
 * cookie jar) -- never module-level singleton this.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // `set` is called from a Server Component during render, where cookies
            // can't be written. Harmless as long as middleware.ts is refreshing the
            // session on every request (see src/middleware.ts).
          }
        },
      },
    }
  );
}
