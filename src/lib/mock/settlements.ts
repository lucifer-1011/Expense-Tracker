import type { Settlement } from "@/types";

export const MOCK_SETTLEMENTS: Settlement[] = [
  {
    id: "settle-1",
    flatId: "flat-1",
    fromFlatMemberId: "member-aman",
    toFlatMemberId: "member-piyush",
    amountPaise: 150_000,
    method: "upi",
    date: "2026-07-31T19:00:00.000Z",
    note: "July rent adjustment",
  },
  {
    id: "settle-2",
    flatId: "flat-1",
    fromFlatMemberId: "member-rahul",
    toFlatMemberId: "member-priya",
    amountPaise: 30_000,
    method: "cash",
    date: "2026-07-15T20:00:00.000Z",
  },
  {
    id: "settle-3",
    flatId: "flat-1",
    fromFlatMemberId: "member-karan",
    toFlatMemberId: "member-piyush",
    amountPaise: 60_000,
    method: "upi",
    date: "2025-04-10T17:00:00.000Z",
    note: "Settled before moving out",
  },
];
