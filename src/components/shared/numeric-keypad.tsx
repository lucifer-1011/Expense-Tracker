"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"] as const;

export function NumericKeypad({
  onKeyPress,
  className,
}: {
  onKeyPress: (key: (typeof KEYS)[number]) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKeyPress(key)}
          aria-label={key === "backspace" ? "Delete" : key}
          className="flex h-16 cursor-pointer items-center justify-center rounded-2xl bg-secondary text-2xl font-semibold text-foreground transition-colors active:bg-accent"
        >
          {key === "backspace" ? <Delete className="h-6 w-6" /> : key}
        </button>
      ))}
    </div>
  );
}
