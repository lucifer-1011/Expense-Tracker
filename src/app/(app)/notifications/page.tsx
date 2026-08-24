"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";

import { NotificationCard } from "@/components/notifications/notification-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { RejectSettlementDialog } from "@/components/settlements/reject-settlement-dialog";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useExpenses } from "@/hooks/use-expenses";
import { useNotifications } from "@/hooks/use-notifications";
import { useSettlements } from "@/hooks/use-settlements";
import type { SettlementRequest } from "@/types";

export default function NotificationsPage() {
  const { members } = useCurrentFlat();
  const { notifications, isLoading, error, markAllAsRead, refresh } = useNotifications();
  const { settlementRequests, approveSettlementRequest, rejectSettlementRequest } = useSettlements();
  const { getExpense } = useExpenses();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<SettlementRequest | null>(null);
  const hasAutoMarkedRead = useRef(false);

  // A fresh view of this page's own data every time it's opened, since
  // navigating here doesn't remount the provider (client-side routing keeps
  // it mounted at the (app) layout level) -- otherwise this could show
  // notifications as stale as whenever the app was first loaded.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opening this page is "reading" the list -- mark everything read once,
  // the first time notifications are actually loaded and shown.
  useEffect(() => {
    if (!isLoading && !hasAutoMarkedRead.current && notifications.some((n) => !n.isRead)) {
      hasAutoMarkedRead.current = true;
      markAllAsRead().catch(() => {
        // Non-critical -- the list itself still renders correctly either way.
      });
    }
  }, [isLoading, notifications, markAllAsRead]);

  async function handleApprove(requestId: string, actorName: string) {
    setSubmittingId(requestId);
    try {
      await approveSettlementRequest(requestId);
      toast.success(`Settlement with ${actorName} confirmed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't approve the settlement request.");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleReject(request: SettlementRequest) {
    setSubmittingId(request.id);
    try {
      await rejectSettlementRequest(request.id);
      toast.success("Settlement request rejected.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't reject the settlement request.");
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 pb-6">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">Notifications</h1>

      {isLoading ? (
        <ListSkeleton rows={5} />
      ) : error ? (
        <ErrorState title="Couldn't load notifications" description={error} onRetry={refresh} />
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" description="You're all caught up." />
      ) : (
        <div className="divide-y divide-border">
          {notifications.map((notification) => {
            const actor = members.find((m) => m.profileId === notification.actorUserId);
            const request = notification.relatedSettlementRequestId
              ? settlementRequests.find((r) => r.id === notification.relatedSettlementRequestId)
              : undefined;
            const expenseExists = notification.relatedExpenseId
              ? Boolean(getExpense(notification.relatedExpenseId))
              : false;

            return (
              <NotificationCard
                key={notification.id}
                notification={notification}
                actor={actor}
                requestStatus={request?.status}
                expenseExists={expenseExists}
                isSubmitting={submittingId === notification.id}
                onApprove={() =>
                  notification.relatedSettlementRequestId &&
                  handleApprove(notification.relatedSettlementRequestId, actor?.name ?? "this member")
                }
                onReject={() => request && setRejectTarget(request)}
                onOpen={() => {}}
              />
            );
          })}
        </div>
      )}

      {rejectTarget && (
        <RejectSettlementDialog
          open={Boolean(rejectTarget)}
          onOpenChange={(open) => !open && setRejectTarget(null)}
          payerName={members.find((m) => m.id === rejectTarget.payerFlatMemberId)?.name ?? "This member"}
          amountPaise={rejectTarget.amountPaise}
          onConfirm={() => handleReject(rejectTarget)}
        />
      )}
    </div>
  );
}
