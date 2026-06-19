// Canonical-URL clustering.
//
// This is the single place that turns a pasted URL into a stable work identity.
// Two logs whose URLs normalize to the same string belong to the same work, so
// "several people you follow read this" works. This is canonical-URL clustering
// only — deliberately NOT rich deduplication across editions, reprints, or DOIs
// (that is a later migration, out of scope).
//
// Normalization: lowercase the scheme and host, drop a leading "www.", strip
// tracking parameters, drop empty/junk query params (sorting the rest for
// stability), drop the fragment, and drop a trailing slash.
//
// Note: resolving to the OpenGraph canonical URL and following a redirect hop
// (also part of the launch spec) would slot into this same helper at log time;
// the demo proves clustering through the pure-string normalization below.

// Query parameters that never identify the piece, only the referral/campaign.
const TRACKING_PARAMS = [
  /^utm_/, // utm_source, utm_medium, utm_campaign, utm_term, utm_content
  /^fbclid$/,
  /^gclid$/,
  /^dclid$/,
  /^msclkid$/,
  /^mc_(cid|eid)$/,
  /^igshid$/,
  /^ref$/,
  /^ref_src$/,
  /^referrer$/,
  /^source$/,
  /^cmpid$/,
  /^_hsenc$/,
  /^_hsmi$/,
];

function isTracking(key: string): boolean {
  return TRACKING_PARAMS.some((re) => re.test(key));
}

// Normalize a URL for clustering. Returns null if it cannot be parsed.
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // Keep only meaningful query params, sorted for a stable key.
  const params = [...url.searchParams.entries()]
    .filter(([key, value]) => value !== "" && !isTracking(key))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.map(([k, v]) => `${k}=${v}`).join("&");

  // Drop a trailing slash from the path (but keep a bare "/").
  const path = url.pathname.replace(/\/+$/, "") || "";

  return `${url.protocol}//${host}${path}${query ? `?${query}` : ""}`;
}

// A short, URL-safe, deterministic id derived from a normalized URL. Same
// normalized URL always yields the same id, which is what clusters logs.
function hash(input: string): string {
  // FNV-1a 32-bit, rendered base36.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

// Derive the workId for a log from its URL. Returns null when there is no URL
// to cluster on; the caller assigns a unique non-clustering id in that case.
export function workIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = normalizeUrl(raw);
  return normalized ? `w-${hash(normalized)}` : null;
}
