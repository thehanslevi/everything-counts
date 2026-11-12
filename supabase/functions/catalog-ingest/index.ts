// catalog-ingest: refresh the title catalog from the publications' feeds.
//
// Trusted server-to-server endpoint, like send-push and send-weekly: called
// by the Next.js cron route (/api/cron/catalog, daily) and the founder's
// "Refresh the catalog" button, which pass the shared secret in
// `x-push-secret`. Deployed with verify_jwt = false for that reason. It runs
// here, not in the Next app, because writing the catalog needs the service
// role, which the app never holds.
//
// What it does: read the active feeds from catalog_feeds, fetch the ones not
// fetched in the last three hours (all of them with `force`), turn their
// items into catalog rows (feed.ts), upsert them by work id, note each
// feed's result, and drop rows older than the catalog keeps. Polite to the
// publications: a named user agent, a few feeds at a time, conditional
// requests (ETag / Last-Modified), one fetch per feed per run.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { catalogRows, type CatalogRow, type FeedSource } from "./feed.ts";

const PUSH_SECRET = Deno.env.get("PUSH_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const USER_AGENT = "EverythingCounts/1.0 (+https://everythingcountsapp.com/support)";
const HOUR = 60 * 60 * 1000;
const KEEP_DAYS = 400; // how far back the catalog reaches
const AT_ONCE = 6; // feeds fetched in parallel
const MAX_BYTES = 5_000_000; // a feed bigger than this is cut off

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

interface FeedRow extends FeedSource {
  etag: string | null;
  last_modified: string | null;
  last_fetched_at: string | null;
}

interface FeedResult {
  id: number;
  status: string; // "ok", "unchanged", "http 403", "timeout", "error: …"
  rows: CatalogRow[];
  etag: string | null;
  lastModified: string | null;
}

async function fetchFeed(feed: FeedRow, oldest: Date): Promise<FeedResult> {
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5",
  };
  if (feed.etag) headers["if-none-match"] = feed.etag;
  if (feed.last_modified) headers["if-modified-since"] = feed.last_modified;
  const base = { id: feed.id, etag: feed.etag, lastModified: feed.last_modified, rows: [] };
  try {
    const res = await fetch(feed.url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 304) return { ...base, status: "unchanged" };
    if (!res.ok) return { ...base, status: `http ${res.status}` };
    const xml = (await res.text()).slice(0, MAX_BYTES);
    const rows = catalogRows(xml, feed, oldest);
    return {
      id: feed.id,
      status: rows.length > 0 ? "ok" : "no items",
      rows,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return {
      ...base,
      status: name === "TimeoutError" || name === "AbortError"
        ? "timeout"
        : `error: ${String(err).slice(0, 120)}`,
    };
  }
}

// Run `work` over `items`, `limit` at a time.
async function pool<T, R>(items: T[], limit: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function lane() {
    while (next < items.length) {
      const i = next++;
      out[i] = await work(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  if (!PUSH_SECRET || req.headers.get("x-push-secret") !== PUSH_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  let body: { force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: feeds, error } = await supabase
    .from("catalog_feeds")
    .select("id, url, publication, form, etag, last_modified, last_fetched_at")
    .eq("active", true);
  if (error) return json({ ok: false, error: error.message }, 500);

  const now = Date.now();
  const due = ((feeds ?? []) as FeedRow[]).filter(
    (f) =>
      body.force ||
      !f.last_fetched_at ||
      now - Date.parse(f.last_fetched_at) > 3 * HOUR,
  );
  if (due.length === 0) return json({ ok: true, skipped: "fetched within three hours" });

  const oldest = new Date(now - KEEP_DAYS * 24 * HOUR);
  const results = await pool(due, AT_ONCE, (feed) => fetchFeed(feed, oldest));

  // One row per work across all feeds (two feeds can carry the same piece).
  const rows = new Map<string, CatalogRow>();
  for (const r of results) for (const row of r.rows) if (!rows.has(row.id)) rows.set(row.id, row);
  const all = [...rows.values()];
  const failures: string[] = [];
  for (let i = 0; i < all.length; i += 500) {
    const { error: upsertError } = await supabase
      .from("catalog")
      .upsert(all.slice(i, i + 500), { onConflict: "id" });
    if (upsertError) failures.push(upsertError.message);
  }

  const stamp = new Date().toISOString();
  await Promise.all(
    results.map((r) =>
      supabase
        .from("catalog_feeds")
        .update({
          last_fetched_at: stamp,
          last_status: r.status,
          last_count: r.rows.length,
          etag: r.status === "ok" ? r.etag : undefined,
          last_modified: r.status === "ok" ? r.lastModified : undefined,
        })
        .eq("id", r.id)
    ),
  );

  // The catalog reaches back KEEP_DAYS; older pieces live on in the logs
  // of anyone who read them.
  const cutoff = oldest.toISOString();
  await supabase.from("catalog").delete().lt("published_at", cutoff);
  await supabase.from("catalog").delete().is("published_at", null).lt("added_at", cutoff);

  const byStatus: Record<string, number> = {};
  for (const r of results) {
    const key = r.status.startsWith("error") ? "error" : r.status;
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }
  return json({
    ok: failures.length === 0,
    feeds: due.length,
    pieces: all.length,
    byStatus,
    problems: results
      .filter((r) => r.status !== "ok" && r.status !== "unchanged")
      .map((r) => ({ id: r.id, status: r.status })),
    failures,
  });
});
