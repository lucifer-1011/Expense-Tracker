"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { mapExpenseRow } from "@/lib/supabase/mappers";
import { withSessionRetry } from "@/lib/supabase/with-session-retry";
import type { Database } from "@/lib/supabase/database.types";
import type { Expense, ExpenseCategory, ExpenseSplit, SplitType } from "@/types";
import { useCurrentFlat } from "./flat-provider";

export interface ExpenseInput {
  title: string;
  description?: string;
  category: ExpenseCategory;
  amountPaise: number;
  date: string;
  paidByFlatMemberId: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  /**
   * Identifies one logical "add expense" submission attempt (not one HTTP
   * request) -- the same value across a retry, a double-click that raced
   * past the disabled-button window, or a resubmit after the page refreshed
   * mid-request. Only meaningful for creating a new expense; omit when
   * editing. See src/components/expenses/add-expense-flow.tsx for how it's
   * generated and persisted.
   */
  dedupeKey?: string;
}

type ExpenseSplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];

/** Postgres unique_violation. */
const UNIQUE_VIOLATION = "23505";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];

/**
 * The pre-RPC edit path: update the expense, clear its splits, write the new
 * ones -- three separate PostgREST requests, so three separate transactions.
 * Kept ONLY so this build can be deployed before
 * 20260902000002_expense_split_integrity.sql is applied. It carries the bug
 * that migration fixes: if the final insert fails, the expense is left with
 * no splits and quietly stops counting toward anyone's balance. Remove this
 * once that migration is live everywhere.
 */
async function legacyUpdateExpense(
  supabase: ReturnType<typeof createClient>,
  expenseId: string,
  input: ExpenseInput
): Promise<ExpenseRow> {
  const { data: expenseRow, error: expenseError } = await supabase
    .from("expenses")
    .update({
      title: input.title,
      description: input.description ?? null,
      category: input.category,
      amount_paise: input.amountPaise,
      expense_date: input.date,
      split_type: input.splitType,
      paid_by: input.paidByFlatMemberId,
    })
    .eq("id", expenseId)
    .select()
    .single();

  if (expenseError || !expenseRow) {
    throw new Error(expenseError?.message ?? "Couldn't update the expense.");
  }

  const { error: deleteSplitsError } = await supabase
    .from("expense_splits")
    .delete()
    .eq("expense_id", expenseId);
  if (deleteSplitsError) throw new Error(deleteSplitsError.message);

  const { error: splitsError } = await supabase.from("expense_splits").insert(
    input.splits.map((s) => ({
      expense_id: expenseId,
      member_id: s.flatMemberId,
      share_amount_paise: s.shareAmountPaise,
    }))
  );
  if (splitsError) throw new Error(splitsError.message);

  return expenseRow;
}

interface ExpensesContextValue {
  /** True only until the first fetch for the current flat resolves -- a
   * background refresh (visibility/online recovery, pull-to-refresh) never
   * flips this back to true, so it never has to hide already-correct data
   * behind a full-page skeleton. */
  isLoading: boolean;
  /** Set only when there's no previously-loaded data to fall back on; a
   * background refresh that fails leaves the last-known-good `expenses` in
   * place instead of replacing it with an error screen. */
  error: string | null;
  expenses: Expense[];
  getExpense: (expenseId: string) => Expense | undefined;
  addExpense: (input: ExpenseInput) => Promise<Expense>;
  updateExpense: (expenseId: string, input: ExpenseInput) => Promise<Expense>;
  deleteExpense: (expenseId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

/**
 * Real expenses + expense_splits for the current flat, backed by Supabase.
 * Mounted inside src/app/(app)/layout.tsx alongside FlatProvider (not gated
 * behind it, so the app shell can render immediately) -- `flat` may still be
 * null/loading when this first mounts, which `load()` accounts for.
 */
export function ExpensesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { flat, isLoading: flatLoading } = useCurrentFlat();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    // FlatProvider hasn't resolved yet -- `flat` being null right now doesn't
    // mean "no flat", it means "don't know yet". Stay in the loading state
    // rather than briefly reporting an empty expense list.
    if (flatLoading) return;

    if (!flat) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    // Only the very first load should block the UI with a skeleton -- a
    // later call (AppRevalidator on visibility/online, pull-to-refresh)
    // is refreshing data that's already correctly on screen.
    const isInitialLoad = !hasLoadedRef.current;
    if (isInitialLoad) setIsLoading(true);
    setError(null);
    const supabase = createClient();

    // expense_splits(*) embeds as a one-to-many array via the expense_id FK
    // -- one round trip instead of a separate splits query.
    const { data, error: fetchError } = await withSessionRetry(() =>
      supabase
        .from("expenses")
        .select("*, expense_splits(*)")
        .eq("flat_id", flat.id)
        .order("expense_date", { ascending: false })
    );

    if (fetchError) {
      // A background refresh failing shouldn't blank out data that's
      // already correctly displayed -- only surface it if we have nothing.
      if (isInitialLoad) {
        setError(fetchError.message);
        setExpenses([]);
      }
      setIsLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => {
      const { expense_splits, ...expenseRow } = row;
      return mapExpenseRow(expenseRow, expense_splits as ExpenseSplitRow[]);
    });
    setExpenses(mapped);
    hasLoadedRef.current = true;
    setIsLoading(false);
  }, [flat, flatLoading]);

  useEffect(() => {
    const id = setTimeout(load, 0);
    return () => clearTimeout(id);
  }, [load]);

  const getExpense = useCallback(
    (expenseId: string) => expenses.find((e) => e.id === expenseId),
    [expenses]
  );

  const addExpense = useCallback(
    async (input: ExpenseInput): Promise<Expense> => {
      if (!flat) throw new Error("No active flat.");
      const supabase = createClient();

      // Atomic path: one transaction that writes the expense and its splits
      // together, resolves the dedupe key server-side, and validates the
      // split sum. Falls back to the legacy two-request path when the RPC
      // isn't deployed yet (PGRST202), so this build is safe to ship before
      // 20260902000002_expense_split_integrity.sql is applied.
      const { data: rpcRow, error: rpcError } = await supabase
        .rpc("create_expense_with_splits", {
          p_flat_id: flat.id,
          p_title: input.title,
          // supabase gen types emits every non-defaulted argument as
          // non-nullable, but this one is `text` and genuinely accepts NULL
          // (an expense with no description). It has no SQL default, so it
          // cannot simply be omitted -- hence the cast.
          p_description: (input.description ?? null) as unknown as string,
          p_category: input.category,
          p_amount_paise: input.amountPaise,
          p_expense_date: input.date,
          p_split_type: input.splitType,
          p_paid_by: input.paidByFlatMemberId,
          p_splits: input.splits.map((s) => ({
            member_id: s.flatMemberId,
            share_amount_paise: s.shareAmountPaise,
          })),
          p_dedupe_key: input.dedupeKey ?? undefined,
        });

      if (!rpcError && rpcRow) {
        const { data: splitRows } = await supabase
          .from("expense_splits")
          .select()
          .eq("expense_id", rpcRow.id);
        const created = mapExpenseRow(rpcRow, splitRows ?? []);
        setExpenses((prev) =>
          prev.some((e) => e.id === created.id)
            ? prev
            : [created, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        );
        return created;
      }
      if (rpcError && rpcError.code !== "PGRST202") {
        throw new Error(rpcError.message);
      }

      const { data: expenseRow, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          flat_id: flat.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category,
          amount_paise: input.amountPaise,
          expense_date: input.date,
          split_type: input.splitType,
          paid_by: input.paidByFlatMemberId,
          created_by: user?.id ?? null,
          client_dedupe_key: input.dedupeKey ?? null,
        })
        .select()
        .single();

      if (expenseError || !expenseRow) {
        // A unique-violation on client_dedupe_key means this exact logical
        // submission already succeeded -- e.g. a retried request, a double
        // click that raced past the disabled-button window, or a resubmit
        // after the page refreshed mid-submission. Resolve to that existing
        // row instead of erroring, rather than creating a second expense.
        if (expenseError?.code === UNIQUE_VIOLATION && input.dedupeKey) {
          const { data: existing, error: existingError } = await supabase
            .from("expenses")
            .select("*, expense_splits(*)")
            .eq("client_dedupe_key", input.dedupeKey)
            .single();

          if (existing && !existingError) {
            const { expense_splits, ...existingRow } = existing;
            const resolved = mapExpenseRow(existingRow, expense_splits as ExpenseSplitRow[]);
            setExpenses((prev) =>
              prev.some((e) => e.id === resolved.id)
                ? prev
                : [resolved, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            );
            return resolved;
          }
        }
        throw new Error(expenseError?.message ?? "Couldn't save the expense.");
      }

      const { data: splitRows, error: splitsError } = await supabase
        .from("expense_splits")
        .insert(
          input.splits.map((s) => ({
            expense_id: expenseRow.id,
            member_id: s.flatMemberId,
            share_amount_paise: s.shareAmountPaise,
          }))
        )
        .select();

      if (splitsError) {
        // Compensating action: don't leave a split-less expense behind.
        await supabase.from("expenses").delete().eq("id", expenseRow.id);
        throw new Error(splitsError.message);
      }

      const expense = mapExpenseRow(expenseRow, splitRows ?? []);
      setExpenses((prev) =>
        prev.some((e) => e.id === expense.id)
          ? prev
          : [expense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      return expense;
    },
    [flat, user]
  );

  const updateExpense = useCallback(
    async (expenseId: string, input: ExpenseInput): Promise<Expense> => {
      const supabase = createClient();

      // One transaction, server-side. Previously this was three separate
      // requests (update expense, delete splits, insert splits) -- if the
      // last one failed the expense was left with no splits at all, silently
      // dropping out of everyone's balance while still showing on the
      // dashboard. The RPC also re-checks payer-only authorization and the
      // splits-sum invariant against the stored row, so neither depends on
      // this client behaving.
      const { data: expenseRow, error: expenseError } = await supabase
        .rpc("update_expense_with_splits", {
          p_expense_id: expenseId,
          p_title: input.title,
          // supabase gen types emits every non-defaulted argument as
          // non-nullable, but this one is `text` and genuinely accepts NULL
          // (an expense with no description). It has no SQL default, so it
          // cannot simply be omitted -- hence the cast.
          p_description: (input.description ?? null) as unknown as string,
          p_category: input.category,
          p_amount_paise: input.amountPaise,
          p_expense_date: input.date,
          p_split_type: input.splitType,
          p_paid_by: input.paidByFlatMemberId,
          p_splits: input.splits.map((s) => ({
            member_id: s.flatMemberId,
            share_amount_paise: s.shareAmountPaise,
          })),
        })
        .select()
        .single();

      // PGRST202 = "function not found in schema cache". The RPC ships in
      // supabase/migrations/20260902000002_expense_split_integrity.sql, which
      // is deliberately held back until this code deploys. Falling back to
      // the legacy three-request path means this build is safe to deploy in
      // either order -- before or after that migration. Delete this fallback
      // (and the `let`) once the migration is applied everywhere.
      let resolvedExpenseRow: ExpenseRow;
      if (expenseError?.code === "PGRST202") {
        resolvedExpenseRow = await legacyUpdateExpense(supabase, expenseId, input);
      } else if (expenseError || !expenseRow) {
        throw new Error(expenseError?.message ?? "Couldn't update the expense.");
      } else {
        resolvedExpenseRow = expenseRow;
      }

      const { data: splitRows, error: splitsError } = await supabase
        .from("expense_splits")
        .select()
        .eq("expense_id", expenseId);

      if (splitsError) {
        throw new Error(splitsError.message);
      }

      const updated = mapExpenseRow(resolvedExpenseRow, splitRows ?? []);
      setExpenses((prev) =>
        prev
          .map((e) => (e.id === expenseId ? updated : e))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
      return updated;
    },
    []
  );

  const deleteExpense = useCallback(async (expenseId: string) => {
    const supabase = createClient();
    // expense_splits cascade-delete with the expense (ON DELETE CASCADE).
    const { error: deleteError } = await supabase.from("expenses").delete().eq("id", expenseId);
    if (deleteError) {
      throw new Error(deleteError.message);
    }
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }, []);

  return (
    <ExpensesContext.Provider
      value={{ isLoading, error, expenses, getExpense, addExpense, updateExpense, deleteExpense, refresh: load }}
    >
      {children}
    </ExpensesContext.Provider>
  );
}

export function useExpenses(): ExpensesContextValue {
  const context = useContext(ExpensesContext);
  if (!context) {
    throw new Error("useExpenses must be used within an ExpensesProvider");
  }
  return context;
}
