"use client";

import { UserMinus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function MarkInactiveDialog({
  open,
  onOpenChange,
  memberName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-muted text-muted-foreground">
            <UserMinus />
          </AlertDialogMedia>
          <AlertDialogTitle>Mark {memberName} as inactive?</AlertDialogTitle>
          <AlertDialogDescription>
            {memberName} will move to past members. Their expense history and settlements stay
            untouched, and they won&apos;t be added to any new expenses automatically.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Mark as inactive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
