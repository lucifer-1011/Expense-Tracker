"use client";

import { useState } from "react";
import { MoreVertical, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { InviteMemberDialog } from "@/components/members/invite-member-dialog";
import { MarkInactiveDialog } from "@/components/members/mark-inactive-dialog";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { RoommateRow } from "@/components/shared/roommate-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/hooks/use-app-data";
import { getRelativeBalance } from "@/lib/calculations/settlements";
import { formatDate, formatPaise } from "@/lib/format";
import type { FlatMember } from "@/types";

export default function MembersPage() {
  const { flat, activeMembers, pastMembers, currentMember, suggestedSettlements, markMemberInactive, isLoading } =
    useAppData();
  const [targetMember, setTargetMember] = useState<FlatMember | null>(null);
  const canManage = currentMember.role === "owner";

  function handleConfirmInactive() {
    if (!targetMember) return;
    markMemberInactive(targetMember.id);
    toast.success(`${targetMember.name} marked as inactive`);
  }

  return (
    <div className="space-y-8 pb-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flat</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{flat.name}</h1>
      </div>

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : (
        <>
          <section>
            <div className="divide-y divide-border">
              {activeMembers.map((member) => {
                const isMe = member.id === currentMember.id;
                const relative = isMe
                  ? 0
                  : getRelativeBalance(suggestedSettlements, currentMember.id, member.id);

                return (
                  <div key={member.id} className="flex items-center gap-3 py-3.5">
                    <RoommateRow
                      member={member}
                      className="flex-1"
                      subtitle={
                        isMe ? (
                          "You"
                        ) : relative === 0 ? (
                          "Settled up"
                        ) : relative > 0 ? (
                          <span className="text-positive-muted-foreground">
                            Owes you {formatPaise(relative)}
                          </span>
                        ) : (
                          <span className="text-owing-muted-foreground">
                            You owe {formatPaise(-relative)}
                          </span>
                        )
                      }
                    />
                    {canManage && !isMe && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
                          aria-label={`Manage ${member.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem variant="destructive" onClick={() => setTargetMember(member)}>
                            Mark as inactive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>

            <InviteMemberDialog
              trigger={
                <button className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-dashed border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent">
                  <UserPlus className="h-4 w-4" />
                  Add roommate
                </button>
              }
            />
          </section>

          {pastMembers.length > 0 && (
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Past roommates
              </p>
              <div className="mt-2 divide-y divide-border opacity-70">
                {pastMembers.map((member) => (
                  <div key={member.id} className="py-3.5">
                    <RoommateRow
                      member={member}
                      subtitle={`Left ${formatDate(member.leftAt ?? member.joinedAt, { withYear: true })}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <MarkInactiveDialog
        open={Boolean(targetMember)}
        onOpenChange={(open) => !open && setTargetMember(null)}
        memberName={targetMember?.name ?? ""}
        onConfirm={handleConfirmInactive}
      />
    </div>
  );
}
