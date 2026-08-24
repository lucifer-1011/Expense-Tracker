"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Official four-color "G" mark -- lucide-react has no brand icons. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path
        fill="#FBBC05"
        d="M11.69 28.18A13.96 13.96 0 0 1 10.9 24c0-1.45.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}

/**
 * Shared by both /login and /signup -- Supabase treats "sign up" and "sign
 * in" with Google as the same OAuth call; whether the user ends up new or
 * returning is decided after the redirect (handle_new_user + the existing
 * flat-provider onboarding check), not by which button they clicked here.
 */
export function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleClick() {
    setIsRedirecting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // Only reached if Supabase rejected the request before ever redirecting
    // to Google (e.g. the provider isn't configured) -- a successful call
    // navigates the whole page away, so there's no success case to handle.
    if (error) {
      setIsRedirecting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-14 w-full cursor-pointer rounded-full text-base"
      onClick={handleClick}
      disabled={isRedirecting}
    >
      <GoogleIcon />
      {isRedirecting ? "Redirecting..." : "Continue with Google"}
    </Button>
  );
}
