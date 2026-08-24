"use client";

import Link from "next/link";
import { Check, Receipt, X } from "lucide-react";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { formatDate, formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FlatMember, Notification, SettlementRequestStatus } from "@/types";

const TYPE_TITLES: Record<Notification["type"], string> = {
  settlement_request: "Settlement request",
  settlement_approved: "Settlement confirmed",
  settlement_rejected: "Settlement declined",
  expense_added: "New expense added",
};

function buildMessage(notification: Notification, actorName: string): string {
  const amount = notification.amountPaise != null ? formatPaise(notification.amountPaise) : "";
  switch (notification.type) {
    case "settlement_request":
      return `${actorName} says they've paid you ${amount}.`;
    case "settlement_approved":
      return `${actorName} confirmed your ${amount} settlement.`;
    case "settlement_rejected":
      return `${actorName} declined your settlement request.`;
    case "expense_added":
      return `${actorName} added "${notification.contextText ?? "an expense"}". Your share is ${amount}.`;
    default:
      return "";
  }
}

export function NotificationCard({
  notification,
  actor,
  requestStatus,
  expenseExists,
  isSubmitting,
  onApprove,
  onReject,
  onOpen,
}: {
  notification: Notification;
  /** The actor's current FlatMember, if still resolvable. */
  actor: FlatMember | undefined;
  /** Live status of the related settlement request, if this is a settlement_request notification. */
  requestStatus?: SettlementRequestStatus;
  /** Whether the related expense still exists (only meaningful for expense_added). */
  expenseExists: boolean;
  isSubmitting: boolean;
  onApprove: () => void;
  onReject: () => void;
  onOpen: () => void;
}) {
  const actorName = actor?.name ?? "A flatmate";
  const title = TYPE_TITLES[notification.type];
  const message = buildMessage(notification, actorName);
  const isActionablePending = notification.type === "settlement_request" && requestStatus === "pending";

  const media =
    notification.type === "expense_added" ? (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        <Receipt className="h-[18px] w-[18px]" />
      </div>
    ) : (
      <MemberAvatar member={actor ?? { id: notification.actorUserId ?? "unknown", name: actorName, avatarUrl: undefined }} size="md" />
    );

  const body = (
    <div className="flex items-start gap-3 py-3">
      {media}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <p className={cn("mt-0.5 text-sm text-foreground", !notification.isRead && "font-semibold")}>{message}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(notification.createdAt, { withYear: true })}</p>

        {notification.type === "settlement_request" && requestStatus && requestStatus !== "pending" && (
          <p className="mt-1.5 text-xs font-medium text-muted-foreground">
            {requestStatus === "approved" ? "Approved" : "Rejected"}
          </p>
        )}

        {isActionablePending && (
          <div className="mt-2.5 flex items-center gap-2">
            <Button
              size="sm"
              className="cursor-pointer rounded-full"
              aria-label={`Approve settlement request from ${actorName}`}
              onClick={onApprove}
              disabled={isSubmitting}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer rounded-full"
              aria-label={`Reject settlement request from ${actorName}`}
              onClick={onReject}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}

        {notification.type === "expense_added" && !expenseExists && (
          <p className="mt-1.5 text-xs text-muted-foreground">This item is no longer available.</p>
        )}
      </div>
      {!notification.isRead && (
        <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );

  if (notification.type === "expense_added" && expenseExists && notification.relatedExpenseId) {
    return (
      <Link href={`/expenses/${notification.relatedExpenseId}`} onClick={onOpen} className="block">
        {body}
      </Link>
    );
  }

  return <div>{body}</div>;
}
