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
}
