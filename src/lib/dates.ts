// Which day a log falls on depends on where its reader is. A piece logged at
// 9pm in New York was logged the next morning in UTC, and the app used to
// print that next day. Everything that prints or groups by a date goes
// through here with the reader's own time zone. Pure, and the same code on
// the server and in the browser.

// Used when a reader's zone isn't known: crawlers, and link-preview images.
export const FALLBACK_ZONE = "UTC";

// A zone name this runtime can format with ("America/New_York").
export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// One formatter per zone: building them is the slow part. With no zone, the
// runtime's own (the device's, in a browser).
const partFormatters = new Map<string, Intl.DateTimeFormat>();
const dayFormatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(
  cache: Map<string, Intl.DateTimeFormat>,
  timeZone: string | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = timeZone ?? "";
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { ...options, timeZone });
    cache.set(key, formatter);
  }
  return formatter;
}

export interface LocalDay {
  year: number;
  month: number; // 1 to 12
  day: number;
}

// The calendar day this moment falls on in a zone. Null for a bad date.
export function dayIn(
  when: string | Date,
  timeZone?: string,
): LocalDay | null {
  const date = typeof when === "string" ? new Date(when) : when;
  if (Number.isNaN(date.getTime())) return null;
  const parts = formatterFor(partFormatters, timeZone, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

export function yearIn(when: string | Date, timeZone?: string): number {
  return dayIn(when, timeZone)?.year ?? 0;
}

// "2026-09": the month a moment falls in, in the form the card pages use.
export function monthKeyIn(when: string | Date, timeZone?: string): string {
  const local = dayIn(when, timeZone);
  if (!local) return "";
  return `${local.year}-${String(local.month).padStart(2, "0")}`;
}

// "SEP 23, 2026", the way a card prints the day a piece was logged.
export function formatDay(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return formatterFor(dayFormatters, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
    .format(date)
    .toUpperCase();
}
