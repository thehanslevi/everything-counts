// Reading a publication's RSS or Atom feed into catalog rows. Pure: no
// network, no Deno or Node APIs, so the same code runs in the edge function
// and in tests. Feeds are regular enough that a careful pattern-based reader
// does the job without an XML library: RSS 2.0 <item>, RSS 1.0 (RDF) <item>,
// and Atom <entry>, with CDATA and both XML and HTML entities.

import { cleanUrl, workIdFor } from "./url.ts";

export interface FeedSource {
  id: number;
  url: string; // the feed's own address, for resolving relative links
  publication: string; // the name the catalog shows as the source
  form: string; // what most of its items are
}

export interface CatalogRow {
  id: string; // the work id a log of this link would get
  url: string;
  title: string;
  author: string | null;
  source: string;
  image: string | null;
  form: string;
  published_at: string | null;
  feed_id: number;
}

const MAX_ITEMS = 150;

// --- Text ----------------------------------------------------------------------

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”",
  ldquo: "“", sbquo: "‚", bdquo: "„", laquo: "«", raquo: "»", middot: "·",
  bull: "•", copy: "©", reg: "®", trade: "™", deg: "°", eacute: "é",
  egrave: "è", ecirc: "ê", euml: "ë", aacute: "á", agrave: "à", acirc: "â",
  auml: "ä", aring: "å", atilde: "ã", iacute: "í", igrave: "ì", icirc: "î",
  iuml: "ï", oacute: "ó", ograve: "ò", ocirc: "ô", ouml: "ö", otilde: "õ",
  oslash: "ø", uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü", ntilde: "ñ",
  ccedil: "ç", szlig: "ß", Eacute: "É", Aacute: "Á", Oacute: "Ó", Uacute: "Ú",
  Ntilde: "Ñ", Ccedil: "Ç", Ouml: "Ö", Uuml: "Ü", Auml: "Ä", aelig: "æ",
  oelig: "œ", thinsp: " ", ensp: " ", emsp: " ", zwj: "", zwnj: "",
};

function decodeOnce(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X"
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return NAMED[code] ?? NAMED[code.toLowerCase()] ?? whole;
  });
}

// Feeds escape twice as often as not ("&amp;#8217;"), so decoding runs until
// nothing changes (at most three passes).
export function decodeEntities(text: string): string {
  let out = text;
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function unwrapCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

// A field's inner text as plain text: CDATA opened, entities decoded, any
// HTML inside stripped, whitespace collapsed.
export function plain(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = unwrapCdata(raw);
  text = decodeEntities(text);
  text = text.replace(/<[^>]*>/g, " ");
  text = decodeEntities(text);
  return wellFormed(text).replace(/\s+/g, " ").trim();
}

// Text the database will take: no control characters (NUL among them), and
// no half of a surrogate pair left by a bad character reference.
function wellFormed(text: string): string {
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  return clean.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "");
}

// Cut to `max` characters without splitting one in two.
function cut(text: string, max: number): string {
  return Array.from(text).slice(0, max).join("");
}

// --- Elements ------------------------------------------------------------------

function escapeName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The inner content of the first <name ...>...</name> in a block, or null.
function inner(block: string, name: string): string | null {
  const re = new RegExp(`<${escapeName(name)}(?:\\s[^>]*[^/>])?>([\\s\\S]*?)</${escapeName(name)}\\s*>`, "i");
  return block.match(re)?.[1] ?? null;
}

// Every inner content of <name>...</name> in a block.
function inners(block: string, name: string): string[] {
  const re = new RegExp(`<${escapeName(name)}(?:\\s[^>]*[^/>])?>([\\s\\S]*?)</${escapeName(name)}\\s*>`, "gi");
  return [...block.matchAll(re)].map((m) => m[1]);
}

// Every opening (or self-closing) tag <name ...> in a block, as its attributes.
function tags(block: string, name: string): Record<string, string>[] {
  const re = new RegExp(`<${escapeName(name)}(\\s[^>]*?)?\\/?>`, "gi");
  return [...block.matchAll(re)].map((m) => attributes(m[1] ?? ""));
}

function attributes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/(?:^|\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return out;
}

// --- Items ---------------------------------------------------------------------

interface RawItem {
  title: string;
  link: string;
  author: string;
  date: string;
  image: string;
}

export function readItems(xml: string): RawItem[] {
  // Comments can hold markup that isn't part of the feed.
  let doc = withoutComments(xml);
  // Some Atom feeds name every element with a prefix (<ns6:feed>,
  // <ns6:entry>). When the root itself is prefixed, drop the Atom prefix so
  // the elements read as plain Atom. (RSS feeds that only borrow
  // <atom:link> keep theirs.)
  const prefix = doc.match(/xmlns:([\w.-]+)\s*=\s*["']http:\/\/www\.w3\.org\/2005\/Atom["']/)?.[1];
  if (prefix && new RegExp(`<${escapeName(prefix)}:feed[\\s>]`).test(doc)) {
    doc = doc.replace(new RegExp(`<(/?)${escapeName(prefix)}:`, "g"), "<$1");
  }
  const atom = /<feed[\s>]/i.test(doc) && /<entry[\s>]/i.test(doc);
  const blocks = elements(doc, atom ? "entry" : "item", MAX_ITEMS);
  return blocks.map((block) => (atom ? atomItem(block) : rssItem(block)));
}

// The feed without <!-- comments -->. A scan, not a pattern, so a comment
// that never closes ends the scan instead of being retried at every turn.
function withoutComments(xml: string): string {
  let out = "";
  let at = 0;
  for (;;) {
    const open = xml.indexOf("<!--", at);
    if (open === -1) return out + xml.slice(at);
    out += xml.slice(at, open);
    const close = xml.indexOf("-->", open + 4);
    if (close === -1) return out;
    at = close + 3;
  }
}

// The contents of each <name>…</name> (an <item> or <entry>), found by
// scanning forward. An opener with no closer ends the scan.
function elements(doc: string, name: string, max: number): string[] {
  const lower = doc.toLowerCase();
  const open = `<${name}`;
  const close = `</${name}`;
  const out: string[] = [];
  let at = 0;
  while (out.length < max) {
    let start = lower.indexOf(open, at);
    // Skip longer names that share the start (<items>, <entry-…>).
    while (start !== -1 && !/[\s>]/.test(lower[start + open.length] ?? "")) {
      start = lower.indexOf(open, start + 1);
    }
    if (start === -1) break;
    const bodyStart = lower.indexOf(">", start);
    if (bodyStart === -1) break;
    const end = lower.indexOf(close, bodyStart);
    if (end === -1) break;
    out.push(doc.slice(bodyStart + 1, end));
    at = end + close.length;
  }
  return out;
}

function rssItem(block: string): RawItem {
  // Some feeds carry the real address in feedburner:origLink, with a
  // tracking redirect in <link>.
  const guid = inner(block, "guid");
  const guidIsLink = guid !== null &&
    /^https?:\/\//i.test(plain(guid)) &&
    !/ispermalink\s*=\s*["']false["']/i.test(block.match(/<guid(\s[^>]*)?>/i)?.[1] ?? "");
  const link = linkText(plain(inner(block, "feedburner:origLink"))) ||
    linkText(plain(inner(block, "link"))) ||
    (guidIsLink ? plain(guid) : "");
  const creators = inners(block, "dc:creator").map((c) => person(plain(c))).filter(Boolean);
  const author = creators.length > 0
    ? creators.join(", ")
    : person(rssAuthor(plain(inner(block, "author"))));
  const date = plain(inner(block, "pubDate")) || plain(inner(block, "dc:date")) ||
    plain(inner(block, "published")) || plain(inner(block, "updated"));
  return {
    title: plain(inner(block, "title")),
    link,
    author,
    date,
    image: imageIn(block),
  };
}

function atomItem(block: string): RawItem {
  const links = tags(block, "link");
  const alternate = links.find((l) => (l.rel ?? "alternate") === "alternate" && l.href) ??
    links.find((l) => l.href);
  const names = inners(block, "author")
    .map((a) => person(plain(inner(a, "name") ?? a)))
    .filter(Boolean);
  return {
    title: plain(inner(block, "title")),
    link: alternate?.href ?? "",
    author: names.join(", "),
    date: plain(inner(block, "published")) || plain(inner(block, "updated")),
    image: imageIn(block),
  };
}

// A byline as a name: no leading "By", and an email address is no name.
function person(text: string): string {
  const name = text.replace(/^by\s+/i, "").trim();
  return /@/.test(name) ? "" : name;
}

// What RSS gives as a link, if it looks like one: an absolute web address,
// a //host/… one, or a /path on the feed's own site. Anything else (a stray
// word, an empty element) is no link, so the guid gets its turn.
function linkText(text: string): string {
  if (!text || /\s/.test(text)) return "";
  return /^(https?:)?\/\//i.test(text) || text.startsWith("/") ? text : "";
}

// RSS <author> is often "jane@site.com (Jane Doe)": keep the name. A bare
// address isn't an author worth showing.
function rssAuthor(text: string): string {
  if (!text) return "";
  const named = text.match(/\(([^)]+)\)\s*$/);
  if (named) return named[1].trim();
  return /@/.test(text) && !/\s/.test(text) ? "" : text;
}

function imageIn(block: string): string {
  for (const name of ["media:content", "media:thumbnail", "enclosure", "itunes:image"]) {
    for (const attrs of tags(block, name)) {
      const url = attrs.url ?? attrs.href ?? "";
      const type = (attrs.type ?? "").toLowerCase();
      const medium = (attrs.medium ?? "").toLowerCase();
      const isImage = name === "media:thumbnail" || name === "itunes:image" ||
        medium === "image" || type.startsWith("image/") ||
        (!type && !medium && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url));
      if (url && isImage) return url;
    }
  }
  // The first real <img> in the item's own HTML: not an emoji, not a
  // tracking pixel.
  for (const name of ["content:encoded", "content", "description", "summary"]) {
    const html = inner(block, name);
    if (!html) continue;
    const decoded = decodeEntities(unwrapCdata(html));
    for (const m of decoded.matchAll(/<img\b([^>]*)>/gi)) {
      const attrs = attributes(m[1]);
      const src = attrs.src ?? "";
      const tiny = Number(attrs.width) <= 2 || Number(attrs.height) <= 2;
      if (!src.startsWith("https://")) continue;
      if (/wp-smiley|emoji/i.test(attrs.class ?? "")) continue;
      if (/\/\/(s\.w\.org|pixel\.wp\.com|stats\.wp\.com|feeds\.feedburner\.com)\//i.test(src)) continue;
      if ((attrs.width || attrs.height) && tiny) continue;
      return src;
    }
  }
  return "";
}

// --- Rows ----------------------------------------------------------------------

// A link resolved against the feed's address. An empty one is no link (it
// would otherwise resolve to the feed itself).
function absolute(link: string, base: string): string | null {
  if (!link.trim()) return null;
  try {
    const u = new URL(link, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function isoDate(text: string): string | null {
  if (!text) return null;
  const t = Date.parse(text);
  if (!Number.isFinite(t)) return null;
  // Feeds sometimes stamp items in the future; keep the date but not past now
  // by more than a day.
  return new Date(Math.min(t, Date.now() + 24 * 60 * 60 * 1000)).toISOString();
}

// One feed's items as catalog rows: only items with a title and a web link,
// one row per work, nothing older than `oldest`.
export function catalogRows(xml: string, feed: FeedSource, oldest: Date): CatalogRow[] {
  const rows = new Map<string, CatalogRow>();
  for (const item of readItems(xml)) {
    const title = cut(item.title, 300).trim();
    const linked = absolute(item.link, feed.url);
    if (!title || !linked) continue;
    const url = cleanUrl(linked);
    // Feeds mix in video and audio; the catalog is for reading.
    if (/\/(videos?|podcasts?|audio|listen|iplayer|sounds)(\/|$)/i.test(new URL(url).pathname)) continue;
    const published = isoDate(item.date);
    if (published && Date.parse(published) < oldest.getTime()) continue;
    const image = absolute(item.image, feed.url);
    const id = workIdFor(url);
    if (rows.has(id)) continue;
    rows.set(id, {
      id,
      url,
      title,
      author: item.author ? cut(item.author, 200) : null,
      source: feed.publication,
      image: image && image.startsWith("https://") && image.length <= 2000 ? image : null,
      form: feed.form,
      published_at: published,
      feed_id: feed.id,
    });
  }
  return [...rows.values()];
}
