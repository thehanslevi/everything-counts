// Server-side OpenGraph metadata fetcher.
//
// Browsers cannot fetch another site's HTML to read its metadata (CORS), so this
// runs on the server behind /api/metadata. It fetches the page, pulls the
// OpenGraph / standard meta tags, and returns a normalized result the logging
// form can pre-fill. Everything is best-effort: missing fields come back null
// and the user can fill them in by hand.

export interface LinkMetadata {
  url: string;
  title: string | null;
  author: string | null;
  source: string | null; // publication / site name
  image: string | null; // lead image URL
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

export async function fetchLinkMetadata(rawUrl: string): Promise<LinkMetadata> {
  // Validate and normalize the URL up front.
  let url: URL;
  try {
    url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Only http and https URLs are supported.");
    }
  } catch {
    throw new Error("That does not look like a valid URL.");
  }

  // Bound the fetch so a slow site cannot hang the request.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let html = "";
  try {
    const response = await fetch(url.toString(), {
      headers: {
        // Some sites serve minimal markup without a browser-like UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; ReadingLogBot/0.1; +https://reading-log-tau.vercel.app)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`The page returned ${response.status}.`);
    }
    html = await response.text();
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("The page took too long to respond.");
    }
    throw new Error("Could not reach that page.");
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

  const source =
    metaContent(head, ["og:site_name", "application-name"]) ?? hostname(url.toString());

  const image = metaContent(head, ["og:image", "twitter:image", "twitter:image:src"]);

  return {
    url: url.toString(),
    title,
    author,
    source,
    image,
  };
}
