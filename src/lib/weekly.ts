import "server-only";

// The one place the app talks to the send-weekly edge function. Same shape
// as push: a shared secret, and nothing here ever throws into the caller.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

export interface WeeklyResult {
  ok?: boolean;
  sent?: number;
  skipped?: Record<string, number> | string;
  errors?: { userId: string; status: number; detail: string }[];
  error?: string;
}

export async function sendWeekly(body: {
  onlyUserId?: string;
  force?: boolean;
}): Promise<WeeklyResult | null> {
  if (!PUSH_SECRET || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-weekly`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON_KEY,
        "x-push-secret": PUSH_SECRET,
      },
      body: JSON.stringify(body),
    });
    return ((await res.json().catch(() => null)) as WeeklyResult | null) ?? {
      ok: res.ok,
    };
  } catch (err) {
    console.error("sendWeekly failed", err);
    return null;
  }
}
