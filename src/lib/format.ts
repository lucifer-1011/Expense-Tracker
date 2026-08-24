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

const transactionDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const transactionTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/**
 * "Aug 24, 2026 at 1:35 AM" -- the exact moment a transaction happened, never
 * a relative label. `new Date(iso)` + Intl formatting without an explicit
 * `timeZone` both resolve to the viewer's local timezone automatically, so
 * this is already correct across timezones without any manual offset math.
 */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${transactionDateFormatter.format(date)} at ${transactionTimeFormatter.format(date)}`;
}
