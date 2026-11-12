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

// The link as a reader would want to keep it: the same address without the
// feed's tracking parameters (utm_source=rss and the like) or fragment.
export function cleanUrl(raw: string): string {
  try {
    const u = new URL(raw);
    for (const key of [...u.searchParams.keys()]) {
      if (isTrackingParam(key)) u.searchParams.delete(key);
    }
    u.hash = "";
    return u.href;
  } catch {
    return raw;
  }
}
