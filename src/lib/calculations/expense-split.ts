import type { ExpenseSplit } from "@/types";

/**
 * Splits an amount evenly across participants in integer paise. Any
 * remainder from the division (which cannot be split evenly) is handed out
 * one paisa at a time to the first participants so the splits always sum
 * back to the exact total.
 */
export function splitEqually(
  amountPaise: number,
  participantFlatMemberIds: string[]
): ExpenseSplit[] {
  const count = participantFlatMemberIds.length;
  if (count === 0) return [];

  const basePaise = Math.floor(amountPaise / count);
  const remainderPaise = amountPaise - basePaise * count;

  return participantFlatMemberIds.map((flatMemberId, index) => ({
    flatMemberId,
    shareAmountPaise: basePaise + (index < remainderPaise ? 1 : 0),
  }));
}

export interface CustomSplitValidation {
  isValid: boolean;
  assignedPaise: number;
  remainingPaise: number;
}

/**
 * Validates that a custom split's individual shares add up to the total
 * expense amount exactly, in integer paise.
 */
export function validateCustomSplit(
  amountPaise: number,
  splits: Pick<ExpenseSplit, "shareAmountPaise">[]
): CustomSplitValidation {
  const assignedPaise = splits.reduce((sum, s) => sum + s.shareAmountPaise, 0);
  const remainingPaise = amountPaise - assignedPaise;

  return {
    isValid: remainingPaise === 0 && splits.every((s) => s.shareAmountPaise >= 0),
    assignedPaise,
    remainingPaise,
  };
}
