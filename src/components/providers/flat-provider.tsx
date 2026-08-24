"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { mapFlatMemberRow } from "@/lib/supabase/mappers";
import type { FlatMember } from "@/types";

export interface CurrentProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CurrentFlat {
  id: string;
  name: string;
  inviteCode: string;
}

export interface CurrentMembership {
  id: string;
  role: "owner" | "member";
}

interface FlatContextValue {
  /** True until the first fetch resolves. */
  isLoading: boolean;
  /** Set when the most recent fetch failed; cleared on a successful refresh. */
  error: string | null;
  profile: CurrentProfile | null;
  flat: CurrentFlat | null;
  membership: CurrentMembership | null;
  /** Every member of the current flat, active or former (mapped domain type, real data). */
  members: FlatMember[];
  /** `members` filtered to is_active -- the roster expenses can be split between. */
  activeMembers: FlatMember[];
  activeMemberCount: number;
  refresh: () => Promise<void>;
  /** Owner-only: deactivates another member's membership (flat_members_update_owner RLS policy). */
  markMemberInactive: (flatMemberId: string) => Promise<void>;
  /** Owner-only: renames the current flat (flats_update_owner RLS policy). */
  updateFlatName: (name: string) => Promise<void>;
}

const FlatContext = createContext<FlatContextValue | null>(null);

/**
 * Fetches the signed-in user's own profile, their (at most one, for this UI)
 * active flat membership, and the full member roster of that flat -- all
 * real data from Supabase. `flat: null` after loading means "authenticated
 * but no flat yet", which src/app/(app)/layout.tsx uses to redirect to
 * /onboarding.
 */
export function FlatProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [flat, setFlat] = useState<CurrentFlat | null>(null);
  const [membership, setMembership] = useState<CurrentMembership | null>(null);
  const [members, setMembers] = useState<FlatMember[]>([]);

  const load = useCallback(async () => {
    // AuthProvider's own initial session check hasn't resolved yet, so `user`
    // being null right now doesn't mean "signed out" -- it means "don't know
    // yet". Concluding "no flat" here would bounce a freshly-refreshed,
    // still-signed-in user through /onboarding for a frame. Wait for auth to
    // settle before drawing any conclusion.
    if (authLoading) return;

    if (!user) {
      setProfile(null);
      setFlat(null);
      setMembership(null);
      setMembers([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const [
      { data: profileRow, error: profileError },
      { data: membershipRow, error: membershipError },
    ] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase
        .from("flat_members")
        .select("id, role, flats(id, name, invite_code)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    // Leave existing profile/flat/membership/members state as-is on error --
    // OnboardingGate (src/app/(app)/layout.tsx) redirects to /onboarding
    // whenever `flat` is null, so wiping it out on a transient fetch failure
    // would incorrectly bounce an already-onboarded, still-signed-in user.
    // Consumers that care (e.g. the Members page) surface `error` themselves.
    if (profileError || membershipError) {
      setError((profileError ?? membershipError)?.message ?? "Couldn't load your flat.");
      setIsLoading(false);
      return;
    }

    setProfile(
      profileRow
        ? { id: profileRow.id, displayName: profileRow.display_name, avatarUrl: profileRow.avatar_url }
        : null
    );

    const flatRow = membershipRow?.flats ?? null;
    if (membershipRow && flatRow) {
      setMembership({ id: membershipRow.id, role: membershipRow.role as "owner" | "member" });
      setFlat({ id: flatRow.id, name: flatRow.name, inviteCode: flatRow.invite_code });

      // Every member (active or former) of this flat, joined with their
      // profile for display -- RLS (flat_members_select_same_flat) already
      // scopes this to flats the caller belongs to.
      const { data: memberRows, error: membersError } = await supabase
        .from("flat_members")
        .select("id, flat_id, user_id, role, is_active, joined_at, left_at, profiles(id, display_name, avatar_url, created_at, updated_at)")
        .eq("flat_id", flatRow.id)
        .order("joined_at", { ascending: true });

      if (membersError) {
        setError(membersError.message);
        setIsLoading(false);
        return;
      }

      const mapped = (memberRows ?? []).flatMap((row) => {
        if (!row.profiles) return [];
        const { profiles, ...memberRow } = row;
        return [mapFlatMemberRow(memberRow, profiles)];
      });
      setMembers(mapped);
    } else {
      setMembership(null);
      setFlat(null);
      setMembers([]);
    }

    setIsLoading(false);
  }, [user, authLoading]);

  const markMemberInactive = useCallback(async (flatMemberId: string) => {
    const supabase = createClient();
    const leftAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("flat_members")
      .update({ is_active: false, left_at: leftAt })
      .eq("id", flatMemberId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === flatMemberId ? { ...m, isActive: false, leftAt } : m))
    );
  }, []);

  const updateFlatName = useCallback(async (name: string) => {
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("flats")
      .update({ name })
      .eq("id", flat?.id ?? "")
      .select("id, name, invite_code")
      .single();

    if (updateError || !data) {
      throw new Error(updateError?.message ?? "Couldn't update the flat name.");
    }

    setFlat({ id: data.id, name: data.name, inviteCode: data.invite_code });
  }, [flat?.id]);

  useEffect(() => {
    // Deferred a tick so the fetch-triggering call sits outside the effect's
    // own synchronous body.
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);

  return (
    <FlatContext.Provider
      value={{
        isLoading,
        error,
        profile,
        flat,
        membership,
        members,
        activeMembers,
        activeMemberCount: activeMembers.length,
        refresh: load,
        markMemberInactive,
        updateFlatName,
      }}
    >
      {children}
    </FlatContext.Provider>
  );
}

export function useCurrentFlat(): FlatContextValue {
  const context = useContext(FlatContext);
  if (!context) {
    throw new Error("useCurrentFlat must be used within a FlatProvider");
  }
  return context;
}
