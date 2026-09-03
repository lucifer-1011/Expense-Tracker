/**
 * Formats the whole-rupee part only: currency symbol plus en-IN grouping
 * (lakh/crore), no fraction digits. The paise are appended separately below.
 */
const wholeRupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Converts integer paise to a display rupee amount. Never persist this value -- paise stays the source of truth. */
export function paiseToRupees(amountPaise: number): number {
  return amountPaise / 100;
}

/**
 * Renders integer paise as INR with exactly two decimals, always.
 *
 * Two decimals is not cosmetic here, it is the only lossless option: a share
 * of 24950 paise IS Rs 249.50, and this used to default to
 * maximumFractionDigits: 0, which rendered it "Rs 250" -- so an equal split
 * of Rs 499 read as Rs 250 + Rs 250 (Rs 501) on screen while the database
 * held the exact, correct 24950 + 24950. The stored value was never wrong;
 * the formatter was hiding half a rupee per person.
 *
 * The rupee and paise parts are split with integer arithmetic (trunc and %)
 * rather than dividing by 100 and letting Intl round a float, so no
 * intermediate double can ever shift a paisa. Intl only ever sees an
 * integer.
 */
export function formatPaise(amountPaise: number): string {
  const sign = amountPaise < 0 ? "-" : "";
  const absolutePaise = Math.abs(amountPaise);
  const rupees = Math.trunc(absolutePaise / 100);
  const paise = absolutePaise % 100;
  return `${sign}${wholeRupeeFormatter.format(rupees)}.${String(paise).padStart(2, "0")}`;
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
