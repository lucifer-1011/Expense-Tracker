/**
 * Converts raw database rows (snake_case, matching the SQL schema exactly) into
 * the camelCase domain types the rest of the app -- calculations, mock data,
 * UI components -- already speaks (see src/types). Nothing in components or in
 * src/lib/calculations should ever import from database.types.ts directly;
 * everything should pass through here first.
 *
 * Not wired into the UI yet (Phase 3 is schema-only) -- these are ready for the
 * data-fetching phase that replaces src/lib/mock and
 * src/components/providers/app-data-provider.tsx.
 */

import type {
  Expense,
  ExpenseSplit,
  Flat,
  FlatMember,
  Settlement,
} from "@/types";
import type { Database } from "./database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type FlatRow = Database["public"]["Tables"]["flats"]["Row"];
type FlatMemberRow = Database["public"]["Tables"]["flat_members"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseSplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];

export function mapFlatRow(row: FlatRow): Flat {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdAt: row.created_at,
  };
}

/** flat_members carries no display info of its own -- it always needs the joined profile row. */
export function mapFlatMemberRow(row: FlatMemberRow, profile: ProfileRow): FlatMember {
  return {
    id: row.id,
    flatId: row.flat_id,
    profileId: row.user_id,
    name: profile.display_name,
    avatarUrl: profile.avatar_url ?? undefined,
    role: row.role,
    isActive: row.is_active,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
  };
}

export function mapExpenseSplitRow(row: ExpenseSplitRow): ExpenseSplit {
  return {
    flatMemberId: row.member_id,
    shareAmountPaise: row.share_amount_paise,
  };
}

export function mapExpenseRow(row: ExpenseRow, splitRows: ExpenseSplitRow[]): Expense {
  return {
    id: row.id,
    flatId: row.flat_id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    amountPaise: row.amount_paise,
    date: row.expense_date,
    paidByFlatMemberId: row.paid_by,
    splitType: row.split_type,
    splits: splitRows.filter((s) => s.expense_id === row.id).map(mapExpenseSplitRow),
    createdAt: row.created_at,
  };
}

export function mapSettlementRow(row: SettlementRow): Settlement {
  return {
    id: row.id,
    flatId: row.flat_id,
    fromFlatMemberId: row.from_member_id,
    toFlatMemberId: row.to_member_id,
    amountPaise: row.amount_paise,
    method: row.method,
    date: row.settled_at,
    note: row.notes ?? undefined,
  };
}
