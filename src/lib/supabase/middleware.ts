import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

/**
 * Refreshes the Supabase auth session on every request and keeps request and
 * response cookies in sync. Called from src/proxy.ts (Next.js's proxy/
 * middleware entrypoint).
 *
 * This is session-refresh plumbing only -- foundation for a future auth
 * phase. It does not redirect unauthenticated users or protect any route yet.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touches the session so an expired access token gets refreshed via the
  // refresh token. The user is intentionally unused here -- no route
  // protection is wired up until the auth phase.
  await supabase.auth.getUser();

  return supabaseResponse;
}
