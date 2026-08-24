/**
 * Converts raw database rows (snake_case, matching the SQL schema exactly) into
 * the camelCase domain types the rest of the app -- calculations, mock data,
 * UI components -- already speaks (see src/types). Nothing in components or in
 * src/lib/calculations should ever import from database.types.ts directly;
 * everything should pass through here first.
 */

import type {
  Expense,
  ExpenseCategory,
  ExpenseSplit,
  Flat,
  FlatMember,
  MemberRole,
  Notification,
  NotificationType,
  Settlement,
  SettlementMethod,
  SettlementRequest,
  SettlementRequestStatus,
  SplitType,
} from "@/types";
import type { Database } from "./database.types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type FlatRow = Database["public"]["Tables"]["flats"]["Row"];
type FlatMemberRow = Database["public"]["Tables"]["flat_members"]["Row"];
type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type ExpenseSplitRow = Database["public"]["Tables"]["expense_splits"]["Row"];
type SettlementRow = Database["public"]["Tables"]["settlements"]["Row"];
type SettlementRequestRow = Database["public"]["Tables"]["settlement_requests"]["Row"];
type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

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
    // The DB's flat_members_role_check CHECK constraint guarantees this is one of MemberRole.
    role: row.role as MemberRole,
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
    // The DB's expenses_category_check / expenses_split_type_check CHECK constraints
    // guarantee these are one of ExpenseCategory / SplitType.
    category: row.category as ExpenseCategory,
    amountPaise: row.amount_paise,
    date: row.expense_date,
    paidByFlatMemberId: row.paid_by,
    splitType: row.split_type as SplitType,
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
    // The DB's settlements_method_check CHECK constraint guarantees this is one of SettlementMethod.
    method: row.method as SettlementMethod,
    date: row.settled_at,
    note: row.notes ?? undefined,
  };
}

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientUserId: row.recipient_user_id,
    flatId: row.flat_id,
    // The DB's notifications_type_check CHECK constraint guarantees this is one of NotificationType.
    type: row.type as NotificationType,
    actorUserId: row.actor_user_id ?? undefined,
    amountPaise: row.amount_paise ?? undefined,
    contextText: row.context_text ?? undefined,
    relatedExpenseId: row.related_expense_id ?? undefined,
    relatedSettlementRequestId: row.related_settlement_request_id ?? undefined,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at ?? undefined,
  };
}

export function mapSettlementRequestRow(row: SettlementRequestRow): SettlementRequest {
  return {
    id: row.id,
    flatId: row.flat_id,
    payerFlatMemberId: row.payer_member_id,
    receiverFlatMemberId: row.receiver_member_id,
    amountPaise: row.amount_paise,
    // The DB's settlement_requests_method_check / _status_check CHECK constraints
    // guarantee these are one of SettlementMethod / SettlementRequestStatus.
    method: row.method as SettlementMethod,
    note: row.note ?? undefined,
    status: row.status as SettlementRequestStatus,
    settlementId: row.settlement_id ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
    resolvedBy: row.resolved_by ?? undefined,
  };
}
