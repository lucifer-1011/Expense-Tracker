import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

/**
 * SERVER-ONLY. Uses the secret key, which bypasses Row Level Security
 * entirely. Never import this from a Client Component, and never expose
 * SUPABASE_SECRET_KEY via a NEXT_PUBLIC_ variable.
 *
 * Intended for trusted server-side maintenance tasks only (e.g. an admin
 * script) -- not for handling ordinary user requests. Regular request
 * handling should always go through `src/lib/supabase/server.ts`, which
 * respects RLS as the signed-in user.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "createServiceRoleClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must both be set."
    );
  }

  return createSupabaseClient<Database>(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
