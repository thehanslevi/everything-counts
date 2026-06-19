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

// Normalize a URL to a canonical string used as the clustering key.
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, ""); // drop trailing slash(es)

    const params = [...u.searchParams.entries()]
      .filter(([key]) => !isTrackingParam(key))
      .sort(([a], [b]) => a.localeCompare(b));
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

export function workIdFor(url: string | null, title: string): string {
  if (url && url.trim()) return fnv1a(normalizeUrl(url));
  // No URL: cluster by title as a last resort (all in-category logs are
  // URL-based today, so this is just a safety net).
  return `t-${fnv1a(title.trim().toLowerCase())}`;
}
