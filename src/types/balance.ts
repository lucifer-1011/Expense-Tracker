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
