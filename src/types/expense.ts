export type ExpenseCategory =
  | "groceries"
  | "rent"
  | "utilities"
  | "internet"
  | "food"
  | "transport"
  | "household"
  | "entertainment"
  | "other";

export type SplitType = "equal" | "custom";

/**
 * Permanent per-expense snapshot of a participant's share. Never derived
 * from current flat membership -- an expense's splits do not change when
 * members join or leave the flat later.
 */
export interface ExpenseSplit {
  flatMemberId: string;
  shareAmountPaise: number;
}

export interface Expense {
  id: string;
  flatId: string;
  title: string;
  description?: string;
  category: ExpenseCategory;
  amountPaise: number;
  date: string;
  paidByFlatMemberId: string;
  splitType: SplitType;
  splits: ExpenseSplit[];
  createdAt: string;
}
