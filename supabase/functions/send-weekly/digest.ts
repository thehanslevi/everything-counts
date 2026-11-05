// Choosing one person's pieces for the week. Pure: no Deno, no database, so
// it can be tested anywhere.

export interface DigestLog {
  user_id: string;
  work_id: string;
  title: string;
  author: string | null;
  source: string | null;
  form: string;
  created_at: string;
  handle: string; // who logged it
}

export interface Piece {
  workId: string;
  title: string;
  author: string | null;
  source: string | null;
  form: string;
  readers: string[]; // handles; people the recipient follows come first
  fromFollowed: boolean;
}

// The week's pieces for one person, at most `limit`:
//  - what the people they follow logged comes first, then the rest of the
//    network; within each, pieces more people logged, then the newest;
//  - one entry per piece, however many people logged it;
//  - never their own logs, never a piece they have already logged, and
//    nothing from anyone on either side of a block.
// `logs` must be newest first.
export function pickPieces(
  recipientId: string,
  logs: DigestLog[],
  followed: Set<string>,
  hidden: Set<string>,
  alreadyRead: Set<string>,
  limit = 8,
): Piece[] {
  const byWork = new Map<string, Piece & { newest: string }>();
  for (const log of logs) {
    if (log.user_id === recipientId) continue;
    if (hidden.has(log.user_id)) continue;
    if (alreadyRead.has(log.work_id)) continue;

    const isFollowed = followed.has(log.user_id);
    const piece = byWork.get(log.work_id);
    if (!piece) {
      byWork.set(log.work_id, {
        workId: log.work_id,
        title: log.title,
        author: log.author,
        source: log.source,
        form: log.form,
        readers: [log.handle],
        fromFollowed: isFollowed,
        newest: log.created_at,
      });
      continue;
    }
    if (!piece.readers.includes(log.handle)) {
      if (isFollowed) piece.readers.unshift(log.handle);
      else piece.readers.push(log.handle);
    }
    piece.fromFollowed ||= isFollowed;
  }

  return [...byWork.values()]
    .sort(
      (a, b) =>
        Number(b.fromFollowed) - Number(a.fromFollowed) ||
        b.readers.length - a.readers.length ||
        b.newest.localeCompare(a.newest),
    )
    .slice(0, limit)
    .map(({ newest: _newest, ...piece }) => piece);
}
