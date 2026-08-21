"use client";

import Link from "next/link";
import { ChevronRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { InviteMemberDialog } from "@/components/members/invite-member-dialog";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/hooks/use-app-data";

export default function ProfilePage() {
  const { flat, activeMembers, currentMember } = useAppData();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(flat.inviteCode);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy the code -- copy it manually.");
    }
  }

  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center gap-3">
        <MemberAvatar member={currentMember} size="lg" />
        <div>
          <h1 className="text-xl font-bold text-foreground">{currentMember.name}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {currentMember.role} · {flat.name}
          </p>
        </div>
      </div>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flat</p>
        <div className="mt-2 divide-y divide-border">
          <div className="flex items-center justify-between py-3.5 text-sm">
            <span className="text-muted-foreground">Flat name</span>
            <span className="font-medium text-foreground">{flat.name}</span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-sm">
            <span className="text-muted-foreground">Invite code</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex cursor-pointer items-center gap-1.5 font-medium text-foreground"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {flat.inviteCode}
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <Link href="/members" className="flex items-center justify-between py-3.5 text-sm">
            <span className="text-muted-foreground">Members</span>
            <span className="flex items-center gap-1 font-medium text-foreground">
              {activeMembers.length} active
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </span>
          </Link>
        </div>

        <InviteMemberDialog
          trigger={
            <Button variant="outline" className="mt-4 w-full cursor-pointer rounded-full">
              Invite roommate
            </Button>
          }
        />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</p>
        <div className="mt-2 divide-y divide-border">
          <div className="flex items-center justify-between py-3.5 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-medium text-foreground">INR (₹)</span>
          </div>
        </div>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Danger zone</p>
        <div className="mt-2 space-y-3">
          <p className="text-sm text-muted-foreground">
            Leaving or deleting a flat isn&apos;t available yet in this preview.
          </p>
          <Button variant="destructive" className="cursor-not-allowed rounded-full opacity-60" disabled>
            Leave flat
          </Button>
        </div>
      </section>
    </div>
  );
}
