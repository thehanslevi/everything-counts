import "server-only";
import {
  poemSuggestion,
  rankElsewhere,
  wikidataKeeps,
  wikidataSuggestion,
  type Suggestion,
  type WikidataExtra,
  type WikidataHit,
} from "@/lib/suggest-core";

// The outside catalogs behind the title suggestions. Each one is asked with
// a short time limit and may fail without taking the other down; whatever
// answers in time is ranked together (rankElsewhere). Free, keyless
// services only:
//   Wikidata  well-known essays, stories, poems, speeches, magazine pieces
//             and papers
//   PoetryDB  public-domain poems
// (Crossref, for papers and reports, was tried and left out: it takes three
// to five seconds to answer, too slow for suggestions while typing.)
// Nothing about the person searching is sent: only the words they typed.

// Wikimedia asks every client to name itself and give a way to reach it.
const USER_AGENT = "EverythingCounts/1.0 (https://everythingcountsapp.com/support)";

async function getJson<T>(url: string, timeoutMs: number): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- Wikidata ----------------------------------------------------------------

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

// What a magazine, newspaper or journal is an instance of. A piece's
// "published in" often also lists the book it was later collected in; only
// periodicals count as its publication here, so a reprint collection never
// shows up as the source.
const PERIODICALS = new Set([
  "Q41298", // magazine
  "Q11032", // newspaper
  "Q1110794", // daily newspaper
  "Q1002697", // periodical
  "Q685935", // literary magazine
  "Q1684600", // news magazine
  "Q737498", // academic journal
  "Q5633421", // scientific journal
  "Q1153191", // online newspaper
  "Q35127", // website
  "Q30849", // blog
]);

interface WikidataSnak {
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface WikidataEntity {
  labels?: { en?: { value?: string } };
  claims?: Record<string, WikidataSnak[]>;
  sitelinks?: Record<string, unknown>;
}

function entityIds(claims: WikidataEntity["claims"], prop: string): string[] {
  return (claims?.[prop] ?? [])
    .map((s) => (s.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id): id is string => typeof id === "string" && /^Q\d+$/.test(id));
}

function strings(claims: WikidataEntity["claims"], prop: string): string[] {
  return (claims?.[prop] ?? [])
    .map((s) => s.mainsnak?.datavalue?.value)
    .filter((v): v is string => typeof v === "string");
}

async function entities(
  ids: string[],
  props: string,
): Promise<Record<string, WikidataEntity>> {
  if (ids.length === 0) return {};
  const url =
    `${WIKIDATA_API}?action=wbgetentities&format=json&languages=en` +
    `&props=${encodeURIComponent(props)}&ids=${ids.slice(0, 50).join("|")}`;
  const data = await getJson<{ entities?: Record<string, WikidataEntity> }>(
    url,
    1500,
  );
  return data?.entities ?? {};
}

type SearchHit = { id: string; label?: string; description?: string };

// Wikidata's search matches the start of a title, so "case for reparations"
// misses "The Case for Reparations". The same words with "The" in front are
// asked at the same time and the two answers merged.
async function searchWikidata(query: string): Promise<SearchHit[]> {
  const ask = (words: string) =>
    getJson<{ search?: SearchHit[] }>(
      `${WIKIDATA_API}?action=wbsearchentities&format=json&language=en&uselang=en` +
        `&type=item&limit=15&search=${encodeURIComponent(words)}`,
      1800,
    ).then((data) => data?.search ?? []);
  const withThe = /^(the|a|an)\s/i.test(query) ? null : `The ${query}`;
  const [plain, the] = await Promise.all([
    ask(query),
    withThe ? ask(withThe) : Promise.resolve([] as SearchHit[]),
  ]);
  const seen = new Set<string>();
  return [...plain, ...the].filter((h) => !seen.has(h.id) && seen.add(h.id));
}

async function wikidata(query: string): Promise<Suggestion[]> {
  const hits: WikidataHit[] = (await searchWikidata(query))
    .filter((h) => h.label && wikidataKeeps(h.description))
    .slice(0, 8)
    .map((h) => ({ id: h.id, label: h.label!, description: h.description! }));
  if (hits.length === 0) return [];

  // Who wrote each one, where it ran, and where its full text is.
  const items = await entities(
    hits.map((h) => h.id),
    "claims|sitelinks",
  );
  const authorIds = new Set<string>();
  const venueIds = new Set<string>();
  for (const h of hits) {
    const claims = items[h.id]?.claims;
    entityIds(claims, "P50").slice(0, 2).forEach((id) => authorIds.add(id));
    entityIds(claims, "P1433").slice(0, 4).forEach((id) => venueIds.add(id));
  }
  const [authors, venues] = await Promise.all([
    entities([...authorIds], "labels"),
    entities([...venueIds], "labels|claims"),
  ]);
  const label = (e: WikidataEntity | undefined) => e?.labels?.en?.value ?? null;

  return hits.map((h) => {
    const claims = items[h.id]?.claims;
    const named = entityIds(claims, "P50")
      .map((id) => label(authors[id]))
      .filter((n): n is string => Boolean(n));
    const author =
      named.length > 0
        ? named.length > 1
          ? `${named[0]} and ${named[1]}`
          : named[0]
        : (strings(claims, "P2093")[0] ?? null);
    const periodical = entityIds(claims, "P1433").find((id) =>
      entityIds(venues[id]?.claims, "P31").some((c) => PERIODICALS.has(c)),
    );
    const fullText = strings(claims, "P953").find((u) => /^https:\/\//i.test(u));
    const extra: WikidataExtra = {
      author,
      source: periodical ? label(venues[periodical]) : null,
      url: fullText ?? null,
      sitelinks: Object.keys(items[h.id]?.sitelinks ?? {}).length,
    };
    return wikidataSuggestion(h, extra);
  });
}

// --- PoetryDB ----------------------------------------------------------------

async function poetry(query: string): Promise<Suggestion[]> {
  if (query.length < 4) return [];
  const data = await getJson<unknown>(
    `https://poetrydb.org/title/${encodeURIComponent(query)}/title,author.json`,
    1500,
  );
  // A miss answers {"status": 404}; a hit is a list.
  if (!Array.isArray(data)) return [];
  return data
    .slice(0, 8)
    .map((item) => poemSuggestion(item as { title?: string; author?: string }))
    .filter((s): s is Suggestion => s !== null);
}

// --- Together ----------------------------------------------------------------

// Answers are kept for a day per server instance: the same few titles get
// typed over and over, and none of these catalogs changes by the minute.
const DAY = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; items: Suggestion[] }>();

export async function suggestElsewhere(query: string): Promise<Suggestion[]> {
  const key = query.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY) return hit.items;

  // However slow a catalog is, the list doesn't wait on it past 5 seconds
  // (each step inside has its own shorter limit).
  const within = (p: Promise<Suggestion[]>) =>
    Promise.race([
      p,
      new Promise<Suggestion[]>((resolve) => setTimeout(() => resolve([]), 5000)),
    ]);
  const settled = await Promise.allSettled([
    within(wikidata(query)),
    within(poetry(query)),
  ]);
  const all = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const items = rankElsewhere(query, all);

  // Don't remember an answer made while every catalog was failing.
  if (settled.some((r) => r.status === "fulfilled" && r.value.length > 0)) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), items });
  }
  return items;
}
