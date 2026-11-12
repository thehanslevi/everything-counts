// The work id a log of a link gets, computed the same way as the app's
// src/lib/data/url.ts (normalizeUrl + FNV-1a), so a catalog row and a log
// of the same piece share an id. Kept as a copy because edge functions are
// bundled on their own; a test compares the two on a set of addresses.

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

export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    const params = [...u.searchParams.entries()]
      .filter(([key]) => !isTrackingParam(key))
      .sort(([a], [b]) => a.localeCompare(b));
    const qs = new URLSearchParams(params).toString();
    const base = `${host}${path}`;
    return qs ? `${base}?${qs}` : base;
  } catch {
    return raw.trim().toLowerCase();
  }
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function workIdFor(url: string): string {
  return fnv1a(normalizeUrl(url));
}

// Parameters a feed adds to say "this click came from RSS". The article's
// own address, the one a reader shares or pastes, doesn't have them.
function isFeedParam(key: string, value: string): boolean {
  const k = key.toLowerCase();
  const v = value.toLowerCase();
  return (
    k === "at_medium" || k === "at_campaign" || // BBC
    k.startsWith("syn-") || // FT
    ((k === "via" || k === "mod") && v.startsWith("rss")) // Slate, WSJ
  );
}

// The link as a reader would want to keep it: the same address without the
// feed's tracking parameters or fragment. Rows are keyed by this, so a piece
// picked from the catalog pools with the same piece pasted from the page.
export function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const [key, value] of [...u.searchParams.entries()]) {
      if (isTrackingParam(key) || isFeedParam(key, value)) u.searchParams.delete(key);
    }
    u.hash = "";
    // Feeds that still say http:// (New York's feedburner feeds) point at
    // pages served over https: keep the address a reader would paste. The
    // work id ignores the scheme, so it doesn't change.
    if (u.protocol === "http:") u.protocol = "https:";
    return u.href;
  } catch {
    return raw;
  }
}
