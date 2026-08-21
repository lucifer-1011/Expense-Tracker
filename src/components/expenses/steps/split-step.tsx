"use client";

import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoommateRow } from "@/components/shared/roommate-row";
import { splitEqually } from "@/lib/calculations/expense-split";
import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FlatMember, SplitType } from "@/types";

export function SplitStep({
  members,
  selectedIds,
  onToggleParticipant,
  splitType,
  onSplitTypeChange,
  amountPaise,
  customValues,
  onCustomValueChange,
  onContinue,
  error,
}: {
  members: FlatMember[];
  selectedIds: string[];
  onToggleParticipant: (flatMemberId: string) => void;
  splitType: SplitType;
  onSplitTypeChange: (type: SplitType) => void;
  amountPaise: number;
  customValues: Record<string, string>;
  onCustomValueChange: (flatMemberId: string, value: string) => void;
  onContinue: () => void;
  error?: string | null;
}) {
  const participants = members.filter((m) => selectedIds.includes(m.id));
  const equalSplits = splitEqually(amountPaise, selectedIds);
  const eachSharePaise = equalSplits[0]?.shareAmountPaise ?? 0;

  const assignedPaise = participants.reduce(
    (sum, p) => sum + Math.round((parseFloat(customValues[p.id] || "0") || 0) * 100),
    0
  );
  const remainingPaise = amountPaise - assignedPaise;

  const canContinue =
    participants.length > 0 && (splitType === "equal" || remainingPaise === 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto px-5 pt-2 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Split between</h1>

        <div className="divide-y divide-border">
          {members.map((member) => {
            const selected = selectedIds.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                onClick={() => onToggleParticipant(member.id)}
                className="flex w-full cursor-pointer items-center py-3 text-left"
              >
                <RoommateRow
                  member={member}
                  trailing={
                    <div
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      )}
                    >
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </div>
                  }
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-border bg-secondary p-1">
          {(["equal", "custom"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onSplitTypeChange(type)}
              className={cn(
                "flex-1 cursor-pointer rounded-full py-2 text-sm font-medium capitalize transition-colors",
                splitType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              {type} split
            </button>
          ))}
        </div>

        {splitType === "equal" ? (
          participants.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Split equally <span className="font-semibold text-foreground">{formatPaise(eachSharePaise)} each</span>
            </p>
          )
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-border">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between gap-3 py-2.5">
                  <RoommateRow member={participant} className="flex-1" />
                  <div className="relative w-28 shrink-0">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      inputMode="decimal"
                      value={customValues[participant.id] ?? ""}
                      onChange={(e) => onCustomValueChange(participant.id, e.target.value)}
                      className="h-10 rounded-lg pl-6 text-right tabular-nums"
                      placeholder="0"
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2.5 text-sm">
              <span className="text-muted-foreground">Total {formatPaise(amountPaise)}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  remainingPaise === 0 ? "text-positive-muted-foreground" : "text-owing-muted-foreground"
                )}
              >
                {remainingPaise === 0
                  ? "All assigned"
                  : `${formatPaise(Math.abs(remainingPaise))} ${remainingPaise > 0 ? "remaining" : "over"}`}
              </span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="border-t border-border px-5 py-4">
        <Button
          size="lg"
          className="h-14 w-full rounded-full text-base"
          disabled={!canContinue}
          onClick={onContinue}
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
