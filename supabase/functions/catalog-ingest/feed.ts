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
  if (!text.includes("&")) return text;
  let out = text;
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

// CDATA sections opened. A scan, not a pattern, so a section that never
// closes ends the scan instead of being retried at every opener.
function unwrapCdata(text: string): string {
  if (!text.includes("<![CDATA[")) return text;
  let out = "";
  let at = 0;
  for (;;) {
    const open = text.indexOf("<![CDATA[", at);
    const close = open === -1 ? -1 : text.indexOf("]]>", open + 9);
    if (close === -1) return out + text.slice(at);
    out += text.slice(at, open) + text.slice(open + 9, close);
    at = close + 3;
  }
}

// A field's inner text as plain text: CDATA opened, entities decoded, any
// HTML inside stripped, whitespace collapsed.
export function plain(raw: string | null | undefined): string {
  if (!raw) return "";
  let text = unwrapCdata(raw);
  text = decodeEntities(text);
  text = withoutTags(text);
  text = decodeEntities(text);
  return wellFormed(text).replace(/\s+/g, " ").trim();
}

// HTML tags out of decoded text. Inline formatting closes up, so
// "<i>Nobody's Ever Asked Me That</i>: Adam Conover" reads as one title; any
// other tag is a break. Text after the last ">" can't hold a tag, so the
// patterns only read up to it, and a run of "<" with nothing to close it
// costs one pass.
function withoutTags(text: string): string {
  const end = text.lastIndexOf(">") + 1;
  if (end === 0) return text;
  const head = text.slice(0, end)
    .replace(/<\/?(?:i|em|b|strong|u|s|cite|q|span|a|small|sup|sub|mark|abbr)\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, " ");
  return head + text.slice(end);
}

// The start of a field as plain text, at most `max` characters. Only the
// field's first stretch of text is read, so a long body costs what a short
// one does. Markup in front of the text (a lead <img> with a long srcset)
// is stepped over first, so the stretch starts at the text.
function opening(raw: string | null, max: number): string {
  if (!raw) return "";
  let at = 0;
  for (;;) {
    while (at < raw.length && /\s/.test(raw[at])) at++;
    if (raw.startsWith("<![CDATA[", at)) {
      at += 9;
      continue;
    }
    // A tag as markup or as escaped text ("&lt;img …&gt;").
    const [start, end] = raw.startsWith("&lt;", at) ? ["&lt;", "&gt;"] : raw[at] === "<" ? ["<", ">"] : ["", ""];
    if (!start) break;
    const close = raw.indexOf(end, at + start.length);
    if (close === -1) break;
    at = close + end.length;
  }
  let head = raw.slice(at, at + max * 5).replace(/<!\[CDATA\[|\]\]>/g, "");
  // A tag cut off at the end of the stretch is left out.
  const open = head.lastIndexOf("<");
  if (open > head.lastIndexOf(">")) head = head.slice(0, open);
  return cut(plain(head), max);
}

// Text the database will take: no control characters (NUL among them), and
// no half of a surrogate pair left by a bad character reference.
function wellFormed(text: string): string {
  const clean = text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "");
  return clean.replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, "");
}

// Cut to `max` characters without splitting one in two (a surrogate pair is
// one character).
function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  let at = 0;
  for (let n = 0; n < max && at < text.length; n++) {
    const high = text.charCodeAt(at);
    const low = text.charCodeAt(at + 1);
    at += high >= 0xd800 && high <= 0xdbff && low >= 0xdc00 && low <= 0xdfff ? 2 : 1;
  }
  return text.slice(0, at);
}

// Letters and digits only, accents folded: for comparing a name in a title
// with a folder of a link or a byline.
function squash(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Text as a link's slug would spell it: "SWALLOW!" is "swallow".
function slug(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, "and").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// --- Elements ------------------------------------------------------------------

function escapeName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Text with ASCII letters lowercased. Tag names are ASCII, and a position
// found in the result holds in the original: toLowerCase alone turns "İ"
// into two characters.
function asciiLower(text: string): string {
  const lower = text.toLowerCase();
  return lower.length === text.length ? lower : text.replace(/[A-Z]+/g, (s) => s.toLowerCase());
}

// The lowercased copy of the block read last, so an item's fields share one.
let lowered = { text: "", lower: "" };
function lowerOf(text: string): string {
  if (lowered.text !== text) lowered = { text, lower: asciiLower(text) };
  return lowered.lower;
}

// The inner content of the first <name ...>...</name> in a block, or null.
function inner(block: string, name: string): string | null {
  return inners(block, name, 1)[0] ?? null;
}

// A reader of an item's fields that reads each one once: the body fields
// are long, and several rules look at them.
type Fields = (name: string) => string | null;
function fieldsOf(block: string): Fields {
  const seen = new Map<string, string | null>();
  return (name) => {
    if (!seen.has(name)) seen.set(name, inner(block, name));
    return seen.get(name) ?? null;
  };
}

// Every inner content of <name>...</name> in a block, found by scanning
// forward. A self-closing <name/> has none. An opener with no closer ends
// the scan, so unclosed openers cost one pass, not one pass each.
function inners(block: string, name: string, max = Infinity): string[] {
  const lower = lowerOf(block);
  const open = `<${name.toLowerCase()}`;
  const close = `</${name.toLowerCase()}`;
  const out: string[] = [];
  let at = 0;
  while (out.length < max) {
    const start = lower.indexOf(open, at);
    if (start === -1) break;
    const next = lower[start + open.length] ?? "";
    if (next !== ">" && !/\s/.test(next)) {
      at = start + 1;
      continue;
    }
    const gt = lower.indexOf(">", start);
    if (gt === -1) break;
    if (lower[gt - 1] === "/") {
      at = gt + 1;
      continue;
    }
    let end = lower.indexOf(close, gt);
    while (end !== -1 && !closesAt(lower, end + close.length)) end = lower.indexOf(close, end + 1);
    if (end === -1) break;
    out.push(block.slice(gt + 1, end));
    at = end + close.length;
  }
  return out;
}

// Whether a closing tag's name ends at `at`: only space may come before ">".
function closesAt(text: string, at: number): boolean {
  let i = at;
  while (i < text.length && /\s/.test(text[i])) i++;
  return text[i] === ">";
}

// Every opening (or self-closing) tag <name ...> in a block, as its
// attributes. Text after the last ">" can't hold a whole tag, so an opener
// left open isn't read to the end of the block again and again.
function tags(block: string, name: string): Record<string, string>[] {
  const re = new RegExp(`<${escapeName(name)}(\\s[^>]*?)?\\/?>`, "gi");
  return [...block.slice(0, block.lastIndexOf(">") + 1).matchAll(re)].map((m) => attributes(m[1] ?? ""));
}

function attributes(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/(?:^|\s)([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
    out[m[1].toLowerCase()] = decodeEntities(m[3] ?? m[4] ?? "");
  }
  return out;
}

// --- Items ---------------------------------------------------------------------

export interface RawItem {
  title: string;
  link: string;
  author: string; // the writers, cleaned up
  byline: string; // the author elements as the feed gives them
  date: string;
  image: string;
  labels: string[]; // RSS <category> text, Atom <category> label or term
  summary: string; // the opening of the description or summary, plain
}

export function readItems(xml: string, publication = ""): RawItem[] {
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
  return blocks.map((block) => (atom ? atomItem(block, publication) : rssItem(block, publication)));
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
  const lower = asciiLower(doc);
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

function rssItem(block: string, publication: string): RawItem {
  const field = fieldsOf(block);
  // Some feeds carry the real address in feedburner:origLink, with a
  // tracking redirect in <link>.
  const guid = inner(block, "guid");
  const guidIsLink = guid !== null &&
    /^https?:\/\//i.test(plain(guid)) &&
    (tags(block, "guid")[0]?.ispermalink ?? "").toLowerCase() !== "false";
  const link = linkText(plain(inner(block, "feedburner:origLink"))) ||
    linkText(plain(inner(block, "link"))) ||
    (guidIsLink ? plain(guid) : "");
  const creators = inners(block, "dc:creator").map(plain).filter(Boolean);
  const byline = creators.length > 0 ? creators.join(", ") : rssAuthor(plain(inner(block, "author")));
  const names = creators.length > 0
    ? creators.map((c) => person(c, publication)).filter(Boolean).join(", ")
    : person(byline, publication);
  const date = plain(inner(block, "pubDate")) || plain(inner(block, "dc:date")) ||
    plain(inner(block, "published")) || plain(inner(block, "updated"));
  return {
    title: plain(inner(block, "title")),
    link,
    author: leadingByline(field, publication) || withoutArtists(names, field),
    byline,
    date,
    image: imageIn(block, field, link),
    labels: inners(block, "category").map(plain).filter(Boolean),
    summary: opening(field("description"), 200),
  };
}

function atomItem(block: string, publication: string): RawItem {
  const field = fieldsOf(block);
  const links = tags(block, "link");
  const alternate = links.find((l) => (l.rel ?? "alternate") === "alternate" && l.href) ??
    links.find((l) => l.href);
  const credits = inners(block, "author").map((a) => plain(inner(a, "name") ?? a)).filter(Boolean);
  return {
    title: plain(inner(block, "title")),
    link: alternate?.href ?? "",
    author: credits.map((c) => person(c, publication)).filter(Boolean).join(", "),
    byline: credits.join(", "),
    date: plain(inner(block, "published")) || plain(inner(block, "updated")),
    image: imageIn(block, field, alternate?.href ?? ""),
    labels: tags(block, "category").map((c) => (c.label || c.term || "").trim()).filter(Boolean),
    summary: opening(field("summary"), 200),
  };
}

// --- Bylines -------------------------------------------------------------------

// Credits that name no writer: a desk or house account ("Staff", "The
// Editors", "TIME Staff", "Semafor Events", "Guardian community team").
const HOUSE = /^(?:the\s+)?(?:editors|editorial board|staff|our readers)$|\s(?:staff|editors|events|insights|community team|reporters)$/i;

// A credit and a publication's name, compared without "The", "Magazine", "News",
// "Editors of" or a desk word: "The Editors of GQ" and "GQ" are one name,
// and so are "Bloomberg News" and "Bloomberg".
function houseKey(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/^the\s+/, "")
    .replace(/^editors of\s+(?:the\s+)?/, "").replace(/\s+(?:magazine|sport|news)$/, "").trim();
}

// A byline as a name: no leading "By", and an email address is no name.
// Also gone: the publication itself as a credit, a desk or house account, a
// lowercase CMS username, a lone "and" left between two <dc:creator>s, and
// the role, place or photo credit some papers glue onto the name.
function person(text: string, publication = ""): string {
  // A byline longer than any real one is cut before it is read.
  let name = cut(text, 400).replace(/^by\s+/i, "").trim();
  if (/@/.test(name)) return "";
  name = name
    // "The Associated Press: ERIK VERDUZCO, …" (The Boston Globe's wire bylines).
    .replace(/^(?:the\s+)?associated press:\s*/i, "")
    // "Victoria Turk. Photographs by Alicia Canter", "… Photographs and video by Matteo Fabi"
    .replace(/\.\s+(?:photographs?|illustrations?|pictures?|video)(?:\s+and\s+(?:photographs?|video|illustrations?))?\s+by\s+.*$/i, "")
    // "Interviews by Georgina Lawton", "As told to Dave Simpson"
    .replace(/^(?:interviews?\s+by|as told to)\s+/i, "")
    .replace(/,\s*as told to\s+/i, ", ")
    // A live blog's shifts: "Maya Yang (now); Lucy Campbell (earlier)"
    .replace(/\s*\((?:now|earlier)\)/gi, "")
    .replace(/\s*;\s*/g, ", ")
    // "Richard Luscombe and agency"
    .replace(/\s+and\s+agenc(?:y|ies)$/i, "")
    // "Oliver Milman in Antalya, Turkey", "Laurence Blair in Concepción, Maximiliano Manzoni in Asunción, and …".
    // A place ends at a full stop, so it never runs on into the next sentence.
    .replace(/\s+in\s+\p{Lu}[^,().]*?(?:,\s*\p{Lu}[^,().]*?)??(?=,?\s+and\s+|,\s+\p{Lu}(?:(?!\s+and\s)[^,])*?\s+in\s+\p{Lu}|$)/gu, "")
    // "Tyler Chin , Gerald Ortiz"
    .replace(/\s+,/g, ",")
    .trim();
  if (/^(?:and|&)$/i.test(name) || /^[a-z0-9._-]+$/.test(name)) return "";
  const house = (part: string) =>
    HOUSE.test(part) || /^agenc(?:y|ies)$/i.test(part) || (publication !== "" && houseKey(part) === houseKey(publication));
  return name.split(/,\s+/)
    .map(withoutRole)
    // "Karen Yuan and Guardian staff": the writer stays and the house credit goes.
    .map((part) => {
      const joined = part.match(/^(.+)\s+and\s+(.+?)$/);
      if (!joined || !house(joined[2])) return part;
      return house(joined[1]) ? "" : joined[1];
    })
    .filter((part) => part && !house(part))
    .map(capitalized)
    .join(", ");
}

// "Ian Sample Science editor", "Emma Graham-Harrison Chief Middle East
// correspondent": the name is a first name, an initial or none, and a last
// name, and the rest up to the role word is the role. A credit that is only
// a role ("Senior editor") goes. Any other shape stays as written.
function withoutRole(part: string): string {
  if (!/\s(?:editor|correspondent)$/.test(part)) return part;
  const named = part.match(/^(\p{Lu}[\p{L}’'-]*(?:\s+\p{Lu}\.?)?\s+\p{Lu}[\p{L}’'-]*)\s+\p{Lu}[^,]*\s(?:editor|correspondent)$/u);
  if (named) return named[1];
  return /^\p{Lu}\p{Ll}*(?:\s+\p{Ll}+)*\s(?:editor|correspondent)$/u.test(part) ? "" : part;
}

// Names set in capitals (wire bylines: "NICHOLAS RICCARDI and SOPHIE BATES")
// in ordinary case. Only a name of two or more words with no lowercase
// letter and at least four letters changes, so "JK Mehta", "KATHY McCORMACK"
// and an acronym stay as written.
function capitalized(part: string): string {
  return part.split(/(\s+and\s+)/).map((p) => {
    if (/\p{Ll}/u.test(p) || !/\S\s+\S/.test(p) || p.replace(/[^\p{L}]/gu, "").length < 4) return p;
    return p.toLowerCase().replace(/(^|[\s.'’-])(\p{L})/gu, (_, before: string, c: string) => before + c.toUpperCase());
  }).join("");
}

// A name-shaped byline: capitalized words, with the particles names use.
const NAME_SHAPED = /^\p{Lu}[\p{L}\p{M}.'’-]*(?:\s+(?:\p{Lu}[\p{L}\p{M}.'’-]*|van|von|de|der|den|da|di|du|la|le|del|bin|ibn|al|and))*$/u;

// A byline printed at the very top of the item's HTML ("<label>By <a>Steve
// Oney</a>"): sites that reprint pieces (The Stacks Reader) put the writer
// there and the uploader in <dc:creator>.
function leadingByline(field: Fields, publication: string): string {
  for (const name of ["content:encoded", "description"]) {
    const html = field(name);
    if (!html) continue;
    const start = html.slice(0, 2000);
    if (!start.includes("By")) return "";
    const head = decodeEntities(start.replace(/^\s*<!\[CDATA\[/, ""));
    const m = head.match(/^\s*(?:<[^>]+>\s*)*By\s+(?:<a\b[^>]*>\s*)?([^<]{3,80}?)\s*</);
    const found = m ? person(plain(m[1]), publication) : "";
    return NAME_SHAPED.test(found) ? found : "";
  }
  return "";
}

// Co-bylines that the item's own captions credit as the art ("Artwork by
// Turath Studio") come out, and so does a name the byline repeats.
function withoutArtists(byline: string, field: Fields): string {
  const names = byline.split(/,\s*(?:and\s+)?|\s+and\s+/).map((n) => n.trim()).filter(Boolean);
  if (names.length < 2) return byline;
  const raw = field("content:encoded") ?? field("description") ?? "";
  const lower = raw.toLowerCase();
  // No credit word near a "by", no art credit: the usual case, read cheaply.
  if (!/(?:photo|art|illustration|etching|painting|collage)[\s\S]{0,80}?\bby\b/.test(lower)) {
    return names.length === new Set(names).size ? byline : [...new Set(names)].join(", ");
  }
  let body: string | null = null;
  const kept = [...new Set(names)].filter((n, i) => {
    // Past a dozen names the list is no ordinary byline, and each name read
    // would cost a pass over the body.
    if (i === 0 || i > 12) return true;
    // A name the item's HTML never spells out can't be credited there, so
    // the body is only read as text when a long word of the name is in it.
    const word = n.toLowerCase().split(/[^a-z]+/).reduce((a, b) => (b.length > a.length ? b : a), "");
    if (word.length >= 3 && !lower.includes(word)) return true;
    body ??= plain(raw);
    return !new RegExp(`\\b(?:photo(?:graph)?s?|art(?:work)?|illustrations?|etching|cover art|paintings?|collage)\\s+by\\s+${escapeName(n)}\\b`, "i").test(body);
  });
  return kept.length === names.length ? byline : kept.join(", ");
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
  const named = text.match(/\(([^()]+)\)\s*$/);
  if (named) return named[1].trim();
  return /@/.test(text) && !/\s/.test(text) ? "" : text;
}

// --- Images --------------------------------------------------------------------

function imageIn(block: string, field: Fields, link: string): string {
  for (const name of ["media:content", "media:thumbnail", "enclosure", "itunes:image"]) {
    let best = "";
    let bestWidth = -1;
    for (const attrs of tags(block, name)) {
      const url = attrs.url ?? attrs.href ?? "";
      const type = (attrs.type ?? "").toLowerCase();
      const medium = (attrs.medium ?? "").toLowerCase();
      const isImage = name === "media:thumbnail" || name === "itunes:image" ||
        medium === "image" || type.startsWith("image/") ||
        (!type && !medium && /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url));
      if (!url || !isImage) continue;
      // Several sizes of one picture (The Guardian lists 140, 460 and 700):
      // the widest. Without widths, the first.
      const width = Number(attrs.width) || 0;
      if (!best || width > bestWidth) {
        best = url;
        bestWidth = width;
      }
    }
    if (best) return best;
  }
  // Only HBR's feed has <feature-image-uri>: the largest srcset size up to 1280 wide.
  const at = block.indexOf("<feature-image-uri");
  const feature = at === -1 ? null : block.slice(at).match(/^<feature-image-uri(\s[^>]*)?>([^<]*)</i);
  if (feature) {
    const sizes = (attributes(feature[1] ?? "").srcset ?? "").split(",")
      .map((s) => s.trim().split(/\s+/))
      .map(([u, w]) => ({ u, w: parseInt(w ?? "", 10) || 0 }))
      .filter((s) => s.u && s.w <= 1280)
      .sort((a, b) => b.w - a.w);
    const url = sizes[0]?.u || plain(feature[2]);
    if (url) return url;
  }
  // The first real <img> in the item's own HTML: not an emoji, not a
  // tracking pixel.
  for (const name of ["content:encoded", "content", "description", "summary"]) {
    const html = field(name);
    if (!html) continue;
    const decoded = decodeEntities(unwrapCdata(html));
    for (const m of decoded.slice(0, decoded.lastIndexOf(">") + 1).matchAll(/<img\b([^>]*)>/gi)) {
      const attrs = attributes(m[1]);
      let src = attrs.src ?? "";
      // An http image on the article's own site: the site serves it over
      // https too.
      const site = siteHost(src).replace(/^www\./, "");
      if (src.startsWith("http://") && link && site === siteHost(link).replace(/^www\./, "")) src = "https://" + src.slice(7);
      const tiny = Number(attrs.width) <= 2 || Number(attrs.height) <= 2;
      if (!src.startsWith("https://")) continue;
      if (/wp-smiley|emoji/i.test(attrs.class ?? "")) continue;
      if (/\/\/(s\.w\.org|pixel\.wp\.com|stats\.wp\.com|feeds\.feedburner\.com)\//i.test(src)) continue;
      if (/\/tracking\/|[-_]pixel\.(png|gif)\b/i.test(src)) continue;
      if ((attrs.width || attrs.height) && tiny) continue;
      return src;
    }
  }
  return "";
}

// A lead image at a size worth showing on a card. Each rule is one image
// CDN, known by its host, that takes a size in the address; the result is
// the size the page's own og:image asks for. Other hosts are left alone.
export function sized(url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const h = u.hostname;
  // Sanity (Semafor) sends the original upload unless a width is asked for.
  if (h === "img.semafor.com" && !u.search) {
    u.search = "w=1200&fm=jpg";
    return u.href;
  }
  // Condé Nast (Pitchfork, WIRED, The New Yorker, GQ, Vanity Fair): master/pass is the original.
  if (/^media\.[a-z]+\.com$/.test(h) && /^\/photos\/[0-9a-f]{24}\/master\/pass\//.test(u.pathname)) {
    return url.replace("/master/pass/", "/master/w_1280,c_limit/");
  }
  // Brightspot (NPR): resize/WxH! at the original size.
  if (h.endsWith(".brightspotcdn.com")) {
    return url.replace(/\/resize\/(\d+)x\d+!\//, (m, w: string) => (+w > 1200 ? "/resize/1200/" : m));
  }
  // Hearst (Esquire): no size asked for is the original.
  if (h === "hips.hearstapps.com" && !u.search) {
    u.search = "resize=1200:*";
    return u.href;
  }
  // The BBC's ichef takes the width in the path; its feed asks for 240.
  if (h === "ichef.bbci.co.uk") {
    return url.replace(/\/ace\/standard\/(\d+)\//, (m, w: string) => (+w < 976 ? "/ace/standard/976/" : m));
  }
  return url;
}

// --- What an item is -----------------------------------------------------------

// Path folders that hold something other than a piece to read.
const NOT_READING_FOLDERS: [RegExp, string][] = [
  [/^(?:videos?|podcasts?|audio|listen|iplayer|sounds)$/, "video or audio"],
  [/^sponsored$/, "sponsored"],
  [/^(?:events|sessions)$/, "event"],
  [/^cartoons$/, "cartoon"],
  [/^photos$/, "photo gallery"],
  // ProPublica's reader call-outs; the folder name is its own.
  [/^getinvolved$/, "call-out"],
  [/^press-releases?$/, "press release"],
  // Texas Monthly's press releases; the folder name is its own.
  [/^press-room$/, "press release"],
  // The Wall Street Journal's affiliate shopping section; the folder name is its own.
  [/^buyside$/, "shopping list"],
];

// A date as daily features title themselves: "November 12", "Nov. 12th",
// "Wednesday, November 12".
const MONTH_DAY = "(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day,\\s+)?" +
  "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?";
// A named daily feature: "Word Wrangler: November 12, 2026", "Slate Mini
// Crossword for Nov. 12, 2026". A title that is only a date ("March 13,
// 2020", a poem) has no name in front and stays.
const DAILY_FEATURE = new RegExp(`.{3}(?::\\s+${MONTH_DAY}(?:,\\s+\\d{4})?|\\bfor\\s+${MONTH_DAY},\\s+\\d{4})$`, "i");

// The month, day and year (when given) a dated title ends with.
const TITLE_DAY = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s+(\d{4}))?$/i;

// Whether a dated title names the item's own day. A daily feature titles
// itself with the day it runs, so the item's date is that day or one either
// side of it (time zones and early posting). A news headline that ends in
// another date ("Sentencing set for March 4, 2027") is no daily feature. An
// item with no date is taken at its title's word.
function titledForItsDay(title: string, date: string): boolean {
  const m = title.match(TITLE_DAY);
  const iso = isoDate(date);
  if (!m || !iso) return true;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === m[1].toLowerCase());
  const t = Date.parse(iso);
  return [-1, 0, 1].some((k) => {
    const d = new Date(t + k * 864e5);
    return d.getUTCMonth() === month && d.getUTCDate() === Number(m[2]) && (!m[3] || d.getUTCFullYear() === Number(m[3]));
  });
}

// A gift list's title: a guide, "best … gifts for", or a count of gifts for
// someone ("15 gifts for elegant gents", "12 Christmas buys that are …").
const GIFT_TITLE = /\bgift (?:guide|generator)\b|\bbest (?:\S+\s+){0,3}gifts (?:for|under|of)\b|^\d+\+?\s+(?:\S+\s+){0,4}?(?:gifts|presents|christmas buys)\s+(?:for|under|from|that|to)\b|^gifts (?:for|under)\b/i;

// Why an item isn't a piece to read, or "" when it is one: ads, games,
// listings, galleries, podcasts and other pages that feeds mix in. `title`
// is the item's title as the row would get it, `publication` the feed's name.
export function notReading(item: RawItem, url: string, title: string, publication = ""): string {
  const path = new URL(url).pathname;
  for (const folder of path.toLowerCase().split("/")) {
    for (const [pattern, why] of NOT_READING_FOLDERS) if (pattern.test(folder)) return why;
  }
  // WIRED's coupon pages end their slug in "promo-code", "discount-code" or "-coupon".
  if (/(?:promo|coupon|discount)-codes?\/?$|-coupons?\/?$/i.test(path)) return "coupon page";
  // A game's address names the game and that it is a daily one in the same part
  // ("crossword-slate-mini-daily-puzzle-nov-12-2026", "the-guardian-thursday-quiz-…-trivia-272").
  const game = (part: string) => /crossword|(?:^|-)quiz(?:[-.]|$)|trivia-game/.test(part) && /daily|mini|puzzle|trivia/.test(part);
  if (path.toLowerCase().split("/").some(game)) return "game";
  if (/gift-guide/i.test(path)) return "shopping list";
  // The Economist's market-data tables; no other site uses this folder.
  if (/\/economic-and-financial-indicators\//i.test(path)) return "data table";

  for (const raw of item.labels) {
    const label = raw.trim();
    if (/^(?:sponsored|sponsor content|partner content|paid (?:content|post)|advertorial)$/i.test(label)) {
      return "sponsored";
    }
    // A podcast's episode page. Its full transcript is reading and keeps the label.
    if (/^podcast$|video dept\.?$/i.test(label) && !/^transcript\b/i.test(title)) return "video or audio";
    // Section labels only: The New Yorker's "Cartoons / Daily Cartoon", Politico's "Cartoon Carousel".
    if (/^cartoons?\s*\/|^cartoon carousel$/i.test(label)) return "cartoon";
    if (/(?:^|\/\s*)deals$/i.test(label)) return "shopping deals";
    // GQ's "Shopping / Gifts" and "Shopping / Sales (Style)", The Cut's "holiday gift guides".
    if (/^shopping\s*\/\s*sales\b/i.test(label)) return "shopping deals";
    if (/^shopping\s*\/\s*gifts\b|^(?:holiday )?gift guides?$/i.test(label)) return "shopping list";
    // Vanity Fair's issue credits and Electric Literature's cover reveals; the labels are theirs alone.
    if (/^(?:credits|cover reveals?)$/i.test(label)) return "house page";
    // HBR's recorded events; only HBR uses these series labels.
    if (/^(?:executive live|masterclass)$/i.test(label)) return "event";
  }
  // Longreads alone files links to other sites' stories under a first category of "Editor's Pick".
  // The item is its editor's blurb about a piece published elsewhere.
  if (/^editor['’]s pick$/i.test((item.labels[0] ?? "").trim())) return "pick of another site's piece";

  if (DAILY_FEATURE.test(title) && titledForItsDay(title, item.date)) return "daily feature";
  if (/\b(?:daily|weekly) horoscopes?\b|^(?:math|maths|logic|number|word|chess|daily|weekly|sunday)\s+puzzle\s*:/i.test(title)) {
    return "game";
  }
  if (/^(?:daily )?cartoon\s*:/i.test(title)) return "cartoon";
  // "… – in pictures", "Greta Thunberg and a collapsed building in Brooklyn: photos of the day – Thursday"
  if (/(?:\s[–-]\s|:\s+)(?:in pictures|photos of the day\b.*)$/i.test(title)) return "photo gallery";
  if (/^tell us\s*:|^sign up (?:for|to)\b|^share your thoughts\b/i.test(title)) return "call-out";
  if (/^table of contents$/i.test(title)) return "contents page";
  // The Financial Times's rate tables ("Latest Isa rates"); the wording is its own.
  if (/^latest .+ rates$/i.test(title)) return "data table";
  // The publication's own job ad: "The Economist is recruiting an Audience Editor in London".
  const hiring = title.match(/^(.+?)\s+is (?:recruiting|hiring)\b/i);
  if (hiring && publication && houseKey(hiring[1]) === houseKey(publication)) return "job ad";
  if (GIFT_TITLE.test(title)) return "shopping list";

  // NYRB's podcast episodes sit under /online/ and open "Season 2, Episode 4"; no other feed does.
  if (/^season \d+,? episode \d+\b/i.test(item.summary)) return "video or audio";
  if (/^an? (?:editorial )?cartoon by\b/i.test(item.summary)) return "cartoon";
  // The New Republic's video episodes open "You can watch this episode"; the wording is its own.
  if (/^you can watch this episode\b/i.test(item.summary)) return "video or audio";
  // The Guardian credits its reader call-outs to its "community team"; the credit is its own.
  if (/\bcommunity team$/i.test(item.byline)) return "call-out";
  // Semafor credits its event listings to "Semafor Events"; the credit is its own.
  if (/\bEvents$/.test(item.byline)) return "event";
  return "";
}

// Section labels that mark poems.
// The American Scholar's "Read Me a Poem" series is poems read aloud; the label is its own.
const POEM_LABELS = new Set(["read me a poem"]);

// What the item says it is, when it says so plainly; otherwise the feed's
// form. Literary feeds mix poems and stories in with essays. Only section
// signals count: a folder in the path (/poetry/, /fiction-drama/), a slug or
// a short title that names the poem, a section-style category, or the lead
// image's file name. Topic tags ("Poetry", "Fiction") are not used: most
// feeds put them on reviews and essays about poets and novels.
export function itemForm(url: string, title: string, labels: string[], image: string, fallback: string): string {
  const u = new URL(url);
  const parts = u.pathname.toLowerCase().split("/").filter(Boolean);
  const folders = parts.slice(0, -1);
  const last = parts[parts.length - 1] ?? "";
  if (folders.some((s) => /^(?:poetry|poems?)$/.test(s))) return "poem";
  if (folders.some((s) => /^(?:fiction|fiction-drama|short-fiction|short-stor(?:y|ies))$/.test(s))) return "short story";
  // A slug that is the poem's own ("…-a-poem", "two-poems", "poems-by-…"), not one about poems ("the-best-war-poems").
  if (/(?:^|-)poem$/.test(last) || /^(?:(?:two|three|four|five|six|seven|\d+)-)?poems?(?:-\d+)?$|^(?:(?:two|three|four|five|six|seven|\d+)-)?poems?-by-/.test(last)) {
    return "poem";
  }
  // "A Poem", "Elegy: Two Poems", "Three Sonnets"; not "Collected Poems" or "On Love Poems", which are about poems.
  if (/^(?:[^:]{1,40}:\s*)?(?:(?:two|three|four|five|six|seven|\d+|new)\s+(?:poems|sonnets)|(?:\S+\s+)?(?:poem|sonnet))$/i.test(title)) return "poem";
  for (const raw of labels) {
    const label = raw.toLowerCase().trim();
    // The New Yorker's print sections: "Magazine / Poems", "Magazine / Fiction". A topic ("Culture / Fiction") is no form.
    const section = label.match(/^magazine\s*\/\s*(poems|fiction)$/)?.[1] ?? "";
    if (POEM_LABELS.has(label) || section === "poems") return "poem";
    if (section === "fiction") return "short story";
  }
  // Guernica names its poems' lead images "poetry-…" and The Nation "Nation-poetry-feature.jpg"; the names mean poems only there.
  const file = image.split(/[?#]/)[0].split("/").pop() ?? "";
  if (/(?:^|\.)(?:guernicamag\.com|thenation\.com)$/.test(u.hostname) && /poetry/i.test(file)) return "poem";
  // Guernica names its fiction images "fic-…"; the prefix means fiction only there.
  if (/(?:^|\.)guernicamag\.com$/.test(u.hostname) && /^fic-/i.test(file)) return "short story";
  return fallback;
}

// --- Titles --------------------------------------------------------------------

// An image address's file name, decoded and without its extension:
// ".../Swallow!%20by%20Shygirl.jpg" is "Swallow! by Shygirl". Decoding can
// produce control characters ("%00"), so the result is cleaned like any
// other text the reader keeps.
function fileName(image: string): string {
  const file = (image.split(/[?#]/)[0].split("/").pop() ?? "").slice(0, 300).replace(/\.[a-z0-9]{2,5}$/i, "");
  try {
    return wellFormed(decodeURIComponent(file));
  } catch {
    return wellFormed(file);
  }
}

// Short words a name keeps in lowercase after a capital ("Florence + the
// Machine", "Tyler, the Creator").
const JOINING = new Set([
  "a", "an", "and", "at", "by", "da", "de", "del", "der", "des", "di", "du", "for", "from", "in",
  "la", "le", "les", "n", "n'", "n’", "of", "on", "or", "the", "to", "van", "von", "with", "x", "y",
]);

// Whether a run of words reads as a name. A run in lowercase is more likely
// ordinary words ("a low-key album", a slug-style file name) than a name, so
// it has to open with a capital or a digit; an artist who styles the name in
// lowercase gets the slug's capitalized words instead. A run that opens with
// a capital keeps later words in lowercase only when they are joining words,
// so a sentence's opening ("The national anthem") is no name.
function nameLike(name: string): boolean {
  if (/^\p{Ll}/u.test(name)) return false;
  const words = name.split(/\s+/);
  if (!/^\p{Lu}/u.test(words[0])) return true;
  return words.slice(1).every((w) => !/^\p{Ll}/u.test(w) || JOINING.has(w.toLowerCase()));
}

// A run of whole words in one of `texts` that a link's slug would spell as
// `want`, as that text spells it: "the-cats-miaow" is "The Cat's Miaow" in
// the file name "The Cat's Miaow When You Smiled and Turned Away". A text in
// one case only ("sufjan-worst-christmas-ever-art") tells nothing about
// capitals and is passed over.
function spelledAs(want: string, texts: string[]): string {
  const most = want.split("-").length + 3;
  for (const text of texts) {
    if (!/\p{Lu}/u.test(text) || !/\p{Ll}/u.test(text)) continue;
    // A file name with no spaces puts hyphens or underscores between words.
    const spaced = /\s/.test(text);
    const words = [...text.matchAll(/[^\s_\-–—]+/g)];
    for (let i = 0; i < words.length; i++) {
      for (let j = i; j < words.length && j < i + most; j++) {
        const run = text.slice(words[i].index ?? 0, (words[j].index ?? 0) + words[j][0].length);
        if (slug(run).length > want.length + 2) break;
        let name = run.replace(/^[“"‘'(\[]+|[,.;:”"’')\]]+$/g, "");
        if (slug(name) !== want) name = name.replace(/['’]s$/, "");
        name = spaced ? name.replace(/_+/g, " ") : name.replace(/[-_]+/g, " ");
        if (slug(name) === want && nameLike(name)) return name;
      }
    }
  }
  return "";
}

// What some feeds wrap around a headline or put in place of a byline, taken
// off so a suggestion reads as the piece's own title over its own writer.
// `byline` is the feed's author text as given, empty when it names no one.
// `image` and `summary` are the item's lead image address and the opening of
// its description, where a name can be spelled out.
function tidy(
  title: string,
  author: string,
  byline: string,
  url: string,
  form: string,
  image = "",
  summary = "",
): { title: string; author: string } {
  const u = new URL(url);
  let t = title;
  let a = author;
  // A poem read aloud, titled “The Aconite” by Thomas Noel: the poet is the
  // author. The feed credits the reader (The American Scholar). Only a poem:
  // a review titled “Intermezzo,” by Sally Rooney keeps its reviewer.
  const poet = form === "poem" ? t.match(/^[“"](.+?),?[”"],? by ([A-Z][^,;:]+)$/)?.[2]?.trim() : "";
  if (poet) a = poet;
  // The New Republic credits its shows' episodes to the show ("The Daily Blast With Greg Sargent"): the host is the author.
  const host = u.hostname === "newrepublic.com" ? a.match(/^\S.*\sWith\s+(\p{Lu}[\p{L}.'’-]*(?:\s+\p{Lu}[\p{L}.'’-]*)+)$/u)?.[1] : "";
  if (host) a = host;
  // "James Meek: Across 8 Mile" from a feed that names no author (London
  // Review of Books): the name is the byline when it is also a folder of the
  // link (/v48/n20/james-meek/across-8-mile).
  if (!byline) {
    const m = t.match(/^([^:]{3,60}):\s+(\S.*)$/);
    const folders = u.pathname.split("/").filter(Boolean).slice(0, -1);
    if (m && /\s/.test(m[1].trim()) && folders.map(squash).includes(squash(m[1]))) {
      t = m[2].trim();
      a = m[1].trim();
    }
  }
  // "… | Owen Jones" when Owen Jones is the byline comes off.
  // On The Guardian's site any such tail comes off: it hangs series names there ("… | A kitchen in Rome").
  const tail = t.match(/\s\|\s([^|]+)$/);
  if (tail && tail.index !== undefined && /\S/.test(t.slice(0, tail.index)) &&
    ((a && squash(tail[1]) === squash(a)) || u.hostname === "www.theguardian.com")) {
    t = t.slice(0, tail.index).trim();
  }
  // A section label in front (The Wall Street Journal's "Opinion | ").
  t = t.replace(/^Opinion\s*\|\s+/i, "");
  // A CMS copy's working title at the end ("… - Clone").
  t = t.replace(/\s+[-–—]\s*Clone$/i, "");
  // Pitchfork's reviews title only the album; its pages say "Artist: Album" and the slug holds the artist.
  // (/reviews/albums/shygirl-swallow/, /reviews/albums/daine/in-endless-awe-and-agony/)
  // A slug has no capitals or apostrophes, so the name is taken as the item spells it where it can be:
  // the album's own title when the album is self-titled and not set in capitals, then the lead image's file name, the title's
  // words and the description. With none of them, the slug's words are capitalized ("Sufjan Stevens").
  const parts = u.pathname.split("/").filter(Boolean);
  if (u.hostname === "pitchfork.com" && parts[0] === "reviews" && parts.length >= 3) {
    const rest = parts.slice(2);
    const own = slug(t);
    const artist = own && rest.length === 2 && rest[1] === own
      ? rest[0]
      : own && rest.length === 1 && rest[0].endsWith(`-${own}`)
      ? rest[0].slice(0, -own.length - 1)
      : "";
    if (artist) {
      const name = (own === artist && /\p{Ll}/u.test(t) ? t.trim() : "") || spelledAs(artist, [fileName(image), t, summary]) ||
        artist.split("-").filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      t = `${name}: ${t}`;
    }
  }
  return { title: VISIBLE.test(t) ? t : title, author: a };
}

// A character that shows: not space, not a zero-width or invisible format character.
const VISIBLE = /[^\s\u00ad\u200b-\u200f\u2060-\u2064\ufeff]/;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-11-12" as "Nov 12, 2026".
function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= 31 ? `${MONTHS[m - 1]} ${d}, ${y}` : "";
}

// The day a link's address gives: /2026/11/12/ in the path, or a slug ending
// in a US date as Lapham's Quarterly writes it (rest-history-07-24-26).
function dateInUrl(url: string): string | null {
  const path = new URL(url).pathname;
  const ymd = path.match(/\/(20\d\d)\/(\d\d)\/(\d\d)(?:\/|$)/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
  const mdy = path.match(/-(\d\d)-(\d\d)-(\d\d)\/?$/);
  if (mdy && +mdy[1] >= 1 && +mdy[1] <= 12 && +mdy[2] >= 1 && +mdy[2] <= 31) return `20${mdy[3]}-${mdy[1]}-${mdy[2]}`;
  return null;
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

// A date with no zone ("Thu, 12 Nov 2026 23:30:00", "2026-11-05 23:30:00")
// is read as UTC, so the result is the same wherever the reader runs.
function isoDate(text: string): string | null {
  if (!text) return null;
  const s = text.trim();
  const zoneless = /^\d{4}-\d\d-\d\d[T ]\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(s)
    ? Date.parse(s.replace(" ", "T") + "Z")
    : /\s\d\d?:\d\d(?::\d\d)?$/.test(s) ? Date.parse(s + " GMT") : NaN;
  const t = Number.isFinite(zoneless) ? zoneless : Date.parse(s);
  if (!Number.isFinite(t)) return null;
  // Feeds sometimes stamp items in the future; keep the date but not past now
  // by more than a day.
  return new Date(Math.min(t, Date.now() + 24 * 60 * 60 * 1000)).toISOString();
}

// Feeds whose author element is the account that posted each item and that print no byline elsewhere.
// The Ringer, Emergence Magazine and Public Books: their rows carry no author, since none beats a wrong one.
const POSTER_BYLINES = new Set(["wp.theringer.com", "emergencemagazine.org", "www.publicbooks.org"]);

// One feed's items as catalog rows: only items with a title and a web link
// that are pieces to read, one row per work, nothing older than `oldest`.
export function catalogRows(xml: string, feed: FeedSource, oldest: Date): CatalogRow[] {
  const posterBylines = POSTER_BYLINES.has(siteHost(feed.url));
  const rows = new Map<string, CatalogRow>();
  for (const item of readItems(xml, feed.publication)) {
    const title = cut(item.title, 300).trim();
    const linked = absolute(item.link, feed.url);
    if (!VISIBLE.test(title) || !linked) continue;
    const url = cleanUrl(linked);
    if (notReading(item, url, title, feed.publication)) continue;
    const published = isoDate(item.date);
    if (published && Date.parse(published) < oldest.getTime()) continue;
    const id = workIdFor(url);
    if (rows.has(id)) continue;
    const form = itemForm(url, title, item.labels, item.image, feed.form);
    const named = tidy(title, posterBylines ? "" : item.author, item.byline, url, form, item.image, item.summary);
    const resolved = absolute(item.image, feed.url);
    const image = resolved && sized(resolved);
    rows.set(id, {
      id,
      url,
      // Tidying can put an artist's name in front, so the title is cut again.
      title: cut(named.title, 300),
      author: named.author ? cut(named.author, 200) : null,
      source: feed.publication,
      image: image && image.startsWith("https://") && image.length <= 2000 ? image : null,
      form,
      published_at: published,
      feed_id: feed.id,
    });
  }
  // A recurring feature can repeat its title and byline in every issue
  // (Harper's "Weekly Review", Lapham's Quarterly's "The Rest Is History").
  // Within one read of a feed, each such row gets its date, so the
  // suggestions can be told apart.
  const same = new Map<string, CatalogRow[]>();
  for (const row of rows.values()) {
    const key = `${row.title.toLowerCase()}\n${(row.author ?? "").toLowerCase()}`;
    const group = same.get(key);
    if (group) group.push(row);
    else same.set(key, [row]);
  }
  for (const group of same.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      const day = row.published_at ? row.published_at.slice(0, 10) : dateInUrl(row.url);
      const label = day ? dayLabel(day) : "";
      if (label) row.title = `${cut(row.title, 300 - label.length - 3)} (${label})`;
    }
  }
  return [...rows.values()];
}

function siteHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}
