// send-note: the email half of the founder's note to newcomers. Takes a
// short note and a list of people, and emails each of them the note on its
// own, with one button to the first-log page. (The push half goes through
// send-push; the app does both from one button, see sendNoteToNewcomers.)
//
// Trusted server-to-server endpoint, like send-push and send-weekly: called
// only by the Next.js app, which passes the shared secret in
// `x-push-secret`. Deployed with verify_jwt = false for that reason; the
// secret is the gate. It runs here rather than in the app because it needs
// what only the service role has (everyone's address, everyone's email
// setting) and the mail provider's key, which lives only in these secrets.
//
// Input: { userIds: string[] (at most 50), body: string (at most 240
// characters, sent as typed), from: { name, handle }, test?: boolean }.
// Output: { ok, sent, skipped, failed, skippedBy, errors }. Never an address,
// here or in the logs.
//
// Who gets it, in order:
//  - not the sender (a real send);
//  - only people with no log at all, private ones included (a real send).
//    The app's list is read under the founder's own access, which can't see
//    other people's private logs; the service role can, so this is where it
//    is checked. The email says they haven't logged, and it has to be true;
//  - only people with email settings, since that row holds the token the
//    "Stop email from Everything Counts" link needs. No way to stop it, no email;
//  - not anyone whose `email_prefs.weekly` is false. That switch is the only
//    email setting a person has, and turning it off means they don't want
//    mail from the app. This is mail from the app;
//  - only a confirmed address (a typo'd one bounces, and bounces cost the
//    domain its standing with inbox providers).
// Each person gets their own email, one at a time, never a shared To or Bcc.
//
// The sender is pinned (SENDER_HANDLE in input.ts), not taken on the
// caller's word: any other `from.handle` is refused (400), real send or
// test, so the shared secret alone can't send as anyone else.
//
// test: true sends to the sender's own inbox and nowhere else. The caller
// passes the sender's own user id as the one id; the function looks the
// pinned sender up and refuses (400) unless that id is hers. A slip in the
// caller (the whole list with test on) fails closed rather than reaching
// anyone. A test ignores the sender's own off switch and the has-logged
// rule (the founder has logged), and its subject starts "Test:".
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { parseNoteInput, SENDER_HANDLE } from "./input.ts";
import { renderNote } from "./render.ts";

const PUSH_SECRET = Deno.env.get("PUSH_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// NOTE_MAIL_FROM can give these their own sender later; until then they go
// from the same verified address as the weekly email.
const MAIL_FROM = Deno.env.get("NOTE_MAIL_FROM") ?? Deno.env.get("MAIL_FROM") ??
  "Everything Counts <weekly@everythingcountsapp.com>";
// The weekly email's optional postal address line. Unset by the owner's
// decision; kept here so the two footers can't drift apart.
const MAIL_ADDRESS = Deno.env.get("MAIL_ADDRESS") ?? "";
// The header picture and the unsubscribe link come from the same site as
// the weekly email's, so the link is the very one that email uses.
const SITE = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://everythingcountsapp.com")
  .replace(/\/+$/, "");
// Replies: unset, there is no Reply-To and replies go to the From address
// (which receives no mail). Set NOTE_REPLY_TO to an address that is read
// and replies land there. The founder's call; no address sits in the repo.
const REPLY_TO = Deno.env.get("NOTE_REPLY_TO") ?? "";
// The button goes to the address people signed up on: their sign-in (a
// cookie) lives there, and the app and the auth redirects still use it.
const FIRST_LOG_URL = "https://everything-counts.vercel.app/log?new=1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Resend allows a few requests a second; one every 600 ms stays under it,
// as the weekly email does.
const PACE_MS = 600;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Mail provider messages can quote the recipient. Nothing that looks like
// an address leaves this function.
const redact = (value: string) =>
  value.replace(/[^\s@<>"'(),;:]+@[^\s@<>"'(),;:]+/g, "[address]");

async function shortHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

type Outgoing = {
  to: string;
  subject: string;
  html: string;
  text: string;
  token: string;
  idempotencyKey?: string;
};
type SendResult = { ok: true } | { ok: false; status: number; name: string; detail: string };

// One email to one person. A 429 (too fast) waits as long as Resend asks,
// up to five seconds, and tries once more. Never throws: a network failure
// comes back as status 0, so it counts as one failure and the run goes on
// to the next person with its counts intact.
async function sendOne(message: Outgoing): Promise<SendResult> {
  try {
    return await sendOneOrThrow(message);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      name: "network",
      detail: redact(err instanceof Error ? err.message : String(err)).slice(0, 300),
    };
  }
}

async function sendOneOrThrow(message: Outgoing): Promise<SendResult> {
  const request = () =>
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
        // The same note to the same person goes once per day, even if the
        // button is pressed again after a slow answer.
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [message.to],
        ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
        subject: message.subject,
        html: message.html,
        text: message.text,
        // One-tap unsubscribe in the mail client's own UI, as on the weekly
        // email: the same token, so it turns off the same switch.
        headers: {
          "List-Unsubscribe": `<${SITE}/api/unsubscribe?t=${message.token}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

  let res = await request();
  if (res.status === 429) {
    const wait = Number(res.headers.get("retry-after"));
    await res.body?.cancel();
    await sleep(Math.min(Math.max(Number.isFinite(wait) ? wait : 1, 1), 5) * 1000);
    res = await request();
  }
  if (res.ok) {
    await res.body?.cancel();
    return { ok: true };
  }
  const raw = (await res.text()).slice(0, 500);
  let name = "unknown";
  let detail = raw;
  try {
    const parsed = JSON.parse(raw) as { name?: string; message?: string };
    if (parsed.name) name = parsed.name;
    if (parsed.message) detail = parsed.message;
  } catch {
    // not JSON (or cut short): keep it as it came
  }
  return { ok: false, status: res.status, name, detail: redact(detail).slice(0, 300) };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ ok: false, error: "bad-body" }, 400);
  }
  const input = parseNoteInput(raw);
  // This also refuses any sender but SENDER_HANDLE ("wrong-sender").
  if ("error" in input) return json({ ok: false, error: input.error }, 400);

  if (!RESEND_API_KEY) {
    return json({ ok: false, error: "resend-not-configured" }, 503);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: sender, error: senderError } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", SENDER_HANDLE)
    .maybeSingle();
  if (senderError) return json({ ok: false, error: senderError.message }, 500);
  if (!sender) return json({ ok: false, error: "unknown-sender" }, 400);
  const senderId = sender.id as string;
  if (input.test && (input.userIds.length !== 1 || input.userIds[0] !== senderId)) {
    return json({ ok: false, error: "test-goes-to-sender-only" }, 400);
  }

  const ids = input.userIds;
  const [profilesRes, prefsRes] = await Promise.all([
    // Each person's profile, with at most one of their logs: any log at
    // all, private ones included, means they have logged.
    supabase
      .from("profiles")
      .select("id, logs(user_id)")
      .in("id", ids)
      .limit(1, { referencedTable: "logs" }),
    supabase.from("email_prefs").select("user_id, weekly, token").in("user_id", ids),
  ]);
  const lookupError = profilesRes.error ?? prefsRes.error;
  if (lookupError) return json({ ok: false, error: lookupError.message }, 500);

  const hasLogged = new Map(
    ((profilesRes.data ?? []) as unknown as { id: string; logs: unknown[] | null }[])
      .map((p) => [p.id, (p.logs ?? []).length > 0] as const),
  );
  const prefOf = new Map(
    ((prefsRes.data ?? []) as { user_id: string; weekly: boolean; token: string | null }[])
      .map((p) => [p.user_id, p] as const),
  );

  // Every person gets the same note, so the key for "this note, this
  // person" needs only the note's hash beside their id.
  const noteKey = input.test ? "" : await shortHash(input.body);

  const skippedBy: Record<string, number> = {};
  const skip = (reason: string) => {
    skippedBy[reason] = (skippedBy[reason] ?? 0) + 1;
  };
  const errors: { status: number; reason: string; detail: string }[] = [];
  let sent = 0;
  let failed = 0;

  for (const id of ids) {
    if (!input.test && id === senderId) {
      skip("sender");
      continue;
    }
    if (!hasLogged.has(id)) {
      skip("no-profile");
      continue;
    }
    if (!input.test && hasLogged.get(id)) {
      skip("has-logged");
      continue;
    }
    const pref = prefOf.get(id);
    if (!pref?.token) {
      skip("no-settings");
      continue;
    }
    // They turned email off (the weekly switch is their only email
    // setting), so they get none of it, this included.
    if (!input.test && pref.weekly === false) {
      skip("email-off");
      continue;
    }
    const { data: found, error: userError } = await supabase.auth.admin.getUserById(id);
    if (userError) {
      skip("lookup-failed");
      continue;
    }
    const user = found.user;
    if (!user?.email) {
      skip("no-address");
      continue;
    }
    if (!user.email_confirmed_at) {
      skip("unconfirmed");
      continue;
    }

    const { subject, html, text } = renderNote({
      note: input.body,
      from: input.from,
      site: SITE,
      mastheadUrl: `${SITE}/email/masthead.png`,
      firstLogUrl: FIRST_LOG_URL,
      unsubscribeUrl: `${SITE}/unsubscribe?t=${pref.token}`,
      postalAddress: MAIL_ADDRESS,
      test: input.test,
    });

    const result = await sendOne({
      to: user.email,
      subject,
      html,
      text,
      token: pref.token,
      // A test can be sent again and again; a real one once a day.
      idempotencyKey: input.test ? undefined : `send-note/${id}/${noteKey}`,
    });
    if (result.ok) {
      sent++;
    } else {
      failed++;
      if (errors.length < 5) {
        errors.push({ status: result.status, reason: result.name, detail: result.detail });
      }
      console.error("send-note: Resend refused one", result.status, result.name);
    }
    await sleep(PACE_MS);
  }

  const skipped = Object.values(skippedBy).reduce((sum, n) => sum + n, 0);
  return json({ ok: failed === 0, sent, skipped, failed, skippedBy, errors });
});
