"use client";

import { XCircle } from "lucide-react";

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
import { formatPaise } from "@/lib/format";

export function RejectSettlementDialog({
  open,
  onOpenChange,
  payerName,
  amountPaise,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payerName: string;
  amountPaise: number;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <XCircle />
          </AlertDialogMedia>
          <AlertDialogTitle>Reject this settlement request?</AlertDialogTitle>
          <AlertDialogDescription>
            {payerName}&apos;s request for {formatPaise(amountPaise)} will be rejected. The debt stays
            open, and they can send another request later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            Reject request
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
