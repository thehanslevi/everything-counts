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
}

interface Fetched {
  status: string; // "ok", "no items", "unchanged", "http 403", "timeout", "error", "too large"
  rows: CatalogRow[];
  etag: string | null;
  lastModified: string | null;
}

// Read a response body up to MAX_BYTES, stopping the download there.
async function readCapped(res: Response): Promise<string | null> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return null;
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(all);
}

// One feed. With `force` the conditional headers are left off, so the feed
// is read in full even if it hasn't changed (a repair, or a reader change).
async function fetchFeed(feed: FeedRow, oldest: Date, force: boolean): Promise<Fetched> {
  const headers: Record<string, string> = {
    "user-agent": USER_AGENT,
    accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5",
  };
  if (!force && feed.etag) headers["if-none-match"] = feed.etag;
  if (!force && feed.last_modified) headers["if-modified-since"] = feed.last_modified;
  const none = { rows: [], etag: null, lastModified: null };
  try {
    const res = await fetch(feed.url, {
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status === 304) return { ...none, status: "unchanged" };
    if (!res.ok) {
      await res.body?.cancel();
      return { ...none, status: `http ${res.status}` };
    }
    const xml = await readCapped(res);
    if (xml === null) return { ...none, status: "too large" };
    const rows = catalogRows(xml, feed, oldest);
    return {
      status: rows.length > 0 ? "ok" : "no items",
      rows,
      etag: res.headers.get("etag"),
      lastModified: res.headers.get("last-modified"),
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return {
      ...none,
      status: name === "TimeoutError" || name === "AbortError" ? "timeout" : "error",
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
  const force = Boolean(body.force);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const now = Date.now();

  // Claim the feeds that are due, in one statement: they're stamped as
  // fetched now and returned. A second run arriving at the same moment finds
  // them stamped and claims nothing, so no feed is fetched twice. A run that
  // dies after claiming leaves its feeds resting three hours, not hammered.
  let claim = supabase
    .from("catalog_feeds")
    .update({ last_fetched_at: new Date(now).toISOString() })
    .eq("active", true);
  if (!force) {
    const rested = new Date(now - 3 * HOUR).toISOString();
    claim = claim.or(`last_fetched_at.is.null,last_fetched_at.lt."${rested}"`);
  }
  const { data: claimed, error } = await claim.select(
    "id, url, publication, form, etag, last_modified",
  );
  if (error) return json({ ok: false, error: "could not read the feeds" }, 500);
  const due = (claimed ?? []) as FeedRow[];
  if (due.length === 0) return json({ ok: true, skipped: "fetched within three hours" });

  const oldest = new Date(now - KEEP_DAYS * 24 * HOUR);

  // Each feed is fetched, stored and noted on its own, so one feed's trouble
  // (or the run being cut short) costs only that feed. Its ETag and
  // Last-Modified are kept only once its pieces are stored; otherwise they're
  // cleared, so the next run reads the feed in full rather than being told
  // "unchanged" about pieces that never landed.
  const results = await pool(due, AT_ONCE, async (feed) => {
    const got = await fetchFeed(feed, oldest, force);
    let status = got.status;
    let stored = true;
    for (let i = 0; i < got.rows.length; i += 200) {
      const { error: upsertError } = await supabase
        .from("catalog")
        .upsert(got.rows.slice(i, i + 200), { onConflict: "id" });
      if (upsertError) {
        stored = false;
        status = "store failed";
        console.error("catalog upsert", feed.id, upsertError.message);
        break;
      }
    }
    const fresh = got.status === "ok";
    await supabase
      .from("catalog_feeds")
      .update({
        last_status: status,
        // An unchanged feed keeps the count from its last full read.
        ...(got.status === "unchanged" ? {} : { last_count: got.rows.length }),
        ...(fresh
          ? { etag: stored ? got.etag : null, last_modified: stored ? got.lastModified : null }
          : {}),
      })
      .eq("id", feed.id);
    return { id: feed.id, status, pieces: stored ? got.rows.length : 0 };
  });

  // The catalog reaches back KEEP_DAYS; older pieces live on in the logs
  // of anyone who read them.
  const cutoff = oldest.toISOString();
  await supabase.from("catalog").delete().lt("published_at", cutoff);
  await supabase.from("catalog").delete().is("published_at", null).lt("added_at", cutoff);

  const byStatus: Record<string, number> = {};
  for (const r of results) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
  const problems = results.filter((r) => r.status !== "ok" && r.status !== "unchanged");
  return json({
    ok: !results.some((r) => r.status === "store failed"),
    feeds: due.length,
    pieces: results.reduce((sum, r) => sum + r.pieces, 0),
    byStatus,
    problems: problems.map((r) => ({ id: r.id, status: r.status })),
  });
});
