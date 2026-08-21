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
import { useAppData } from "@/hooks/use-app-data";
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Settle up</DialogTitle>
          <DialogDescription>Record this payment between flatmates.</DialogDescription>
        </DialogHeader>
        {suggestion && (
          <SettleUpForm
            key={`${suggestion.fromFlatMemberId}-${suggestion.toFlatMemberId}-${suggestion.amountPaise}`}
            suggestion={suggestion}
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
  onDone,
}: {
  suggestion: SuggestedSettlement;
  onDone: () => void;
}) {
  const { getMember, recordSettlement } = useAppData();
  const [amountRupees, setAmountRupees] = useState(() => (suggestion.amountPaise / 100).toString());
  const [method, setMethod] = useState<SettlementMethod>("upi");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fromMember = getMember(suggestion.fromFlatMemberId);
  const toMember = getMember(suggestion.toFlatMemberId);
  if (!fromMember || !toMember) return null;

  const from: FlatMember = fromMember;
  const to: FlatMember = toMember;

  function handleSubmit(e: FormEvent) {
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

    recordSettlement({
      fromFlatMemberId: from.id,
      toFlatMemberId: to.id,
      amountPaise: Math.round(parsed.data.amountRupees * 100),
      method: parsed.data.method,
      note: parsed.data.note,
    });
    toast.success(`Marked ${from.name} → ${to.name} as settled`);
    onDone();
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
              className="h-11 rounded-xl pl-6 tabular-nums"
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

        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button type="submit" className="h-12 w-full cursor-pointer rounded-full" size="lg">
          Confirm settlement
        </Button>
      </form>
    </>
  );
}
