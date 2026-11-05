// send-weekly: the weekly email. For each person who has it on, gather what
// was logged since their last one, and if there is anything, send it.
//
// Trusted server-to-server endpoint, like send-push: called only by the
// Next.js cron route and the founder's test button, which pass the shared
// secret in `x-push-secret`. Deployed with verify_jwt = false for that reason.
//
// It runs here rather than in the Next app because it needs two things only
// the service role has: everyone's email address, and everyone's email
// setting (each person can read only their own).
//
// Rules, in one place:
//  - on by default; `email_prefs.weekly = false` turns it off;
//  - one email covers everything logged since that person's last one. The
//    first reaches back up to 60 days, so it works as a catch-up;
//  - nothing new for someone means no email for them, not an empty one;
//  - it will not send to the same person twice inside six days;
//  - never their own logs, nothing they already logged, nothing across a block.
//
// With no RESEND_API_KEY configured it answers ok:{skipped} and sends
// nothing, so it is safe to deploy before the mail provider exists.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { type DigestLog, pickPieces } from "./digest.ts";
import { renderWeekly } from "./render.ts";

const PUSH_SECRET = Deno.env.get("PUSH_SECRET");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const MAIL_FROM = Deno.env.get("MAIL_FROM") ??
  "Everything Counts <weekly@everythingcountsapp.com>";
// A postal address for the footer, if one is set. US law expects one on
// promotional mail; left out until the owner provides it.
const MAIL_ADDRESS = Deno.env.get("MAIL_ADDRESS") ?? "";
const SITE = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://everythingcountsapp.com")
  .replace(/\/+$/, "");

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DAY = 24 * 60 * 60 * 1000;
const CATCH_UP_DAYS = 60;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }

  // onlyUserId + force is the founder's "send me one now": that person only,
  // ignoring the off switch and the six-day gap, covering the catch-up
  // window, and leaving their real schedule untouched.
  let body: { onlyUserId?: string; force?: boolean; dryRun?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }
  const force = Boolean(body.force && body.onlyUserId);
  const dryRun = Boolean(body.dryRun);

  if (!RESEND_API_KEY && !dryRun) {
    return json({ ok: true, skipped: "resend-not-configured" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const earliest = new Date(now.getTime() - CATCH_UP_DAYS * DAY);

  let prefsQuery = supabase
    .from("email_prefs")
    .select("user_id, weekly, token, last_weekly_sent");
  if (body.onlyUserId) prefsQuery = prefsQuery.eq("user_id", body.onlyUserId);
  if (!force) prefsQuery = prefsQuery.eq("weekly", true);

  const [prefsRes, logsRes, readRes, followsRes, blocksRes, profilesRes, usersRes] =
    await Promise.all([
      prefsQuery,
      supabase
        .from("logs")
        .select(
          "user_id, work_id, title, author, source, form, created_at, profiles!logs_user_id_fkey(handle)",
        )
        .eq("shared", true)
        .gte("created_at", earliest.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000),
      supabase.from("logs").select("user_id, work_id").limit(20000),
      supabase.from("follows").select("follower_id, followee_id").limit(20000),
      supabase.from("blocks").select("blocker_id, blocked_id").limit(20000),
      supabase.from("profiles").select("id, handle").limit(5000),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

  const firstError = [prefsRes, logsRes, readRes, followsRes, blocksRes, profilesRes]
    .map((r) => r.error)
    .find(Boolean) ?? usersRes.error;
  if (firstError) return json({ ok: false, error: firstError.message }, 500);

  const logs: DigestLog[] = ((logsRes.data ?? []) as unknown as Array<
    Omit<DigestLog, "handle"> & { profiles: { handle: string } | null }
  >).flatMap((row) =>
    row.profiles ? [{ ...row, handle: row.profiles.handle }] : []
  );

  const emailOf = new Map(
    (usersRes.data?.users ?? []).flatMap((u) =>
      u.email ? [[u.id, u.email] as const] : []
    ),
  );
  const handleOf = new Map(
    (profilesRes.data ?? []).map((p) => [p.id as string, p.handle as string]),
  );

  const tally: Record<string, number> = {};
  const count = (reason: string) => {
    tally[reason] = (tally[reason] ?? 0) + 1;
  };
  const errors: { userId: string; status: number; detail: string }[] = [];
  let sent = 0;
  let preview: { subject: string; pieces: number; html?: string } | undefined;

  for (const pref of prefsRes.data ?? []) {
    const userId = pref.user_id as string;
    const email = emailOf.get(userId);
    const handle = handleOf.get(userId);
    if (!email || !handle) {
      count("no-address");
      continue;
    }

    const last = pref.last_weekly_sent
      ? new Date(`${pref.last_weekly_sent}T00:00:00Z`)
      : null;
    if (!force && last && now.getTime() - last.getTime() < 6 * DAY) {
      count("already-sent");
      continue;
    }
    // Everything since their last email; the first time (or a test), the
    // catch-up window.
    const since = !force && last && last > earliest ? last : earliest;

    const followed = new Set(
      (followsRes.data ?? [])
        .filter((f) => f.follower_id === userId)
        .map((f) => f.followee_id as string),
    );
    const hidden = new Set(
      (blocksRes.data ?? []).flatMap((b) =>
        b.blocker_id === userId
          ? [b.blocked_id as string]
          : b.blocked_id === userId
          ? [b.blocker_id as string]
          : []
      ),
    );
    const alreadyRead = new Set(
      (readRes.data ?? [])
        .filter((l) => l.user_id === userId)
        .map((l) => l.work_id as string),
    );

    const pieces = pickPieces(
      userId,
      logs.filter((l) => new Date(l.created_at) >= since),
      followed,
      hidden,
      alreadyRead,
    );
    if (pieces.length === 0) {
      count("nothing-new");
      continue;
    }

    const { subject, html, text } = renderWeekly({
      pieces,
      site: SITE,
      unsubscribeUrl: `${SITE}/unsubscribe?t=${pref.token}`,
      profileUrl: `${SITE}/u/${handle}`,
      postalAddress: MAIL_ADDRESS,
      since,
      now,
    });

    if (dryRun) {
      count("would-send");
      if (body.onlyUserId) preview = { subject, pieces: pieces.length, html };
      continue;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [email],
        subject,
        html,
        text,
        // One-tap unsubscribe in the mail client's own UI; large inbox
        // providers expect both headers on bulk mail.
        headers: {
          "List-Unsubscribe": `<${SITE}/api/unsubscribe?t=${pref.token}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });

    if (res.ok) {
      sent++;
      if (!force) {
        await supabase
          .from("email_prefs")
          .update({ last_weekly_sent: today })
          .eq("user_id", userId);
      }
    } else {
      const detail = (await res.text()).slice(0, 300);
      errors.push({ userId, status: res.status, detail });
      console.error("Resend error", res.status, detail);
    }
    // Stay under the provider's per-second limit.
    await sleep(600);
  }

  return json({ ok: errors.length === 0, sent, skipped: tally, errors, preview });
});
