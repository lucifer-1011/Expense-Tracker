import type { MemberBalance, SuggestedSettlement } from "@/types";

const MIN_SUGGESTION_PAISE = 1;

/**
 * Greedily matches the largest debtor with the largest creditor, repeatedly,
 * to produce close to the minimum number of payments needed to settle every
 * balance back to zero. Members already at zero are skipped entirely.
 */
export function generateSuggestedSettlements(
  balances: MemberBalance[]
): SuggestedSettlement[] {
  const creditors = balances
    .filter((b) => b.netBalancePaise > 0)
    .map((b) => ({ flatMemberId: b.flatMemberId, amountPaise: b.netBalancePaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const debtors = balances
    .filter((b) => b.netBalancePaise < 0)
    .map((b) => ({ flatMemberId: b.flatMemberId, amountPaise: -b.netBalancePaise }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  const suggestions: SuggestedSettlement[] = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amountPaise = Math.min(creditor.amountPaise, debtor.amountPaise);

    if (amountPaise >= MIN_SUGGESTION_PAISE) {
      suggestions.push({
        fromFlatMemberId: debtor.flatMemberId,
        toFlatMemberId: creditor.flatMemberId,
        amountPaise,
      });
    }

    creditor.amountPaise -= amountPaise;
    debtor.amountPaise -= amountPaise;

    if (creditor.amountPaise === 0) creditorIndex += 1;
    if (debtor.amountPaise === 0) debtorIndex += 1;
  }

  return suggestions;
}

/**
 * Reads the suggested-settlement edge directly between two members, if one
 * exists. Positive means memberB owes memberA; negative means memberA owes
 * memberB; zero means there is no direct suggested payment between the two
 * (either they're square with each other, or the minimal-transaction match
 * routed their debt through someone else).
 */
export function getRelativeBalance(
  suggestions: SuggestedSettlement[],
  memberAId: string,
  memberBId: string
): number {
  for (const s of suggestions) {
    if (s.fromFlatMemberId === memberBId && s.toFlatMemberId === memberAId) return s.amountPaise;
    if (s.fromFlatMemberId === memberAId && s.toFlatMemberId === memberBId) return -s.amountPaise;
  }
  return 0;
}
