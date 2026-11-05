// Choosing one person's pieces for an email. Pure: no Deno, no database, so
// it can be tested anywhere.

export interface DigestLog {
  user_id: string;
  work_id: string;
  title: string;
  author: string | null;
  source: string | null;
  form: string;
  image: string | null;
  take: string | null;
  created_at: string;
  handle: string; // who logged it
}

export interface Piece {
  workId: string;
  title: string;
  author: string | null;
  source: string | null;
  form: string;
  image: string | null; // the piece's lead image, when a log has one
  take: string | null; // what a reader wrote about it, when one did
  takeBy: string | null; // that reader's handle
  readers: string[]; // handles; the person it is "from" comes first
  loggedAt: string; // when it was most recently logged
  isNew: boolean; // logged since this person's last email
  fromFollowed: boolean;
}

// The numbers behind "recent, and from several people".
export interface Rules {
  limit: number; // pieces in an email, at most
  perPerson: number; // pieces from any one person, at most
  minVoices: number; // different people it must draw on, or it isn't sent
  maxAgeDays: number | null; // nothing logged longer ago than this; null = no limit
}

// A real email: six pieces at most, no more than two from anyone, at least
// three people, nothing older than a month. A week that can't meet that
// sends nothing; an email of old pieces from one or two people is worse
// than no email.
export const RULES: Rules = {
  limit: 6,
  perPerson: 2,
  minVoices: 3,
  maxAgeDays: 30,
};

// The founder's test send exists to show the layout, so it takes whatever
// the record has: any age, and two people will do.
export const TEST_RULES: Rules = {
  limit: 6,
  perPerson: 2,
  minVoices: 2,
  maxAgeDays: null,
};

// One person's email. Beyond the numbers in `rules`:
//
//  - It goes out only when something is new: at least one piece logged since
//    `since` (their last email). No news, no email.
//  - Pieces are dealt a round at a time, one per person, so every voice
//    appears before anyone gets a second turn.
//  - People with something new go first, then people the recipient follows,
//    then whoever logged most recently. Each person's new pieces lead.
//  - One entry per piece, however many people logged it. Never the
//    recipient's own logs, nothing in `exclude` (what they already logged or
//    were already sent), nothing from anyone on either side of a block.
//
// `logs` must be newest first.
export function pickPieces(
  recipientId: string,
  logs: DigestLog[],
  followed: Set<string>,
  hidden: Set<string>,
  exclude: Set<string>,
  since: Date,
  now: Date,
  rules: Rules = RULES,
): Piece[] {
  type Entry = Piece & { loggerId: string };
  const sinceTime = since.getTime();
  const oldest = rules.maxAgeDays === null
    ? -Infinity
    : now.getTime() - rules.maxAgeDays * 24 * 60 * 60 * 1000;

  const byWork = new Map<string, Entry>();
  for (const log of logs) {
    if (log.user_id === recipientId) continue;
    if (hidden.has(log.user_id)) continue;
    if (exclude.has(log.work_id)) continue;
    const loggedTime = new Date(log.created_at).getTime();
    if (loggedTime < oldest) continue;

    const isFollowed = followed.has(log.user_id);
    const take = log.take?.trim() || null;
    const entry = byWork.get(log.work_id);
    if (!entry) {
      byWork.set(log.work_id, {
        workId: log.work_id,
        title: log.title,
        author: log.author,
        source: log.source,
        form: log.form,
        image: log.image,
        take,
        takeBy: take ? log.handle : null,
        readers: [log.handle],
        loggedAt: log.created_at,
        isNew: loggedTime >= sinceTime,
        fromFollowed: isFollowed,
        loggerId: log.user_id,
      });
      continue;
    }
    if (!entry.readers.includes(log.handle)) {
      // A followed reader takes the lead on a piece first seen from a stranger.
      if (isFollowed && !entry.fromFollowed) {
        entry.readers.unshift(log.handle);
        entry.loggerId = log.user_id;
      } else {
        entry.readers.push(log.handle);
      }
    }
    entry.fromFollowed ||= isFollowed;
    entry.image ??= log.image;
    if (!entry.take && take) {
      entry.take = take;
      entry.takeBy = log.handle;
    }
  }

  const all = [...byWork.values()];
  if (!all.some((p) => p.isNew)) return [];

  const byLogger = new Map<string, Entry[]>();
  for (const piece of all) {
    const queue = byLogger.get(piece.loggerId);
    if (queue) queue.push(piece);
    else byLogger.set(piece.loggerId, [piece]);
  }
  if (byLogger.size < rules.minVoices) return [];

  const newestFirst = (a: Entry, b: Entry) =>
    Number(b.isNew) - Number(a.isNew) || b.loggedAt.localeCompare(a.loggedAt);
  const queues = [...byLogger.values()]
    .map((queue) => queue.sort(newestFirst))
    .sort(
      (a, b) =>
        Number(b[0].isNew) - Number(a[0].isNew) ||
        Number(b[0].fromFollowed) - Number(a[0].fromFollowed) ||
        b[0].loggedAt.localeCompare(a[0].loggedAt),
    );

  // Deal a round at a time, one per person, until the email is full or
  // everyone has given what they are allowed.
  const taken = queues.map(() => 0);
  const out: Entry[] = [];
  let dealt = true;
  while (out.length < rules.limit && dealt) {
    dealt = false;
    for (let i = 0; i < queues.length && out.length < rules.limit; i++) {
      if (taken[i] < rules.perPerson && taken[i] < queues[i].length) {
        out.push(queues[i][taken[i]++]);
        dealt = true;
      }
    }
  }

  return out.map(({ loggerId: _loggerId, ...piece }) => piece);
}

// The distinct people an email is "from", in the order they first appear.
export function voices(pieces: Piece[]): string[] {
  return [...new Set(pieces.map((p) => p.readers[0]))];
}
