export type NotificationType = "settlement_request" | "settlement_approved" | "settlement_rejected" | "expense_added";

/**
 * A real event a user needs to see or act on. Always created server-side
 * (a database trigger for expense_added, or the settlement RPCs for the
 * settlement_* types) -- never fabricated client-side.
 *
 * Deliberately holds structured data (amountPaise, contextText, actorUserId)
 * rather than a pre-rendered message -- the UI renders the final text with
 * the same formatPaise() used everywhere else, and looks up the actor's
 * current name from already-loaded flat data.
 */
export interface Notification {
  id: string;
  recipientUserId: string;
  flatId: string;
  type: NotificationType;
  actorUserId?: string;
  amountPaise?: number;
  contextText?: string;
  relatedExpenseId?: string;
  relatedSettlementRequestId?: string;
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}
