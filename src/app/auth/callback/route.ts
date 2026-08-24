import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Single landing point for every Supabase Auth redirect that needs the
 * server to actually establish a session (cookies can only be set from a
 * Server Component/Route Handler, never from the email link's own request):
 *
 * - Email confirmation / password recovery / magic link: Supabase's own
 *   hosted verify endpoint appends `token_hash` + `type` after checking the
 *   link, and we call `verifyOtp` to exchange those for a session.
 * - Google (or any future OAuth provider): the provider redirects back with
 *   a `code`, exchanged via `exchangeCodeForSession`.
 *
 * `next` lets a caller choose where to land afterward (e.g. signup sends
 * fresh confirmations straight to /onboarding); it defaults to `/`, where
 * the existing flat-provider-driven redirect already sends a flat-less user
 * on to onboarding -- so callers don't have to know that logic themselves.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?authError=link-invalid`);
}
