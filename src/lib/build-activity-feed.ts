import type { Expense, Settlement } from "@/types";

export type ActivityItem =
  | { kind: "expense"; date: string; expense: Expense }
  | { kind: "settlement"; date: string; settlement: Settlement };

/** Merges expenses and settlements into one reverse-chronological timeline. */
export function buildActivityFeed(expenses: Expense[], settlements: Settlement[]): ActivityItem[] {
  const items: ActivityItem[] = [
    ...expenses.map((expense): ActivityItem => ({ kind: "expense", date: expense.date, expense })),
    ...settlements.map((settlement): ActivityItem => ({ kind: "settlement", date: settlement.date, settlement })),
  ];

  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface ActivityGroup {
  label: string;
  items: ActivityItem[];
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

/** Groups an already-sorted feed into day buckets, in the order they first appear. */
export function groupByDay(items: ActivityItem[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];

  for (const item of items) {
    const label = dayLabel(item.date);
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.label === label) {
      lastGroup.items.push(item);
    } else {
      groups.push({ label, items: [item] });
    }
  }

  return groups;
}
