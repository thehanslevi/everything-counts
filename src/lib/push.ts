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
}

// Deliver one push. Swallows every failure.
export async function notify(n: Notification): Promise<void> {
  if (!PUSH_SECRET || !SUPABASE_URL || !ANON_KEY || !n.recipientUserId) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON_KEY,
        "x-push-secret": PUSH_SECRET,
      },
      body: JSON.stringify(n),
    });
  } catch (err) {
    console.error("notify failed", err);
  }
}

// Someone you follow logged a piece → push it to every follower. Volume is
// tiny at present; if follower counts grow, batch this into one edge call.
export async function notifyNewLog(log: {
  userId: string;
  title: string;
  workId: string;
}): Promise<void> {
  if (!PUSH_SECRET) return;
  const supabase = await createClient();

  const { data: me } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", log.userId)
    .maybeSingle();
  if (!me) return;

  const { data: followers } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("followee_id", log.userId);
  if (!followers?.length) return;

  await Promise.all(
    followers.map((f) =>
      notify({
        recipientUserId: f.follower_id,
        title: `@${me.handle} logged something`,
        body: log.title,
        url: `/work/${log.workId}`,
      }),
    ),
  );
}
