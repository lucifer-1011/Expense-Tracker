"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { calculateMemberBalances } from "@/lib/calculations/balances";
import { getExpenseSettlementItems, groupExpenseSettlementItems } from "@/lib/calculations/expense-settlements";
import { generateSuggestedSettlements } from "@/lib/calculations/settlements";
import { mapSettlementRequestRow, mapSettlementRow } from "@/lib/supabase/mappers";
import { withSessionRetry } from "@/lib/supabase/with-session-retry";
import type {
  ExpenseSettlementGroup,
  ExpenseSettlementItem,
  MemberBalance,
  Settlement,
  SettlementMethod,
  SettlementRequest,
  SuggestedSettlement,
} from "@/types";
import { useCurrentFlat } from "./flat-provider";
import { useExpenses } from "./expenses-provider";

export interface SettlementInput {
  fromFlatMemberId: string;
  toFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
  /** The specific expense this settles, if any -- omit for a general settle-up. */
  expenseId?: string;
}

export interface SettlementRequestInput {
  receiverFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
  /** The specific expense this settles, if any -- omit for a general settle-up. */
  expenseId?: string;
}

interface SettlementsContextValue {
  /** True only until the first fetch for the current flat resolves -- a
   * background refresh never flips this back to true, so it never hides
   * already-correct data behind a full-page skeleton. */
  isLoading: boolean;
  /** Set only when there's no previously-loaded data to fall back on; a
   * background refresh that fails leaves the last-known-good state in place
   * instead of replacing it with an error screen. */
  error: string | null;
  settlements: Settlement[];
  /** Every settlement request (any status) the current user is a party to, newest first. */
  settlementRequests: SettlementRequest[];
  balances: MemberBalance[];
  suggestedSettlements: SuggestedSettlement[];
  /** Still-outstanding amounts owed with the current user, one per expense -- never netted across expenses. */
  expenseSettlementItems: ExpenseSettlementItem[];
  /** expenseSettlementItems grouped by purpose (same title + counterpart + direction) for display. */
  expenseSettlementGroups: ExpenseSettlementGroup[];
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
  const { flat, isLoading: flatLoading, members, activeMembers, membership } = useCurrentFlat();
  const { expenses } = useExpenses();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [settlementRequests, setSettlementRequests] = useState<SettlementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

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

    // Only the very first load should block the UI with a skeleton -- a
    // later call (AppRevalidator on visibility/online, pull-to-refresh) is
    // refreshing data that's already correctly on screen.
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data, error: fetchError }, { data: requestData, error: requestError }] = await Promise.all([
      withSessionRetry(() =>
        supabase.from("settlements").select("*").eq("flat_id", flat.id).order("settled_at", { ascending: false })
      ),
      withSessionRetry(() =>
        supabase
          .from("settlement_requests")
          .select("*")
          .eq("flat_id", flat.id)
          .order("created_at", { ascending: false })
      ),
    ]);

    if (fetchError || requestError) {
      // A background refresh failing shouldn't blank out data that's
      // already correctly displayed -- only surface it if we have nothing.
      if (isInitialLoad) {
        setError((fetchError ?? requestError)?.message ?? "Couldn't load settlements.");
        setSettlements([]);
        setSettlementRequests([]);
      }
      setIsLoading(false);
      return;
    }

    setSettlements((data ?? []).map(mapSettlementRow));
    setSettlementRequests((requestData ?? []).map(mapSettlementRequestRow));
    hasLoadedRef.current = true;
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
          expense_id: input.expenseId ?? null,
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
        p_expense_id: input.expenseId,
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

  const expenseSettlementItems = useMemo(
    () => getExpenseSettlementItems(membership?.id ?? "", expenses, settlements, settlementRequests),
    [membership?.id, expenses, settlements, settlementRequests]
  );

  const expenseSettlementGroups = useMemo(
    () => groupExpenseSettlementItems(expenseSettlementItems),
    [expenseSettlementItems]
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
        expenseSettlementItems,
        expenseSettlementGroups,
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
