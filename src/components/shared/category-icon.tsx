import { getCategoryMeta } from "@/lib/mock/categories";
import { cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/types";

const SIZE_CLASSES = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-12 w-12" } as const;
const ICON_SIZE_CLASSES = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } as const;

export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category: ExpenseCategory;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        SIZE_CLASSES[size],
        meta.chipClassName,
        className
      )}
    >
      <Icon className={cn(ICON_SIZE_CLASSES[size], meta.iconClassName)} strokeWidth={2} />
    </div>
  );
}
