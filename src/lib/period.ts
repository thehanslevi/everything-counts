import type { Log } from "@/lib/data/types";

// A stretch of someone's record: one month ("2026-10") or one year ("2026").
// Boundaries are UTC, matching how log dates are stored and shown.

export interface Period {
  kind: "month" | "year";
  key: string; // the URL form: "2026-10" or "2026"
  title: string; // "October" or "2026"
  yearLabel: string | null; // "2026" for a month, null for a year
  label: string; // "October 2026" or "2026"
  start: Date;
  end: Date;
  prevKey: string;
  nextKey: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

export function parsePeriod(raw: string): Period | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  if (year < 2020 || year > 2100) return null;

  if (!m[2]) {
    return {
      kind: "year",
      key: String(year),
      title: String(year),
      yearLabel: null,
      label: String(year),
      start: new Date(Date.UTC(year, 0, 1)),
      end: new Date(Date.UTC(year + 1, 0, 1)),
      prevKey: String(year - 1),
      nextKey: String(year + 1),
    };
  }

  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  return {
    kind: "month",
    key: `${year}-${pad(month)}`,
    title: MONTHS[month - 1],
    yearLabel: String(year),
    label: `${MONTHS[month - 1]} ${year}`,
    start,
    end: new Date(Date.UTC(year, month, 1)),
    prevKey: monthKey(new Date(Date.UTC(year, month - 2, 1))),
    nextKey: monthKey(new Date(Date.UTC(year, month, 1))),
  };
}

export function logsIn(logs: Log[], period: Period): Log[] {
  const from = period.start.getTime();
  const to = period.end.getTime();
  return logs.filter((log) => {
    const t = new Date(log.createdAt).getTime();
    return t >= from && t < to;
  });
}
