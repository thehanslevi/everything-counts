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
  readers: string[]; // handles; the person it is "from" comes first
  loggedAt: string; // when it was most recently logged
  isNew: boolean; // logged since this person's last email
  fromFollowed: boolean;
}

// One person's email, at most `limit` pieces. The rules:
//
//  - It goes out only when something is new: at least one piece logged since
//    `since` (their last email). No news, no email.
//  - It is never one person's reading. At least two people's logs, or
//    nothing. When one person logged everything recent, older pieces from
//    other people fill in beside it, which is why `logs` is the whole record
//    and not just the recent stretch.
//  - Nobody dominates. Pieces are dealt out a round at a time, one per
//    person, so every voice appears before anyone gets a second turn; no one
//    takes more than half.
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
  limit = 8,
): Piece[] {
  type Entry = Piece & { loggerId: string };
  const sinceTime = since.getTime();

  const byWork = new Map<string, Entry>();
  for (const log of logs) {
    if (log.user_id === recipientId) continue;
    if (hidden.has(log.user_id)) continue;
    if (exclude.has(log.work_id)) continue;

    const isFollowed = followed.has(log.user_id);
    const entry = byWork.get(log.work_id);
    if (!entry) {
      byWork.set(log.work_id, {
        workId: log.work_id,
        title: log.title,
        author: log.author,
        source: log.source,
        form: log.form,
        image: log.image,
        readers: [log.handle],
        loggedAt: log.created_at,
        isNew: new Date(log.created_at).getTime() >= sinceTime,
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
  }

  const all = [...byWork.values()];
  if (!all.some((p) => p.isNew)) return [];

  const byLogger = new Map<string, Entry[]>();
  for (const piece of all) {
    const queue = byLogger.get(piece.loggerId);
    if (queue) queue.push(piece);
    else byLogger.set(piece.loggerId, [piece]);
  }
  if (byLogger.size < 2) return [];

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

  // Deal a round at a time. First an even share each; then, if there is
  // still room, let the fuller queues continue, never past half.
  const evenShare = Math.max(1, Math.ceil(limit / queues.length));
  const half = Math.ceil(limit / 2);
  const taken = queues.map(() => 0);
  const out: Entry[] = [];
  for (const cap of [evenShare, half]) {
    let dealt = true;
    while (out.length < limit && dealt) {
      dealt = false;
      for (let i = 0; i < queues.length && out.length < limit; i++) {
        if (taken[i] < cap && taken[i] < queues[i].length) {
          out.push(queues[i][taken[i]++]);
          dealt = true;
        }
      }
    }
  }

  return out.map(({ loggerId: _loggerId, ...piece }) => piece);
}

// The distinct people an email is "from", in the order they first appear.
export function voices(pieces: Piece[]): string[] {
  return [...new Set(pieces.map((p) => p.readers[0]))];
}
