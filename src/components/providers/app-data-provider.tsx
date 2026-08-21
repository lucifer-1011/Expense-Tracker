"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { calculateMemberBalances } from "@/lib/calculations/balances";
import { generateSuggestedSettlements } from "@/lib/calculations/settlements";
import {
  CURRENT_FLAT_MEMBER_ID,
  MOCK_EXPENSES,
  MOCK_FLAT,
  MOCK_MEMBERS,
  MOCK_SETTLEMENTS,
} from "@/lib/mock";
import type {
  Expense,
  ExpenseSplit,
  Flat,
  FlatMember,
  MemberBalance,
  Settlement,
  SettlementMethod,
  SplitType,
  ExpenseCategory,
  SuggestedSettlement,
} from "@/types";

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

export interface SettlementInput {
  fromFlatMemberId: string;
  toFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
}

interface AppDataContextValue {
  flat: Flat;
  members: FlatMember[];
  activeMembers: FlatMember[];
  pastMembers: FlatMember[];
  currentMember: FlatMember;
  expenses: Expense[];
  settlements: Settlement[];
  balances: MemberBalance[];
  suggestedSettlements: SuggestedSettlement[];
  isLoading: boolean;
  getMember: (flatMemberId: string) => FlatMember | undefined;
  getExpense: (expenseId: string) => Expense | undefined;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (expenseId: string, input: ExpenseInput) => void;
  deleteExpense: (expenseId: string) => void;
  recordSettlement: (input: SettlementInput) => void;
  markMemberInactive: (flatMemberId: string) => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

let nextExpenseId = MOCK_EXPENSES.length + 1;
let nextSettlementId = MOCK_SETTLEMENTS.length + 1;

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [settlements, setSettlements] = useState<Settlement[]>(MOCK_SETTLEMENTS);
  const [members, setMembers] = useState<FlatMember[]>(MOCK_MEMBERS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 550);
    return () => clearTimeout(timeout);
  }, []);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  const sortedSettlements = useMemo(
    () => [...settlements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [settlements]
  );

  const activeMembers = useMemo(() => members.filter((m) => m.isActive), [members]);
  const pastMembers = useMemo(() => members.filter((m) => !m.isActive), [members]);

  const balances = useMemo(
    () => calculateMemberBalances(members, expenses, settlements),
    [members, expenses, settlements]
  );

  const suggestedSettlements = useMemo(
    () => generateSuggestedSettlements(balances.filter((b) => activeMembers.some((m) => m.id === b.flatMemberId))),
    [balances, activeMembers]
  );

  const getMember = useCallback(
    (flatMemberId: string) => members.find((m) => m.id === flatMemberId),
    [members]
  );

  const getExpense = useCallback(
    (expenseId: string) => expenses.find((e) => e.id === expenseId),
    [expenses]
  );

  const addExpense = useCallback((input: ExpenseInput) => {
    const expense: Expense = {
      id: `exp-${nextExpenseId++}`,
      flatId: MOCK_FLAT.id,
      createdAt: new Date().toISOString(),
      ...input,
    };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((expenseId: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === expenseId ? { ...e, ...input } : e))
    );
  }, []);

  const deleteExpense = useCallback((expenseId: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
  }, []);

  const recordSettlement = useCallback((input: SettlementInput) => {
    const settlement: Settlement = {
      id: `settle-${nextSettlementId++}`,
      flatId: MOCK_FLAT.id,
      date: new Date().toISOString(),
      ...input,
    };
    setSettlements((prev) => [settlement, ...prev]);
  }, []);

  const markMemberInactive = useCallback((flatMemberId: string) => {
    setMembers((prev) =>
      prev.map((m) =>
        m.id === flatMemberId ? { ...m, isActive: false, leftAt: new Date().toISOString() } : m
      )
    );
  }, []);

  const currentMember = useMemo(
    () => members.find((m) => m.id === CURRENT_FLAT_MEMBER_ID) ?? members[0],
    [members]
  );

  const value: AppDataContextValue = {
    flat: MOCK_FLAT,
    members,
    activeMembers,
    pastMembers,
    currentMember,
    expenses: sortedExpenses,
    settlements: sortedSettlements,
    balances,
    suggestedSettlements,
    isLoading,
    getMember,
    getExpense,
    addExpense,
    updateExpense,
    deleteExpense,
    recordSettlement,
    markMemberInactive,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used within an AppDataProvider");
  }
  return context;
}
