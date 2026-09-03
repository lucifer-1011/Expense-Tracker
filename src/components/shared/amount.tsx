import { formatPaise } from "@/lib/format";
import { cn } from "@/lib/utils";

type AmountVariant = "default" | "positive" | "owing" | "negative" | "muted";

const VARIANT_CLASSES: Record<AmountVariant, string> = {
  default: "text-foreground",
  positive: "text-positive-muted-foreground",
  owing: "text-owing-muted-foreground",
  /** Money that left the current viewer's pocket in this specific transaction. */
  negative: "text-negative-muted-foreground",
  muted: "text-muted-foreground",
};

export function Amount({
  amountPaise,
  variant = "default",
  className,
}: {
  amountPaise: number;
  variant?: AmountVariant;
  className?: string;
}) {
  return (
    <span className={cn("tabular-nums font-semibold", VARIANT_CLASSES[variant], className)}>
      {formatPaise(amountPaise)}
    </span>
  );
}
