"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { calculateMemberBalances } from "@/lib/calculations/balances";
import { generateSuggestedSettlements } from "@/lib/calculations/settlements";
import { mapSettlementRequestRow, mapSettlementRow } from "@/lib/supabase/mappers";
import type { MemberBalance, Settlement, SettlementMethod, SettlementRequest, SuggestedSettlement } from "@/types";
import { useCurrentFlat } from "./flat-provider";
import { useExpenses } from "./expenses-provider";

export interface SettlementInput {
  fromFlatMemberId: string;
  toFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
}

export interface SettlementRequestInput {
  receiverFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
}

interface SettlementsContextValue {
  /** True until the first fetch for the current flat resolves. */
  isLoading: boolean;
  /** Set when the initial fetch fails; cleared on a successful refresh. */
  error: string | null;
  settlements: Settlement[];
  /** Every settlement request (any status) the current user is a party to, newest first. */
  settlementRequests: SettlementRequest[];
  balances: MemberBalance[];
  suggestedSettlements: SuggestedSettlement[];
  /** Creditor-direct: records a settlement immediately, no approval needed -- the receiver asserting their own receipt of money requires no one else's sign-off. */
  recordSettlement: (input: SettlementInput) => Promise<Settlement>;
  /** Debtor-initiated: creates a pending request. Does NOT affect balances until the receiver approves it. */
  requestSettlement: (input: SettlementRequestInput) => Promise<SettlementRequest>;
  /** Receiver-only. Atomically finalizes the settlement and marks the request approved. */
  approveSettlementRequest: (requestId: string) => Promise<void>;
  /** Receiver-only. Leaves balances untouched; the debt stays open. */
  rejectSettlementRequest: (requestId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SettlementsContext = createContext<SettlementsContextValue | null>(null);

/**
 * Real settlements for the current flat, backed by Supabase, plus balances
 * and suggested settlements derived from them. Mounted inside FlatProvider's
 * OnboardingGate and after ExpensesProvider (src/app/(app)/layout.tsx), so
 * `flat` and real `expenses` are guaranteed available by the time this loads.
 *
 * Balances are never stored -- they're recomputed with the same
 * src/lib/calculations utilities the mock provider used, from real members +
 * expenses + settlements, every time any of those change. settlementRequests
 * is deliberately NOT an input to that calculation: a pending (or even
 * rejected) request must never move a balance, only an approved one -- which
 * shows up here as a normal row in `settlements`, inserted by the
 * approve_settlement_request() RPC.
 */
export function SettlementsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { flat, isLoading: flatLoading, members, activeMembers } = useCurrentFlat();
  const { expenses } = useExpenses();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementRequests, setSettlementRequests] = useState<SettlementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    // See ExpensesProvider's identical guard: `flat` still resolving isn't
    // the same as "no flat" -- don't conclude "nothing to settle" too early.
    if (flatLoading) return;

    if (!flat) {
      setSettlements([]);
      setSettlementRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data, error: fetchError }, { data: requestData, error: requestError }] = await Promise.all([
      supabase.from("settlements").select("*").eq("flat_id", flat.id).order("settled_at", { ascending: false }),
      supabase
        .from("settlement_requests")
        .select("*")
        .eq("flat_id", flat.id)
        .order("created_at", { ascending: false }),
    ]);

    if (fetchError || requestError) {
      setError((fetchError ?? requestError)?.message ?? "Couldn't load settlements.");
      setSettlements([]);
      setSettlementRequests([]);
      setIsLoading(false);
      return;
    }

    setSettlements((data ?? []).map(mapSettlementRow));
    setSettlementRequests((requestData ?? []).map(mapSettlementRequestRow));
    setIsLoading(false);
  }, [flat, flatLoading]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const recordSettlement = useCallback(
    async (input: SettlementInput): Promise<Settlement> => {
      if (!flat) throw new Error("No active flat.");
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from("settlements")
        .insert({
          flat_id: flat.id,
          from_member_id: input.fromFlatMemberId,
          to_member_id: input.toFlatMemberId,
          amount_paise: input.amountPaise,
          method: input.method,
          notes: input.note ?? null,
          created_by: user?.id ?? null,
        })
        .select()
        .single();

      if (insertError || !data) {
        throw new Error(insertError?.message ?? "Couldn't record the settlement.");
      }

      const settlement = mapSettlementRow(data);
      setSettlements((prev) =>
        [settlement, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      return settlement;
    },
    [flat, user]
  );

  const requestSettlement = useCallback(async (input: SettlementRequestInput): Promise<SettlementRequest> => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase
      .rpc("create_settlement_request", {
        receiver_member_id: input.receiverFlatMemberId,
        amount_paise: input.amountPaise,
        method: input.method,
        note: input.note,
      })
      .select()
      .single();

    if (rpcError || !data) {
      throw new Error(rpcError?.message ?? "Couldn't send the settlement request.");
    }

    const request = mapSettlementRequestRow(data);
    setSettlementRequests((prev) => [request, ...prev]);
    return request;
  }, []);

  const approveSettlementRequest = useCallback(async (requestId: string): Promise<void> => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase
      .rpc("approve_settlement_request", { request_id: requestId })
      .select()
      .single();

    if (rpcError || !data) {
      throw new Error(rpcError?.message ?? "Couldn't approve the settlement request.");
    }

    const settlement = mapSettlementRow(data);
    setSettlements((prev) =>
      [settlement, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    );
    setSettlementRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "approved", settlementId: settlement.id, resolvedAt: settlement.date }
          : r
      )
    );
  }, []);

  const rejectSettlementRequest = useCallback(async (requestId: string): Promise<void> => {
    const supabase = createClient();
    const { data, error: rpcError } = await supabase
      .rpc("reject_settlement_request", { request_id: requestId })
      .select()
      .single();

    if (rpcError || !data) {
      throw new Error(rpcError?.message ?? "Couldn't reject the settlement request.");
    }

    const updated = mapSettlementRequestRow(data);
    setSettlementRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
  }, []);

  const balances = useMemo(
    () => calculateMemberBalances(members, expenses, settlements),
    [members, expenses, settlements]
  );

  const suggestedSettlements = useMemo(
    () => generateSuggestedSettlements(balances.filter((b) => activeMembers.some((m) => m.id === b.flatMemberId))),
    [balances, activeMembers]
  );

  return (
    <SettlementsContext.Provider
      value={{
        isLoading,
        error,
        settlements,
        settlementRequests,
        balances,
        suggestedSettlements,
        recordSettlement,
        requestSettlement,
        approveSettlementRequest,
        rejectSettlementRequest,
        refresh: load,
      }}
    >
      {children}
    </SettlementsContext.Provider>
  );
}

export function useSettlements(): SettlementsContextValue {
  const context = useContext(SettlementsContext);
  if (!context) {
    throw new Error("useSettlements must be used within a SettlementsProvider");
  }
  return context;
}
