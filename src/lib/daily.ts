// One piece from the record at the top of the feed, for days when nobody
// the reader follows has logged. Without it the feed is the same screen
// until someone logs. Pure: the data layer gathers the works
// (getDailyPiece), this decides whether there is anything new and which
// piece the day gets.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// The day turns at 09:00 UTC: about 4am in New York and 1am in Los Angeles,
// so the piece changes overnight for readers there, not at dinner.
const DAY_TURNS_AT = 9 * HOUR;

export function dayNumber(now: Date): number {
  return Math.floor((now.getTime() - DAY_TURNS_AT) / DAY);
}

// True when the list holds nothing from someone else in the last 24 hours.
// The reader's own logs don't count: they are not news to them.
export function nothingNew(
  items: { userId: string; createdAt: string }[],
  viewerId: string,
  now: Date,
): boolean {
  const since = now.getTime() - DAY;
  return !items.some(
    (item) =>
      item.userId !== viewerId && new Date(item.createdAt).getTime() >= since,
  );
}

// FNV-1a. A fixed, even scatter of ids, so the rotation doesn't run through
// one person's logs in a row the way the order they were logged in would.
function scatter(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// The piece for this day, out of the ones this reader could be shown. The
// ids are put in one fixed order and the day steps through it, so the piece
// changes every day and each one comes up once before any repeats.
export function pickDaily(workIds: string[], day: number): string | null {
  const ordered = [...new Set(workIds)].sort(
    (a, b) => scatter(a) - scatter(b) || a.localeCompare(b),
  );
  if (ordered.length === 0) return null;
  const index = ((day % ordered.length) + ordered.length) % ordered.length;
  return ordered[index];
}
