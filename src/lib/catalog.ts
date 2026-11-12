import "server-only";

// The one place the app talks to the catalog-ingest edge function. Same
// shape as the weekly email: a shared secret, and nothing here ever throws
// into the caller.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PUSH_SECRET = process.env.PUSH_SECRET;

export interface CatalogResult {
  ok?: boolean;
  feeds?: number;
  pieces?: number;
  byStatus?: Record<string, number>;
  problems?: { id: number; status: string }[];
  skipped?: string;
  error?: string;
}

// Refresh the catalog from the publications' feeds. Without `force`, feeds
// fetched in the last three hours are left alone.
export async function refreshCatalog(body: { force?: boolean }): Promise<CatalogResult | null> {
  if (!PUSH_SECRET || !SUPABASE_URL || !ANON_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/catalog-ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON_KEY,
        "x-push-secret": PUSH_SECRET,
      },
      body: JSON.stringify(body),
    });
    const answer = (await res.json().catch(() => null)) as CatalogResult | null;
    if (!res.ok) {
      return { ...answer, ok: false, error: answer?.error ?? `The catalog function answered ${res.status}.` };
    }
    return answer ?? { ok: true };
  } catch (err) {
    console.error("refreshCatalog failed", err);
    return null;
  }
}
