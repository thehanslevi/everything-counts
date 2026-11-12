// Title suggestions for the log form: what someone has typed, turned into
// pieces they might mean. This module is pure (no network, no database) so
// the ranking and the reading of each catalog's answers can be tested on
// their own. The fetching lives in src/lib/suggest.ts; the record half in
// suggestFromRecord() in src/lib/data/logs.ts.

import { fold } from "@/lib/fold";
import type { Form } from "@/lib/data/types";

export type SuggestionOrigin = "record" | "catalog" | "wikidata" | "poetrydb";

export interface Suggestion {
  key: string; // unique within one list
  origin: SuggestionOrigin;
  title: string;
  author: string | null;
  source: string | null;
  form: Form | null;
  url: string | null;
  image: string | null;
  // Record only: the work it pools into, how many people logged it, and
  // when the viewer last did (null if never).
  workId: string | null;
  readers: number;
  mineAt: string | null;
  // Outside catalogs: how well known the piece is (Wikidata counts the
  // Wikipedias that have an article on it). Breaks ties in the ranking.
  weight: number;
}

export const MIN_QUERY = 3;
const MAX_QUERY = 100;

// What's worth searching for: trimmed, single-spaced, capped, and long
// enough once folded to mean something. Null means "don't search".
export function cleanQuery(raw: string | null | undefined): string | null {
  const q = (raw ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY);
  return fold(q).replace(/ /g, "").length >= MIN_QUERY ? q : null;
}

// The fragment to hand the database's substring search: the longest run of
// letters and digits, since it narrows most. Split at apostrophes and
// hyphens too, so the database is never stricter than the folded ranking
// ("writer’s" typed on a phone still finds "Writer's"), and nothing that
// could upset the query syntax gets through. Ranking in code does the rest.
// Empty when nothing usable is left.
export function anchorWord(q: string): string {
  return q
    .split(/[^\p{L}\p{N}]+/u)
    .reduce((best, w) => (w.length > best.length ? w : best), "");
}

// How well a piece answers what was typed. 0 means it doesn't.
//   100  the title, exactly
//    80  the title starts with it
//    60  every typed word starts a word of the title, in any order
//    50  the title contains it
//    40  every typed word starts a word of the title or the author
//        ("orwell politics")
export function titleScore(
  query: string,
  title: string,
  author?: string | null,
): number {
  const q = fold(query);
  const t = fold(title);
  if (!q || !t) return 0;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  const typed = q.split(" ");
  const titleWords = t.split(" ");
  const starts = (words: string[]) =>
    typed.every((w) => words.some((x) => x.startsWith(w)));
  if (starts(titleWords)) return 60;
  if (t.includes(q)) return 50;
  const authorWords = fold(author ?? "").split(" ").filter(Boolean);
  if (authorWords.length > 0 && starts([...titleWords, ...authorWords])) {
    return 40;
  }
  return 0;
}

// Two suggestions are the same piece when the folded title matches and the
// authors share their most telling word. Catalogs order names differently
// ("Shelley, Percy Bysshe" and "Percy Bysshe Shelley"), so the word is
// picked from the set, not by position: the longest, then alphabetical.
export function sameness(title: string, author: string | null): string {
  const words = fold(author ?? "")
    .split(" ")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length || a.localeCompare(b));
  return `${fold(title)}|${words[0] ?? ""}`;
}

// --- Wikidata ----------------------------------------------------------------
// Wikidata knows the well-known pieces: essays, short stories, poems,
// speeches, famous magazine articles and papers. Its search answers with a label and a
// one-line description ("1948 short story by Shirley Jackson"); the
// description says what kind of thing it is.

const WIKIDATA_KEEP =
  /\b(essays?|short stor(y|ies)|story|novelette|novella|poems?|poetry|sonnet|ode|elegy|villanelle|haiku|article|speech|lecture|sermon|letter|manifesto|op-ed|column|editorial|address|pamphlet|report|chapter|review)\b/i;
// Things with the same name that aren't a piece someone reads in one sitting:
// films, episodes, albums, books and collections, editions, translations.
const WIKIDATA_SKIP =
  /\b(film|episode|album|song|single|painting|television|tv|series|video game|band|book|edition|translation|translated|novel|comic|play|opera|musical|disambiguation|family name|given name|anthology|collection|character|fictional)\b/i;

export function wikidataKeeps(description: string | null | undefined): boolean {
  const d = description ?? "";
  return WIKIDATA_KEEP.test(d) && !WIKIDATA_SKIP.test(d);
}

export function formFromDescription(description: string): Form {
  const d = description.toLowerCase();
  if (/short stor|novella|novelette|short fiction|\bstory\b/.test(d)) return "short story";
  if (/\bpoem|\bpoetry|\bsonnet|\bode\b|\belegy|\bvillanelle|\bhaiku/.test(d)) return "poem";
  if (/\bessay/.test(d)) return "essay";
  if (/\breport\b/.test(d)) return "report";
  if (/\bchapter\b/.test(d)) return "chapter";
  if (/article|op-ed|column|editorial|review/.test(d)) return "article";
  return "other";
}

// "1948 short story by Shirley Jackson" -> "Shirley Jackson". Stops at a
// comma, a bracket, or a trailing "in ..."/"published ..." clause.
export function authorFromDescription(description: string): string | null {
  const m = description.match(/\bby\s+(.+)$/i);
  if (!m) return null;
  const name = m[1]
    .split(/[,;(]/)[0]
    .replace(/\s+(in|for|from|published|first|about|on)\s.*$/i, "")
    .trim();
  return name.length >= 2 && name.length <= 80 ? name : null;
}

export interface WikidataHit {
  id: string;
  label: string;
  description: string;
}

export interface WikidataExtra {
  author: string | null; // from the item's author statements
  source: string | null; // what it was published in
  url: string | null; // where the full text is, when Wikidata knows
  sitelinks: number; // how many Wikipedias have an article on it
}

export function wikidataSuggestion(
  hit: WikidataHit,
  extra: WikidataExtra | undefined,
): Suggestion {
  return {
    key: `wikidata:${hit.id}`,
    origin: "wikidata",
    title: hit.label,
    author: authorFromDescription(hit.description) ?? extra?.author ?? null,
    source: extra?.source ?? null,
    form: formFromDescription(hit.description),
    url: extra?.url ?? null,
    image: null,
    workId: null,
    readers: 0,
    mineAt: null,
    weight: extra?.sitelinks ?? 0,
  };
}

// --- PoetryDB ----------------------------------------------------------------
// Public-domain poems by title.

export function poemSuggestion(item: {
  title?: string;
  author?: string;
}): Suggestion | null {
  const title = (item.title ?? "").trim();
  if (!title || title.length > 300) return null;
  const author = (item.author ?? "").trim() || null;
  return {
    key: `poetrydb:${fold(title)}|${fold(author ?? "")}`,
    origin: "poetrydb",
    title,
    author,
    source: null,
    form: "poem",
    url: null,
    image: null,
    workId: null,
    readers: 0,
    mineAt: null,
    weight: 0,
  };
}

// --- Putting the outside catalogs together -----------------------------------

const ORIGIN_RANK: Record<SuggestionOrigin, number> = {
  record: 4,
  catalog: 3,
  wikidata: 2,
  poetrydb: 1,
};

// Keep what answers the query, best first; one entry per piece; at most
// `limit`. Among equal matches the better-known piece comes first (the
// Swift essay before an editorial that borrowed its title), then the
// catalog that knows that kind of piece best.
export function rankElsewhere(
  query: string,
  items: Suggestion[],
  limit = 6,
): Suggestion[] {
  const scored = items
    .map((s) => ({ s, score: titleScore(query, s.title, s.author) }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.s.weight - a.s.weight ||
        ORIGIN_RANK[b.s.origin] - ORIGIN_RANK[a.s.origin],
    );
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const { s } of scored) {
    const id = sameness(s.title, s.author);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(s);
    if (out.length >= limit) break;
  }
  return out;
}
