import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

const PUBLIC_PATHS = ["/login", "/signup"];
// /auth/callback is exempt from BOTH redirect directions below, not just
// "no session -> /login": it's the request that *establishes* a session
// (email confirmation, password recovery, OAuth code exchange), and it
// issues its own redirect once done. Routing it through either check first
// -- with or without a session already present -- would break the exchange.
const AUTH_CALLBACK_PREFIX = "/auth/";

/**
 * Refreshes the Supabase auth session on every request, keeps request and
 * response cookies in sync, and redirects based on auth state:
 *   - No session + protected route -> /login
 *   - Session + /login or /signup -> /
 * Everything else (onboarding vs. has-a-flat) is decided client-side in
 * src/components/providers/flat-provider.tsx, since that requires a
 * flat_members lookup, not just "is there a session".
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

  // Also refreshes an expired access token via the refresh token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith(AUTH_CALLBACK_PREFIX)) {
    return supabaseResponse;
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  if (user && isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  return supabaseResponse;
}
