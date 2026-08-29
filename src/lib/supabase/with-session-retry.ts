import { createClient } from "./client";

const RETRYABLE_AUTH_ERROR_PATTERNS = [/jwt issued at future/i, /jwt expired/i, /invalid jwt/i, /pgrst301/i];

function isRetryableAuthError(message: string | undefined | null): boolean {
  if (!message) return false;
  return RETRYABLE_AUTH_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/**
 * Runs a Supabase query; if it fails with a JWT-timing-shaped error (e.g.
 * "JWT issued at future" from a request that raced a resume-time token
 * refresh -- see src/lib/supabase/session.ts), forces one real session
 * refresh and retries the exact same query once before giving up. Any other
 * error -- or a second failure after the refresh -- passes straight through
 * unchanged; this never retries more than once and never masks a genuine
 * (non-auth) error.
 */
export async function withSessionRetry<T extends { error: { message: string } | null }>(
  run: () => PromiseLike<T>
): Promise<T> {
  const first = await run();
  if (!first.error || !isRetryableAuthError(first.error.message)) {
    return first;
  }

  const supabase = createClient();
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    // The session refresh itself genuinely failed -- surface the original
    // error as-is. If the session is truly gone, AuthProvider's own
    // SIGNED_OUT handling is what redirects to /login.
    return first;
  }

  return run();
}
