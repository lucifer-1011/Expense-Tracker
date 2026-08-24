"use client";

import { cloneElement, isValidElement, useState, type ReactElement } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
export function InviteMemberDialog({
  trigger,
  flat,
}: {
  trigger?: ReactElement<{ onClick?: () => void }>;
  flat: { name: string; inviteCode: string };
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(flat.inviteCode);
      setCopied(true);
      toast.success("Invite code copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the code -- copy it manually.");
    }
  }

  const triggerElement =
    trigger && isValidElement(trigger) ? (
      cloneElement(trigger, { onClick: () => setOpen(true) })
    ) : (
      <Button variant="outline" className="cursor-pointer rounded-full" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite roommate
      </Button>
    );

  return (
    <>
      {triggerElement}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite a roommate</DialogTitle>
            <DialogDescription>Share this code so they can join {flat.name}.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-secondary px-4 py-3">
            <span
              className="text-lg font-semibold tracking-wider text-foreground"
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            >
              {flat.inviteCode}
            </span>
            <Button
              size="icon-sm"
              variant="outline"
              className="cursor-pointer rounded-full"
              onClick={handleCopy}
              aria-label="Copy invite code"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Anyone with this code can request to join your flat. New members only see expenses
            added after they join.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
