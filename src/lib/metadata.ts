// Server-side OpenGraph metadata fetcher.
//
// Browsers cannot fetch another site's HTML to read its metadata (CORS), so this
// runs on the server behind /api/metadata. It fetches the page, pulls the
// OpenGraph / standard meta tags, and returns a normalized result the logging
// form can pre-fill. Everything is best-effort: missing fields come back null
// and the user can fill them in by hand. A page we can't read (paywall bot
// walls, timeouts, 404s) is not an error — it's a partial result with what the
// URL alone tells us, plus `error` saying why, so logging never dead-ends.

import { coerceUrl } from "@/lib/data/url";

export interface LinkMetadata {
  url: string;
  title: string | null;
  author: string | null;
  source: string | null; // publication / site name
  image: string | null; // lead image URL
  form: string | null; // best-guess form from the URL; the user can override
  error: string | null; // why the fetch fell short, when it did
}

// Guess the form from where the piece lives, so saving is usually one tap.
// Conservative: only guess when the host is a strong signal; otherwise null
// and the form field keeps its default. The user can always override.
const FORM_GUESSES: [RegExp, string][] = [
  [/arxiv\.org|ssrn\.com|nber\.org|biorxiv\.org|osf\.io/i, "report"],
  [/rand\.org|brookings\.edu|urban\.org|mdrc\.org|pewresearch\.org/i, "report"],
  [/\.pdf($|\?)/i, "report"],
  [/poetryfoundation\.org|poets\.org|poetry/i, "poem"],
  [/newyorker\.com\/(magazine|culture|books)|theatlantic\.com\/(ideas|magazine)/i, "essay"],
  [/aeon\.co|thepointmag\.com|noemamag\.com|laphamsquarterly\.org/i, "essay"],
  [/substack\.com/i, "essay"],
];

function guessForm(url: string): string | null {
  for (const [pattern, form] of FORM_GUESSES) {
    if (pattern.test(url)) return form;
  }
  return null;
}

// Pull the content of the first matching <meta> tag for any of the given
// property/name values.
function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    // Match both attribute orders: content before or after property/name.
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
        "i",
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${key}["']`,
        "i",
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1].trim()) return decodeEntities(match[1].trim());
    }
  }
  return null;
}

// Minimal HTML entity decoding for the handful that show up in meta tags.
function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#38;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Some sites put junk in og:site_name — a full URL, or a scheme-prefixed
// domain. Reduce URL-shaped values to a clean hostname so the byline reads
// like a publication, not an address bar.
function cleanSource(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return hostname(trimmed) ?? trimmed;
  }
  // Bare-domain-with-path shapes like "www.example.com/foo/"
  if (/^www\./i.test(trimmed) || /^[a-z0-9.-]+\.[a-z]{2,}\/.*$/i.test(trimmed)) {
    return trimmed.replace(/^www\./i, "").replace(/\/.*$/, "");
  }
  return trimmed;
}

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  // Lenient in, strict out: scheme-less and link-in-text inputs are fixed up;
  // only something that can't be made into an http(s) URL is rejected.
  const coerced = coerceUrl(rawUrl);
  if (!coerced) throw new Error("That does not look like a link.");
  const url = new URL(coerced);

  // What we can say from the URL alone, for when the page itself won't talk.
  const partial = (error: string): LinkMetadata => ({
    url: url.toString(),
    title: null,
    author: null,
    source: cleanSource(hostname(url.toString())),
    image: null,
    form: guessForm(url.toString()),
    error,
  });

  // Bound the fetch so a slow site cannot hang the request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let html = "";
  try {
    const response = await fetch(url.toString(), {
      headers: {
        // Some sites serve minimal markup without a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; EverythingCountsBot/0.1; +https://everything-counts.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) {
      // Paywalled publishers often turn bots away at the door. That's their
      // call; the person still read the piece, so they still get to log it.
      return partial(
        response.status === 401 || response.status === 403
          ? "That site won't let us read it."
          : `That page returned ${response.status}.`,
      );
    }
    html = await response.text();
  } catch (err) {
    return partial(
      err instanceof Error && err.name === "AbortError"
        ? "That page took too long to respond."
        : "Couldn't reach that page.",
    );
  } finally {
    clearTimeout(timeout);
  }

  // Only the <head> region matters and parsing less is faster on huge pages.
  const head = html.slice(0, 200_000);

  const title =
    metaContent(head, ["og:title", "twitter:title"]) ??
    (head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1].trim()
      ? decodeEntities(head.match(/<title[^>]*>([^<]*)<\/title>/i)![1].trim())
      : null);

  const author = metaContent(head, [
    "author",
    "article:author",
    "og:article:author",
    "twitter:creator",
  ]);

  const source = cleanSource(
    metaContent(head, ["og:site_name", "application-name"]) ??
      hostname(url.toString()),
  );

  const image = metaContent(head, ["og:image", "twitter:image", "twitter:image:src"]);

  return {
    url: url.toString(),
    title,
    author,
    source,
    image,
    form: guessForm(url.toString()),
    error: null,
  };
}
