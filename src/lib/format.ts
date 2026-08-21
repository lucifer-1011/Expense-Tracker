const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const rupeeFormatterWithDecimals = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

/** Converts integer paise to a display rupee amount. Never persist this value -- paise stays the source of truth. */
export function paiseToRupees(amountPaise: number): number {
  return amountPaise / 100;
}

export function formatPaise(amountPaise: number, options?: { showDecimals?: boolean }): string {
  const rupees = paiseToRupees(amountPaise);
  return options?.showDecimals
    ? rupeeFormatterWithDecimals.format(rupees)
    : rupeeFormatter.format(rupees);
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

const dateFormatterWithYear = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(iso: string, options?: { withYear?: boolean }): string {
  const date = new Date(iso);
  return options?.withYear ? dateFormatterWithYear.format(date) : dateFormatter.format(date);
}

export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86_400_000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return formatDate(iso, { withYear: date.getFullYear() !== today.getFullYear() });
}
