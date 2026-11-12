// Canonical-URL normalization for work clustering.
//
// Two logs whose pasted URLs normalize to the same string belong to the same
// work. This is canonical-URL clustering ONLY: strip tracking parameters,
// lowercase the host, drop "www." and trailing slashes, drop the fragment, and
// sort the remaining query params. It deliberately does NOT do edition/reprint
// or DOI deduplication — that is a later migration, out of scope here.
//
// Resolving the OpenGraph canonical URL and following a redirect hop happen at
// fetch time (the metadata route), not here; this helper is the pure, final
// string normalization that both seed data and freshly fetched URLs run through.

import { fold } from "@/lib/fold";

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "igshid",
  "ref",
  "ref_src",
  "ref_url",
  "referrer",
  "source",
  "cmpid",
  "_hsenc",
  "_hsmi",
]);

function isTrackingParam(key: string): boolean {
  const k = key.toLowerCase();
  return k.startsWith("utm_") || TRACKING_PARAMS.has(k);
}

// Turn whatever a person typed, pasted, or shared into a fetchable URL, or
// null. Accepts a scheme-less "thecut.com/article/..." (adds https://) and
// text with a link somewhere inside it ("Read this: https://..."), which is
// what some share sheets hand over. Anything that still doesn't parse as
// http(s) is null — callers decide how to say so.
export function coerceUrl(raw: string): string | null {
  const text = raw.trim();
  // Nothing real is this long, and the clean-up below is linear only up to
  // a bound worth having anyway.
  if (!text || text.length > 4096) return null;

  // A whole address on its own is kept as it is, apart from a sentence's
  // last punctuation: parentheses and apostrophes are legal inside one
  // (".../The_Second_Coming_(poem)", ".../what's-new").
  let candidate: string;
  if (/^https?:\/\/\S+$/i.test(text)) {
    candidate = text;
  } else {
    const embedded = text.match(/https?:\/\/[^\s<>"'\]]+/i)?.[0];
    if (embedded) {
      candidate = embedded;
    } else if (
      /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(text)
    ) {
      candidate = `https://${text}`;
    } else {
      return null;
    }
  }
  candidate = trimTrailing(candidate);

  try {
    const u = new URL(candidate);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

// A link at the end of a sentence drags its punctuation along: "...," or
// "...)." A closing bracket stays when the address opened one itself.
function trimTrailing(url: string): string {
  let opens = 0;
  let closes = 0;
  for (const ch of url) {
    if (ch === "(") opens++;
    else if (ch === ")") closes++;
  }
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    if (".,;:!?".includes(last)) {
      end--;
    } else if (last === ")" && closes > opens) {
      closes--;
      end--;
    } else {
      break;
    }
  }
  return url.slice(0, end);
}

// Normalize a URL to a canonical string used as the clustering key.
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, ""); // drop trailing slash(es)

    // Keys sort in English collation, named outright. Left to the runtime's
    // default locale, a server set to Turkish or Swedish would order some
    // keys differently and give the same link a second work id. Naming "en"
    // gives the order an English default always gave, so every stored id
    // stays as it was.
    // supabase/functions/catalog-ingest/url.ts sorts the same way.
    const params = [...u.searchParams.entries()]
      .filter(([key]) => !isTrackingParam(key))
      .sort(([a], [b]) => a.localeCompare(b, "en"));
    const qs = new URLSearchParams(params).toString();

    const base = `${host}${path}`;
    return qs ? `${base}?${qs}` : base;
  } catch {
    // Not a parseable URL: fall back to a trimmed, lowercased form.
    return raw.trim().toLowerCase();
  }
}

// Stable, route-safe id for a work, derived from a URL (or a title when there is
// no URL). FNV-1a keeps it short and deterministic; collisions are vanishingly
// unlikely at this scale.
function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function workIdFor(
  url: string | null,
  title: string,
  author?: string | null,
  source?: string | null,
  owner?: string | null,
): string {
  if (url && url.trim()) return fnv1a(normalizeUrl(url));
  return handWorkId(title, author, source, owner);
}

// A piece logged without a link: a printed magazine, a PDF someone sent, a
// chapter of a library book. Same title, author and publication, however
// they're typed (case, accents, punctuation), is the same work; the same
// title by someone else is a different piece. A bare title with neither an
// author nor a publication ("Introduction") says too little to be sure two
// readers mean the same thing, so it stays the reader's own (`owner`).
// Picking a piece from the title suggestions sends its id along instead, so
// that is how a bare title pools, and how a later fix to the first reader's
// typing doesn't split a work in two.
export function handWorkId(
  title: string,
  author?: string | null,
  source?: string | null,
  owner?: string | null,
): string {
  const t = fold(title) || title.trim().toLowerCase();
  const a = fold(author ?? "");
  const s = fold(source ?? "");
  const key = a || s || !owner ? `${t}|${a}|${s}` : `${t}|||${owner}`;
  return `t-${fnv1a(key)}`;
}

// The shape of a no-link work id: "t-" and up to 7 base-36 digits (FNV-1a
// is 32 bits). Anything else arriving from a form is ignored.
export function isHandWorkId(id: string): boolean {
  return /^t-[0-9a-z]{1,7}$/.test(id);
}
