"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Session, User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { getFreshSession } from "@/lib/supabase/session";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  /** True only until the initial session check resolves. */
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Set right before our own signOut() below calls supabase.auth.signOut(),
  // so the SIGNED_OUT event that call produces doesn't also trigger the
  // "session expired" toast + redirect a second time.
  const expectingSignOutRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    getFreshSession().then((initialSession) => {
      setSession(initialSession);
      setIsLoading(false);
    });

    // Keeps state in sync across sign-in, sign-out, token refresh, and other
    // tabs -- src/proxy.ts handles the server-side redirect; this keeps the
    // client-rendered UI (e.g. Profile's sign-out button) in sync with it.
    //
    // SIGNED_OUT also fires on its own -- not just from our signOut() below --
    // when the refresh token has expired (e.g. the tab sat idle/backgrounded
    // long enough that it couldn't be silently renewed). Left unhandled, the
    // app would keep rendering whatever page was open with a session that's
    // actually gone, so every interaction from then on would just fail. Bounce
    // to /login the moment that happens, same as a fresh navigation would via
    // the server-side check in src/lib/supabase/middleware.ts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);

      if (event === "SIGNED_OUT") {
        if (expectingSignOutRef.current) {
          expectingSignOutRef.current = false;
        } else {
          toast.error("Your session expired. Please sign in again.");
          router.push("/login");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    expectingSignOutRef.current = true;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
