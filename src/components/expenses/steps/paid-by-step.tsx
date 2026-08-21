"use client";

import { Check } from "lucide-react";

import { RoommateRow } from "@/components/shared/roommate-row";
import { cn } from "@/lib/utils";
import type { FlatMember } from "@/types";

export function PaidByStep({
  members,
  selectedId,
  onSelect,
}: {
  members: FlatMember[];
  selectedId: string;
  onSelect: (flatMemberId: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-2 pb-6">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">Who paid?</h1>
      <div className="divide-y divide-border">
        {members.map((member) => {
          const selected = member.id === selectedId;
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onSelect(member.id)}
              className="flex w-full cursor-pointer items-center py-3.5 text-left"
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
    </div>
  );
}
