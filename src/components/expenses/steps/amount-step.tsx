"use client";

import { Button } from "@/components/ui/button";
import { NumericKeypad } from "@/components/shared/numeric-keypad";

function formatTypedAmount(raw: string): string {
  if (!raw) return "0";
  const [whole, decimal] = raw.split(".");
  const formattedWhole = whole === "" ? "0" : Number(whole).toLocaleString("en-IN");
  return decimal !== undefined ? `${formattedWhole}.${decimal}` : formattedWhole;
}

export function AmountStep({
  value,
  onChange,
  onContinue,
}: {
  value: string;
  onChange: (next: string) => void;
  onContinue: () => void;
}) {
  const canContinue = parseFloat(value || "0") > 0;

  function handleKeyPress(key: string) {
    if (key === "backspace") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === ".") {
      if (value.includes(".")) return;
      onChange(value === "" ? "0." : `${value}.`);
      return;
    }
    if (value.includes(".")) {
      const decimalDigits = value.split(".")[1] ?? "";
      if (decimalDigits.length >= 2) return;
    } else if (value.length >= 9) {
      return;
    }
    onChange(value === "0" ? key : value + key);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5">
        <p className="text-sm font-medium text-muted-foreground">How much?</p>
        <p className="text-5xl font-extrabold tracking-tight tabular-nums text-foreground">
          ₹{formatTypedAmount(value)}
        </p>
      </div>

      <div className="space-y-6 px-5 pb-4">
        <NumericKeypad onKeyPress={handleKeyPress} />
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
