import "server-only";

// The one place the app talks to the send-note edge function, the email
// half of the founder's notes (the welcome to newcomers and the thank-you
// to people who have logged). Same shape as weekly.ts and
// catalog.ts: a shared secret, and nothing here ever throws into the
// caller. The mail provider's key never comes near the app; only the
// function holds it.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

// The function takes at most this many people per call (MAX_RECIPIENTS in
// supabase/functions/send-note/input.ts); longer lists go in batches.
const BATCH = 50;

// Who a note is for; the same names as Audience in
// supabase/functions/send-note/input.ts.
export type NoteAudience = "newcomers" | "loggers";

export interface NoteEmail {
  userIds: string[];
  body: string; // the note as typed
  from: { name: string; handle: string };
  test?: boolean; // to the sender's own inbox only; userIds is [their id]
  audience: NoteAudience; // picks the subject and who a real send may reach
}

export interface NoteResult {
  ok: boolean;
  sent: number;
  skipped: number;
  failed: number;
  skippedBy: Record<string, number>;
  errors: { status: number; reason: string; detail: string }[];
  // Set when the email didn't go at all (or stopped part way): why, as a
  // short code or the function's own words.
  error?: string;
}

interface FunctionAnswer {
  ok?: boolean;
  sent?: number;
  skipped?: number;
  failed?: number;
  skippedBy?: Record<string, number>;
  errors?: { status: number; reason: string; detail: string }[];
  error?: string;
  // The audience the function used. A function deployed before there were
  // two audiences leaves it out and treats every note as the welcome.
  audience?: NoteAudience;
}

const empty = (): NoteResult => ({
  ok: true,
  sent: 0,
  skipped: 0,
  failed: 0,
  skippedBy: {},
  errors: [],
});

async function callOnce(body: NoteEmail): Promise<FunctionAnswer> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-note`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON_KEY!,
        "x-push-secret": PUSH_SECRET!,
      },
      body: JSON.stringify(body),
    });
    // Not deployed yet: the gateway answers 404 before the function runs.
    if (res.status === 404) return { ok: false, error: "not-deployed" };
    const answer = (await res.json().catch(() => null)) as FunctionAnswer | null;
    if (!res.ok) {
      return { ...answer, ok: false, error: answer?.error ?? `status-${res.status}` };
    }
    return answer ?? { ok: false, error: "no-answer" };
  } catch (err) {
    console.error("sendNoteEmail failed", err);
    return { ok: false, error: "no-answer" };
  }
}

// Email the note to everyone in userIds, a batch at a time, and add up what
// happened. Stops at the first batch that fails outright; what was sent
// before it still counts.
export async function sendNoteEmail(note: NoteEmail): Promise<NoteResult> {
  const total = empty();
  if (!PUSH_SECRET || !SUPABASE_URL || !ANON_KEY) {
    return { ...total, ok: false, error: "not-configured" };
  }
  for (let i = 0; i < note.userIds.length; i += BATCH) {
    const answer = await callOnce({ ...note, userIds: note.userIds.slice(i, i + BATCH) });
    // A function older than this app ignores the audience and would have
    // skipped every logger as "has-logged". That is a stale deploy, not
    // people logging, so it counts as the email not going and the note
    // stays in the box.
    if (!answer.error && note.audience !== "newcomers" && answer.audience !== note.audience) {
      answer.error = "send-note-needs-redeploy";
    }
    total.sent += answer.sent ?? 0;
    total.skipped += answer.skipped ?? 0;
    total.failed += answer.failed ?? 0;
    for (const [reason, n] of Object.entries(answer.skippedBy ?? {})) {
      total.skippedBy[reason] = (total.skippedBy[reason] ?? 0) + n;
    }
    total.errors.push(...(answer.errors ?? []));
    if (answer.error) return { ...total, ok: false, error: answer.error };
    if (answer.ok === false) total.ok = false;
  }
  return total;
}

// True when some or all of the email didn't go. The page then keeps the
// note in the box and shows the outcome as a warning, not as done.
export function noteEmailFell(email: NoteResult): boolean {
  return Boolean(email.error) || email.failed > 0;
}

// ---------------------------------------------------------------------------
// COPY: DRAFTS, NOT YET APPROVED.
// What the notifications page says after the note goes, or doesn't. Only
// the founder sees these.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Why someone on the list wasn't emailed, by the function's reason codes.
const SKIP_WORDS: Record<string, (n: number) => string> = {
  "email-off": (n) => `${n} turned email off`,
  "has-logged": (n) => `${n} logged in the meantime`,
  "no-log": (n) => `${n} with no logs now`,
  "no-address": (n) => `${n} with no address`,
  "lookup-failed": (n) => `${n} whose address couldn't be read`,
  unconfirmed: (n) => `${plural(n, "address", "addresses")} not confirmed`,
  "no-settings": (n) => `${n} with no email settings`,
  "no-profile": (n) => `${n} with no profile`,
  sender: (n) => `${n} is you`,
};

const skipText = (reason: string, n: number) =>
  (SKIP_WORDS[reason] ?? ((k) => `${k} skipped (${reason})`))(n);

// What the function says when it refuses the request itself (400). The
// action checks the note before it calls, so these point at a bug.
const REFUSALS = new Set([
  "bad-body",
  "bad-test",
  "bad-audience",
  "no-recipients",
  "bad-recipient",
  "too-many-recipients",
  "empty-note",
  "note-too-long",
  "bad-sender",
  "wrong-sender",
  "unknown-sender",
]);

// Why the email didn't go at all, by the codes above and the function's.
function whyNot(error: string): string {
  switch (error) {
    case "not-deployed":
      return "the send-note function isn't deployed";
    case "not-configured":
      return "PUSH_SECRET or the Supabase address is missing here";
    case "resend-not-configured":
      return "the mail provider isn't set up (no RESEND_API_KEY)";
    case "no-answer":
      return "the email function didn't answer";
    case "unauthorized":
      return "the email function refused the secret";
    case "test-goes-to-sender-only":
      return "a test goes only to your own account";
    // The gateway's own 401, before the function runs: it was deployed
    // with JWT checks on.
    case "status-401":
      return "the email function wants a sign-in (deploy it with verify_jwt off)";
    default:
      if (REFUSALS.has(error)) return `the email function refused the request (${error})`;
      if (/^status-\d+$/.test(error)) return `the email function failed (${error.slice(7)})`;
      return error;
  }
}

// The provider's first refusal, in its own words.
function firstRefusal(result: NoteResult): string {
  const first = result.errors[0];
  // Status 0 is the function's own: Resend couldn't be reached at all.
  return first ? ` (${first.status || first.reason}: ${first.detail})` : "";
}

// After the real send: phones, inboxes, and anything that didn't go.
// `phones` is null when the push didn't go at all; the caller says why, and
// this leaves the phones out rather than saying "0 phones".
export function noteSentMessage(phones: number | null, email: NoteResult): string {
  const inboxes = email.sent > 0 || !email.error;
  const parts: string[] = [];
  if (phones === null) {
    if (inboxes) parts.push(`Sent to ${plural(email.sent, "inbox", "inboxes")}.`);
  } else {
    parts.push(
      inboxes
        ? `Sent to ${plural(phones, "phone", "phones")} and ${plural(email.sent, "inbox", "inboxes")}.`
        : `Sent to ${plural(phones, "phone", "phones")}.`,
    );
  }
  const skips = Object.entries(email.skippedBy).map(([reason, n]) => skipText(reason, n));
  if (skips.length) parts.push(`Not emailed: ${skips.join(", ")}.`);
  if (email.failed > 0) {
    parts.push(
      `${plural(email.failed, "email", "emails")} failed${firstRefusal(email)}.`,
    );
  }
  if (email.error) {
    parts.push(
      email.sent > 0
        ? `Email stopped part way: ${whyNot(email.error)}.`
        : `Email didn't go: ${whyNot(email.error)}.`,
    );
  }
  return parts.join(" ");
}

// After "Email me a test".
export function noteTestMessage(email: NoteResult): { ok: boolean; text: string } {
  if (email.sent > 0) return { ok: true, text: "Sent. Check your inbox." };
  if (email.error) return { ok: false, text: `Not sent: ${whyNot(email.error)}.` };
  if (email.failed > 0) {
    return { ok: false, text: `The mail provider refused it${firstRefusal(email)}.` };
  }
  const reasons = Object.entries(email.skippedBy)
    .map(([reason, n]) => skipText(reason, n))
    .join(", ");
  return { ok: false, text: `Not sent${reasons ? ` (${reasons})` : ""}.` };
}
// ---------------------------------------------------------------------------
