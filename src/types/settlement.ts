export type SettlementMethod = "cash" | "upi" | "bank_transfer" | "other";

export interface Settlement {
  id: string;
  flatId: string;
  fromFlatMemberId: string;
  toFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  date: string;
  note?: string;
  /** The specific expense this settles, if any -- absent for a general settle-up. */
  expenseId?: string;
}

export type SettlementRequestStatus = "pending" | "approved" | "rejected";

/**
 * A debtor-initiated ask to settle a debt. Never counts toward a balance on
 * its own -- only once the receiver approves does a real Settlement get
 * created (see approve_settlement_request in the settlement_requests
 * migration). Distinct from Settlement, which is the immutable finalized
 * ledger entry this becomes once approved.
 */
export interface SettlementRequest {
  id: string;
  flatId: string;
  payerFlatMemberId: string;
  receiverFlatMemberId: string;
  amountPaise: number;
  method: SettlementMethod;
  note?: string;
  status: SettlementRequestStatus;
  /** Set once approved -- the id of the Settlement this request became. */
  settlementId?: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  /** The specific expense this settles, if any -- absent for a general settle-up. */
  expenseId?: string;
}
