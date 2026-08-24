"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { MemberAvatar } from "@/components/shared/member-avatar";
import { useCurrentFlat } from "@/hooks/use-current-flat";
import { useSettlements } from "@/hooks/use-settlements";
import { settlementFormSchema } from "@/lib/validations/settlement";
import type { FlatMember, SettlementMethod, SuggestedSettlement } from "@/types";

const METHOD_LABELS: Record<SettlementMethod, string> = {
  upi: "UPI",
  cash: "Cash",
  bank_transfer: "Bank transfer",
  other: "Other",
};

export function SettleUpDialog({
  suggestion,
  open,
  onOpenChange,
}: {
  suggestion: SuggestedSettlement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { membership } = useCurrentFlat();
  // The person who owes money must never be able to instantly settle their own
  // debt -- when *they* are the one submitting this form, it creates a pending
  // request instead (see SettleUpForm). The receiver marking a payment they
  // themselves received needs no one else's approval, so that path stays instant.
  const isDebtor = Boolean(suggestion && membership && suggestion.fromFlatMemberId === membership.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>
            {isDebtor
              ? "Sending this doesn't settle your balance right away -- the person you paid needs to confirm it first."
              : "Record this payment between flatmates."}
          </DialogDescription>
        </DialogHeader>
        {suggestion && (
          <SettleUpForm
            key={`${suggestion.fromFlatMemberId}-${suggestion.toFlatMemberId}-${suggestion.amountPaise}`}
            suggestion={suggestion}
            isDebtor={isDebtor}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Keyed by the suggestion's identity from the parent, so state resets for a
 * new suggestion without needing an effect + setState on prop change.
 */
function SettleUpForm({
  suggestion,
  isDebtor,
  onDone,
}: {
  suggestion: SuggestedSettlement;
  isDebtor: boolean;
  onDone: () => void;
}) {
  const { members } = useCurrentFlat();
  const { recordSettlement, requestSettlement } = useSettlements();
  const getMember = (flatMemberId: string) => members.find((m) => m.id === flatMemberId);
  const [amountRupees, setAmountRupees] = useState(() => (suggestion.amountPaise / 100).toString());
  const [method, setMethod] = useState<SettlementMethod>("upi");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fromMember = getMember(suggestion.fromFlatMemberId);
  const toMember = getMember(suggestion.toFlatMemberId);
  if (!fromMember || !toMember) return null;

  const from: FlatMember = fromMember;
  const to: FlatMember = toMember;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = settlementFormSchema.safeParse({
      fromFlatMemberId: from.id,
      toFlatMemberId: to.id,
      amountRupees,
      method,
      note: note || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the details and try again.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      if (isDebtor) {
        await requestSettlement({
          receiverFlatMemberId: to.id,
          amountPaise: Math.round(parsed.data.amountRupees * 100),
          method: parsed.data.method,
          note: parsed.data.note,
        });
        toast.success(`Settlement request sent to ${to.name}. Your balance will update once they confirm.`);
      } else {
        await recordSettlement({
          fromFlatMemberId: from.id,
          toFlatMemberId: to.id,
          amountPaise: Math.round(parsed.data.amountRupees * 100),
          method: parsed.data.method,
          note: parsed.data.note,
        });
        toast.success(`Marked ${from.name} → ${to.name} as settled`);
      }
      onDone();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isDebtor
            ? "Couldn't send the settlement request. Try again."
            : "Couldn't record the settlement. Try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-center gap-3 py-2">
        <div className="flex flex-col items-center gap-1.5">
          <MemberAvatar member={from} size="lg" />
          <span className="text-xs font-medium text-foreground">{from.name}</span>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col items-center gap-1.5">
          <MemberAvatar member={to} size="lg" />
          <span className="text-xs font-medium text-foreground">{to.name}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="settle-amount">Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              ₹
            </span>
            <Input
              id="settle-amount"
              inputMode="decimal"
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              className="h-12 rounded-xl pl-6 tabular-nums"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Select items={METHOD_LABELS} value={method} onValueChange={(v) => setMethod(v as SettlementMethod)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(METHOD_LABELS) as SettlementMethod[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {METHOD_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="settle-note">Note (optional)</Label>
          <Textarea
            id="settle-note"
            placeholder="e.g. July rent"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="h-14 w-full cursor-pointer rounded-full text-base"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isDebtor
              ? "Sending..."
              : "Confirming..."
            : isDebtor
              ? "Send settlement request"
              : "Confirm settlement"}
        </Button>
      </form>
    </>
  );
}
