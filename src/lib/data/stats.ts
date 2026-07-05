import type { Form, Log } from "./types";

// The anchor metric (the spec's open question, resolved as the blended unit it
// leaned toward): pieces + estimated time. Pieces honors the act of reading
// regardless of length; time honors the investment. "You read 14 things, about
// 9 hours." Form-neutral by construction — every form contributes.
//
// Time is an estimate from typical lengths per form (we do not have word
// counts). Honest rounding, presented as "about". Adding a real word-count
// estimator later only changes ESTIMATED_MINUTES consumers.
const ESTIMATED_MINUTES: Record<Form, number> = {
  essay: 15,
  article: 8,
  chapter: 25,
  poem: 4,
  report: 30,
  "short story": 20,
  other: 10,
};

export interface ReadingStats {
  pieces: number;
  estMinutes: number;
  byForm: Partial<Record<Form, number>>;
}

export interface ProfileStats {
  allTime: ReadingStats;
  thisYear: ReadingStats;
  year: number;
}

function tally(logs: Log[]): ReadingStats {
  const byForm: Partial<Record<Form, number>> = {};
  let estMinutes = 0;
  for (const log of logs) {
    byForm[log.form] = (byForm[log.form] ?? 0) + 1;
    estMinutes += ESTIMATED_MINUTES[log.form] ?? 10;
  }
  return { pieces: logs.length, estMinutes, byForm };
}

export function computeStats(logs: Log[], now = new Date()): ProfileStats {
  const year = now.getFullYear();
  const thisYear = logs.filter(
    (log) => new Date(log.createdAt).getFullYear() === year,
  );
  return { allTime: tally(logs), thisYear: tally(thisYear), year };
}

// "About 9 hrs" / "about 1 hr" / "about 40 min" — friendly, honest rounding.
export function formatEstTime(minutes: number): string {
  if (minutes < 60) return `about ${minutes} min`;
  const hours = Math.round(minutes / 30) / 2; // nearest half hour
  const rendered = hours % 1 === 0 ? String(hours) : hours.toFixed(1);
  return `about ${rendered} ${hours === 1 ? "hr" : "hrs"}`;
}
