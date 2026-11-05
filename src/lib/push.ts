import "server-only";
import { createClient } from "@/lib/supabase/server";

// Push fan-out. This module is the only place the app talks to the send-push
// edge function. Everything here is best-effort: a push must never block or
// break the action that triggered it, and the whole thing no-ops until
// PUSH_SECRET is configured (so nothing changes before Apple is wired up).

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

export interface Notification {
  recipientUserId: string;
  title: string;
  body?: string;
  /** In-app path to open on tap, e.g. "/u/handle". */
  url?: string;
  /** Ask the function to report secret shapes (never values). Test button only. */
  diag?: boolean;
}

// Deliver one push. Swallows every failure. Returns the edge function's
// summary ({ ok, sent }) when it answered, null otherwise — callers that
// care (the test button) can report it; everything else ignores it.
export async function notify(n: Notification): Promise<{
  ok?: boolean;
  sent?: number;
  error?: string;
  reasons?: string[];
  diag?: Record<string, string>;
} | null> {
  if (!PUSH_SECRET || !SUPABASE_URL || !ANON_KEY || !n.recipientUserId) {
    return null;
  }
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON_KEY,
        "x-push-secret": PUSH_SECRET,
      },
      body: JSON.stringify(n),
    });
    return (await res.json().catch(() => null)) ?? { ok: res.ok };
  } catch (err) {
    console.error("notify failed", err);
    return null;
  }
}

// A new log pushes only to people with a stake in that piece: anyone who has
// already logged the same work. Followers see it in their feed and bell, but
// it doesn't buzz their phone — a push is for "someone read what you
// read," not "someone you follow did something."
export async function notifyNewLog(log: {
  userId: string;
  title: string;
  workId: string;
  /** Skip this person: they are told separately (they sent the piece). */
  excludeUserId?: string | null;
}): Promise<void> {
  if (!PUSH_SECRET) return;
  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", log.userId)
    .maybeSingle();
  if (!me) return;

  const { data: coReaders } = await supabase
    .from("logs")
    .select("user_id")
    .eq("work_id", log.workId)
    .eq("shared", true)
    .neq("user_id", log.userId);
  const recipients = [
    ...new Set((coReaders ?? []).map((r) => r.user_id)),
  ].filter((id) => id !== log.excludeUserId);
  if (recipients.length === 0) return;

  await Promise.all(
    recipients.map((id) =>
      notify({
        recipientUserId: id,
        title: `@${me.handle} also read “${log.title}”`,
        url: `/work/${log.workId}`,
      }),
    ),
  );
}
