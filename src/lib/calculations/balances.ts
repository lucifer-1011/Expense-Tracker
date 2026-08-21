import type { Expense, FlatMember, MemberBalance, Settlement } from "@/types";

/**
 * Derives each member's balance from expenses, expense splits, and
 * settlements. Balances are never stored -- this is the single source of
 * truth for "who owes whom" and must be recomputed whenever the underlying
 * expenses or settlements change.
 *
 * Sign convention: positive netBalancePaise means the flat owes this member
 * money; negative means this member owes the flat money.
 */
export function calculateMemberBalances(
  members: Pick<FlatMember, "id">[],
  expenses: Expense[],
  settlements: Settlement[]
): MemberBalance[] {
  return members.map((member) => {
    const totalPaidPaise = expenses
      .filter((e) => e.paidByFlatMemberId === member.id)
      .reduce((sum, e) => sum + e.amountPaise, 0);

    const totalOwedPaise = expenses.reduce((sum, e) => {
      const share = e.splits.find((s) => s.flatMemberId === member.id);
      return sum + (share?.shareAmountPaise ?? 0);
    }, 0);

    const netFromExpensesPaise = totalPaidPaise - totalOwedPaise;

    const totalSettlementsPaidPaise = settlements
      .filter((s) => s.fromFlatMemberId === member.id)
      .reduce((sum, s) => sum + s.amountPaise, 0);

    const totalSettlementsReceivedPaise = settlements
      .filter((s) => s.toFlatMemberId === member.id)
      .reduce((sum, s) => sum + s.amountPaise, 0);

    // Paying a settlement reduces what you owe (moves you toward zero);
    // receiving one reduces what you're owed.
    const netBalancePaise =
      netFromExpensesPaise + totalSettlementsPaidPaise - totalSettlementsReceivedPaise;

    return {
      flatMemberId: member.id,
      totalPaidPaise,
      totalOwedPaise,
      netFromExpensesPaise,
      totalSettlementsPaidPaise,
      totalSettlementsReceivedPaise,
      netBalancePaise,
    };
  });
}

export function getMemberBalance(
  balances: MemberBalance[],
  flatMemberId: string
): MemberBalance {
  return (
    balances.find((b) => b.flatMemberId === flatMemberId) ?? {
      flatMemberId,
      totalPaidPaise: 0,
      totalOwedPaise: 0,
      netFromExpensesPaise: 0,
      totalSettlementsPaidPaise: 0,
      totalSettlementsReceivedPaise: 0,
      netBalancePaise: 0,
    }
  );
}
