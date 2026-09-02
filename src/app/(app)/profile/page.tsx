"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Copy, LogOut, Pencil } from "lucide-react";
import { toast } from "sonner";

import { InviteMemberDialog } from "@/components/members/invite-member-dialog";
import { EditDisplayNameDialog } from "@/components/profile/edit-display-name-dialog";
import { EditFlatNameDialog } from "@/components/profile/edit-flat-name-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { MemberAvatar } from "@/components/shared/member-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentFlat } from "@/components/providers/flat-provider";

export default function ProfilePage() {
  const { signOut } = useAuth();
  const { profile, flat, membership, activeMemberCount, isLoading, error, refresh } = useCurrentFlat();
  const [editFlatNameOpen, setEditFlatNameOpen] = useState(false);
  const [editDisplayNameOpen, setEditDisplayNameOpen] = useState(false);
  const isOwner = membership?.role === "owner";

  async function handleCopy() {
    if (!flat) return;
    try {
      await navigator.clipboard.writeText(flat.inviteCode);
      toast.success("Invite code copied");
    } catch {
      toast.error("Couldn't copy the code -- copy it manually.");
    }
  }

  async function handleSignOut() {
    await signOut();
    toast.success("Signed out");
  }

  if (isLoading || !profile || !flat || !membership) {
    if (error) {
      return <ErrorState title="Couldn't load your profile" description={error} onRetry={refresh} />;
    }
    return (
      <div className="space-y-8 pb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-3 w-24 rounded-full" />
          </div>
        </div>
        <ListSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6">
      <div className="flex items-center gap-3">
        <MemberAvatar member={{ id: profile.id, name: profile.displayName, avatarUrl: profile.avatarUrl ?? undefined }} size="lg" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{profile.displayName}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {membership.role} · {flat.name}
          </p>
        </div>
      </div>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profile</p>
        <div className="mt-2 divide-y divide-border">
          <button
            type="button"
            onClick={() => setEditDisplayNameOpen(true)}
            className="flex w-full cursor-pointer items-center justify-between py-3.5 text-sm"
          >
            <span className="text-muted-foreground">Display name</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              {profile.displayName}
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          </button>
        </div>
        <EditDisplayNameDialog
          open={editDisplayNameOpen}
          onOpenChange={setEditDisplayNameOpen}
          currentName={profile.displayName}
        />
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Flat</p>
        <div className="mt-2 divide-y divide-border">
          {isOwner ? (
            <button
              type="button"
              onClick={() => setEditFlatNameOpen(true)}
              className="flex w-full cursor-pointer items-center justify-between py-3.5 text-sm"
            >
              <span className="text-muted-foreground">Flat name</span>
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                {flat.name}
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            </button>
          ) : (
            <div className="flex items-center justify-between py-3.5 text-sm">
              <span className="text-muted-foreground">Flat name</span>
              <span className="font-medium text-foreground">{flat.name}</span>
            </div>
          )}
          <div className="flex items-center justify-between py-3.5 text-sm">
            <span className="text-muted-foreground">Invite code</span>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy invite code ${flat.inviteCode}`}
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
              {activeMemberCount} active
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </span>
          </Link>
        </div>

        <InviteMemberDialog
          flat={{ name: flat.name, inviteCode: flat.inviteCode }}
          trigger={
            <Button variant="outline" className="mt-4 w-full cursor-pointer rounded-full">
              Invite roommate
            </Button>
          }
        />

        {isOwner && (
          <EditFlatNameDialog open={editFlatNameOpen} onOpenChange={setEditFlatNameOpen} currentName={flat.name} />
        )}
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
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
        <div className="mt-2">
          <Button
            variant="outline"
            className="w-full cursor-pointer justify-center rounded-full"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
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
