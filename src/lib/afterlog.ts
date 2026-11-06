// The line under a freshly saved log: one true thing about it, chosen from
// what the record already knows. Pure: the data layer gathers the facts
// (getAfterLogFacts), this picks the sentence.

export interface AfterLogFacts {
  alsoReadBy: string[]; // handles of others who logged the piece; followed first
  total: number; // the reader's logs, this one included
  thisMonth: number; // of those, logged this calendar month where the reader is
  fromSource: number; // of those, from this piece's publication
}

const ORDINALS = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
];

// "third", "tenth", then "11th", "22nd", "103rd".
export function ordinal(n: number): string {
  if (n >= 1 && n <= 10) return ORDINALS[n];
  const tens = n % 100;
  const suffix =
    tens >= 11 && tens <= 13
      ? "th"
      : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

function readers(handles: string[]): string {
  const names = handles.map((h) => `@${h}`);
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  const rest = names.length - 2;
  return `${names[0]}, ${names[1]} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

// In order: someone else read it; it is their first piece; it adds to a
// publication they keep reading; otherwise, where it falls in their month.
export function afterLogLine(
  facts: AfterLogFacts,
  source: string | null,
): string {
  if (facts.alsoReadBy.length > 0) {
    return `${readers(facts.alsoReadBy)} read this too`;
  }
  if (facts.total <= 1) return "Your first piece";
  if (source && facts.fromSource >= 2) {
    return `Your ${ordinal(facts.fromSource)} from ${source}`;
  }
  return `Your ${ordinal(Math.max(facts.thisMonth, 1))} this month`;
}

// The start of the current month where the reader is, as a moment in time.
// `tzOffsetMinutes` is what their browser's Date.getTimezoneOffset() reports
// (minutes behind UTC; New York in winter is 300). Without it a log saved at
// 9pm on the 31st in New York would count toward next month.
export function localMonthStart(now: Date, tzOffsetMinutes: number): Date {
  const offset =
    Number.isFinite(tzOffsetMinutes) && Math.abs(tzOffsetMinutes) <= 14 * 60
      ? Math.trunc(tzOffsetMinutes)
      : 0;
  const local = new Date(now.getTime() - offset * 60_000);
  const startAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1);
  return new Date(startAsUtc + offset * 60_000);
}
