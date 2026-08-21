import { cn } from "@/lib/utils";
import type { CategoryMeta } from "@/lib/mock/categories";

export function CategoryPill({
  category,
  selected,
  onClick,
}: {
  category: CategoryMeta;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = category.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-secondary text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4" />
      {category.label}
    </button>
  );
}
