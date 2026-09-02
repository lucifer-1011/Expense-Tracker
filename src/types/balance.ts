/**
 * Always derived from expenses + splits + settlements at read time.
 * Never persisted as the source of truth.
 */
export interface MemberBalance {
  flatMemberId: string;
  totalPaidPaise: number;
  totalOwedPaise: number;
  netFromExpensesPaise: number;
  totalSettlementsPaidPaise: number;
  totalSettlementsReceivedPaise: number;
  /** Positive: this member is owed money overall. Negative: this member owes money overall. */
  netBalancePaise: number;
}

export interface SuggestedSettlement {
  fromFlatMemberId: string;
  toFlatMemberId: string;
  amountPaise: number;
}

/**
 * One still-outstanding amount owed between the current user and a single
 * counterpart, traceable to the exact expense that generated it -- unlike
 * SuggestedSettlement, which nets everything between two people into one
 * minimal-cash-flow edge. Never merges two different expenses, even between
 * the same two people.
 */
export interface ExpenseSettlementItem {
  /** Stable identity for this owed amount: one expense, one counterpart. */
  key: string;
  expenseId: string;
  expenseTitle: string;
  expenseDate: string;
  counterpartFlatMemberId: string;
  /** True when the counterpart owes the current user; false when the current user owes the counterpart. */
  youAreOwed: boolean;
  /** What's still outstanding on this expense between these two people -- the original share minus anything already settled or pending against this exact expense. */
  amountPaise: number;
  /** A settlement_request already pending for this exact expense + counterpart pair. */
  pendingRequestId?: string;
}

/**
 * Several ExpenseSettlementItems collapsed into one card because they share
 * a purpose -- same (normalized) expense title, same counterpart, same
 * direction. Never groups across different titles, different counterparts,
 * or opposite directions between the same two people. `items` keeps each
 * underlying expense's own remaining amount so a settle-up action can still
 * record one precisely-attributed settlement per expense, oldest first.
 */
export interface ExpenseSettlementGroup {
  key: string;
  title: string;
  counterpartFlatMemberId: string;
  youAreOwed: boolean;
  /** Sum of every underlying item's remaining amount, settled or not. */
  amountPaise: number;
  /** True only when every underlying item already has a pending request -- if even one doesn't, the group stays actionable for that portion. */
  isPending: boolean;
  /** Oldest first, for FIFO allocation when settling a partial/custom amount. */
  items: ExpenseSettlementItem[];
}
