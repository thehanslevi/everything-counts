// What send-note accepts, checked in one place. Pure: no Deno, no network,
// so the Node test can run it.

// One call reaches at most this many people. The app sends larger lists in
// batches (src/lib/note.ts). At the pace index.ts keeps (a lookup, the
// send and a 0.6 s pause, about a second each), 50 takes about a minute.
export const MAX_RECIPIENTS = 50;
// The same limit as the box on the notifications page (NOTE_MAX in
// src/app/actions.ts). The push carries only the note's opening.
export const MAX_NOTE = 5000;

// The one person who sends these: the founder, the same handle as
// FOUNDER_HANDLE in src/app/actions.ts and src/app/notifications/page.tsx.
// Any other sender is refused, so a test can only ever reach her inbox.
export const SENDER_HANDLE = "hrlevinson";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HANDLE = /^[a-z0-9_]{2,24}$/;

export interface NoteInput {
  userIds: string[];
  // The note as its writer typed it: line breaks kept, only the ends trimmed.
  body: string;
  from: { name: string; handle: string };
  // true: the email goes only to the sender's own inbox (see index.ts).
  test: boolean;
}

// The note exactly as typed, give or take the ends: Windows line breaks
// become plain ones and leading or trailing space goes. Everything inside
// stays, line breaks included.
export function cleanNote(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

export function parseNoteInput(raw: unknown): NoteInput | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "bad-body" };
  const input = raw as Record<string, unknown>;

  // `test` must be a real boolean when it is there. Anything else ("true",
  // 1) is refused, so a malformed test can never fall through to a send to
  // the whole list.
  if (input.test !== undefined && typeof input.test !== "boolean") {
    return { error: "bad-test" };
  }

  if (!Array.isArray(input.userIds)) return { error: "no-recipients" };
  if (!input.userIds.every((id) => typeof id === "string" && UUID.test(id))) {
    return { error: "bad-recipient" };
  }
  const userIds = [...new Set((input.userIds as string[]).map((id) => id.toLowerCase()))];
  if (userIds.length === 0) return { error: "no-recipients" };
  if (userIds.length > MAX_RECIPIENTS) return { error: "too-many-recipients" };

  if (typeof input.body !== "string") return { error: "empty-note" };
  const body = cleanNote(input.body);
  if (!body) return { error: "empty-note" };
  if (body.length > MAX_NOTE) return { error: "note-too-long" };

  const from = input.from as Record<string, unknown> | null | undefined;
  if (!from || typeof from !== "object") return { error: "bad-sender" };
  if (typeof from.handle !== "string" || !HANDLE.test(from.handle)) {
    return { error: "bad-sender" };
  }
  if (from.handle !== SENDER_HANDLE) return { error: "wrong-sender" };
  if (from.name !== undefined && typeof from.name !== "string") {
    return { error: "bad-sender" };
  }
  // One line, so it can sit in a subject header.
  const name = ((from.name as string | undefined) ?? "").replace(/\s+/g, " ").trim()
    .slice(0, 80);

  return {
    userIds,
    body,
    from: { name, handle: from.handle },
    test: input.test === true,
  };
}
