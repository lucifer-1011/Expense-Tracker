import type { Session } from "@supabase/supabase-js";

import { createClient } from "./client";

let inFlight: Promise<Session | null> | null = null;

/**
 * A single-flight wrapper around supabase.auth.getSession() -- which
 * transparently refreshes the session if it's expired. Anything that needs
 * "make sure the current session is settled before doing something
 * authenticated" (initial mount, visibility/online recovery, pull-to-
 * refresh) should await this instead of calling getSession() directly, so
 * concurrent callers share one in-flight check/refresh instead of each
 * racing their own -- the source of the intermittent "JWT issued at future"
 * failures on resume: provider data queries firing before a resume-time
 * token refresh had actually settled.
 */
export function getFreshSession(): Promise<Session | null> {
  if (!inFlight) {
    const supabase = createClient();
    inFlight = supabase.auth
      .getSession()
      .then(({ data }) => data.session)
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}
