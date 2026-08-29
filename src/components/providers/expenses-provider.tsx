"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

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
}

type ExpenseSplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];

interface ExpensesContextValue {
  /** True until the first fetch for the current flat resolves. */
  isLoading: boolean;
  /** Set when the initial fetch fails; cleared on a successful refresh. */
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

    setIsLoading(true);
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
      setError(fetchError.message);
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    const mapped = (data ?? []).map((row) => {
      const { expense_splits, ...expenseRow } = row;
      return mapExpenseRow(expenseRow, expense_splits as ExpenseSplitRow[]);
    });
    setExpenses(mapped);
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
        })
        .select()
        .single();

      if (expenseError || !expenseRow) {
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
      setExpenses((prev) => [expense, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      return expense;
    },
    [flat, user]
  );

  const updateExpense = useCallback(
    async (expenseId: string, input: ExpenseInput): Promise<Expense> => {
      const supabase = createClient();

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

      // Simplest correct way to replace a snapshot: clear the old one, write
      // the new one. expense_splits has no update-in-place semantics here.
      const { error: deleteSplitsError } = await supabase
        .from("expense_splits")
        .delete()
        .eq("expense_id", expenseId);
      if (deleteSplitsError) {
        throw new Error(deleteSplitsError.message);
      }

      const { data: splitRows, error: splitsError } = await supabase
        .from("expense_splits")
        .insert(
          input.splits.map((s) => ({
            expense_id: expenseId,
            member_id: s.flatMemberId,
            share_amount_paise: s.shareAmountPaise,
          }))
        )
        .select();

      if (splitsError) {
        throw new Error(splitsError.message);
      }

      const updated = mapExpenseRow(expenseRow, splitRows ?? []);
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
