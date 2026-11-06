// What a link, or the page a reader has open, can tell us about a piece
// when our own fetch can't. Paywalled publications turn the fetcher away at
// the door, which used to mean typing the title and the publication by hand.
// Pure: no network, safe to import anywhere.

import { slugify } from "@/lib/slug";

// Publications by address, named the way they name themselves (the same
// spelling their own pages give when we can read them, so one publication
// lands on one source page). Covers the places that refuse the fetcher and
// the ones people read most; anything else keeps its hostname.
const PUBLICATIONS: Record<string, string> = {
  "404media.co": "404 Media",
  "aeon.co": "Aeon",
  "apnews.com": "AP News",
  "artforum.com": "Artforum",
  "axios.com": "Axios",
  "bbc.co.uk": "BBC",
  "bbc.com": "BBC",
  "bloomberg.com": "Bloomberg",
  "bostonglobe.com": "The Boston Globe",
  "defector.com": "Defector",
  "dissentmagazine.org": "Dissent",
  "economist.com": "The Economist",
  "esquire.com": "Esquire",
  "foreignaffairs.com": "Foreign Affairs",
  "foreignpolicy.com": "Foreign Policy",
  "ft.com": "Financial Times",
  "gq.com": "GQ",
  "granta.com": "Granta",
  "harpers.org": "Harper's Magazine",
  "hbr.org": "Harvard Business Review",
  "hyperallergic.com": "Hyperallergic",
  "jacobin.com": "Jacobin",
  "latimes.com": "Los Angeles Times",
  "lareviewofbooks.org": "Los Angeles Review of Books",
  "lithub.com": "Literary Hub",
  "lrb.co.uk": "London Review of Books",
  "medium.com": "Medium",
  "motherjones.com": "Mother Jones",
  "newrepublic.com": "The New Republic",
  "newstatesman.com": "New Statesman",
  "newyorker.com": "The New Yorker",
  "noemamag.com": "Noema",
  "npr.org": "NPR",
  "nybooks.com": "The New York Review of Books",
  "nymag.com": "New York Magazine",
  "nytimes.com": "The New York Times",
  "pitchfork.com": "Pitchfork",
  "poetryfoundation.org": "Poetry Foundation",
  "politico.com": "Politico",
  "propublica.org": "ProPublica",
  "quantamagazine.org": "Quanta Magazine",
  "restofworld.org": "Rest of World",
  "reuters.com": "Reuters",
  "rollingstone.com": "Rolling Stone",
  "scientificamerican.com": "Scientific American",
  "semafor.com": "Semafor",
  "slate.com": "Slate",
  "technologyreview.com": "MIT Technology Review",
  "texasmonthly.com": "Texas Monthly",
  "theathletic.com": "The Athletic",
  "theatlantic.com": "The Atlantic",
  "thebaffler.com": "The Baffler",
  "thecut.com": "The Cut",
  "thedriftmag.com": "The Drift",
  "theguardian.com": "The Guardian",
  "theinformation.com": "The Information",
  "thenation.com": "The Nation",
  "theparisreview.org": "The Paris Review",
  "thepointmag.com": "The Point",
  "theringer.com": "The Ringer",
  "theverge.com": "The Verge",
  "time.com": "TIME",
  "vanityfair.com": "Vanity Fair",
  "vox.com": "Vox",
  "vulture.com": "Vulture",
  "washingtonpost.com": "The Washington Post",
  "wired.com": "WIRED",
  "wsj.com": "The Wall Street Journal",
};

// The publication at this host, if it is one we know by name. Subdomains
// count: "cooking.nytimes.com" is still The New York Times.
export function publicationName(host: string | null): string | null {
  if (!host) return null;
  const labels = host.toLowerCase().replace(/^www\./, "").split(".");
  for (let i = 0; i + 1 < labels.length; i++) {
    const name = PUBLICATIONS[labels.slice(i).join(".")];
    if (name) return name;
  }
  return null;
}

// Words a headline keeps lowercase, except at either end.
const SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "or", "over", "the", "to", "via", "vs", "with",
]);

// Article ids that ride along in an address: a long number, a hex hash, or a
// mixed letters-and-digits code. Years and small numbers are words.
function looksLikeId(token: string): boolean {
  if (/^\d+$/.test(token)) return token.length >= 5;
  if (!/\d/.test(token)) return false;
  if (token.length >= 6 && /^[0-9a-f]+$/i.test(token)) return true;
  return token.length >= 8 && /[a-z]/i.test(token);
}

const isWord = (token: string) => /^\p{L}[\p{L}'’]*$/u.test(token);

// A starting title from the address. Most publications build the address
// out of the headline ("/2026/01/04/opinion/the-case-for-reading-aloud.html"),
// so when the page won't tell us its title, the link often still does. It
// comes back in headline case with the punctuation gone: a guess to correct,
// and the form says so. Null when the address holds no headline (an id, a
// date, a single word).
export function titleFromUrl(rawUrl: string): string | null {
  let segments: string[];
  try {
    segments = new URL(rawUrl).pathname.split("/").filter(Boolean);
  } catch {
    return null;
  }

  // The headline is usually the last part of the path; when that is only an
  // id, it is the part before it.
  for (const raw of segments.reverse()) {
    let segment = raw;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      // keep the raw text
    }
    const tokens = segment
      .replace(/\.(html?|php|aspx?|shtml)$/i, "")
      .split(/[-_+\s]+/)
      .filter(Boolean);
    while (tokens.length && looksLikeId(tokens[tokens.length - 1])) tokens.pop();
    while (tokens.length && looksLikeId(tokens[0])) tokens.shift();

    const words = tokens.filter(isWord);
    const letters = words.join("").length;
    // A headline is mostly words, and more than one of them.
    if (words.length < 2 || letters < 8 || words.length * 2 < tokens.length) {
      continue;
    }

    const title = tokens
      .map((token, i) => {
        const lower = token.toLowerCase();
        const edge = i === 0 || i === tokens.length - 1;
        if (!edge && SMALL_WORDS.has(lower)) return lower;
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
    return title.slice(0, 140);
  }
  return null;
}

// Titles some sites hand a visitor they take for a bot: "Just a moment...",
// "Attention Required! | Cloudflare", "Bloomberg - Are you a robot?". Not the
// piece's title, so not one to save. Matched as the whole title, or a whole
// part of it beside the site's name, so an essay called "Just a Moment in
// Time" is left alone.
const WALL_TITLES = new Set([
  "just a moment",
  "attention required",
  "access denied",
  "access to this page has been denied",
  "are you a robot",
  "robot or human",
  "pardon our interruption",
  "please verify you are a human",
  "verify you are human",
  "security check",
  "403 forbidden",
]);

export function isWallTitle(title: string): boolean {
  return title
    .split(/\s+[|\-–—]\s+/)
    .some((part) =>
      WALL_TITLES.has(
        part
          .toLowerCase()
          .replace(/[^a-z0-9 ]+/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      ),
    );
}

// A browser tab's title usually ends with the publication: "Headline - The
// New York Times", "Headline | The Atlantic". Drop that ending when it is the
// publication, and only then.
export function tidyPageTitle(title: string, source: string | null): string {
  const text = title.replace(/\s+/g, " ").trim();
  if (!source) return text;
  const match = /^(.*\S)\s+[|\-–—·]\s+([^|–—·]+)$/.exec(text);
  if (match && slugify(match[2]) === slugify(source)) return match[1];
  return text;
}

// Details a reader's own browser read from the page they had open: the
// "Log this" bookmark sends title, author, source and image along with the
// link, and a phone's share sheet sends a title. They arrive as text in an
// address, so each is checked and trimmed before the form sees it.
export interface PageDetails {
  title?: string;
  author?: string;
  source?: string;
  image?: string;
}

const text = (value: string | undefined, max: number): string =>
  (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const looksLikeAddress = (value: string) => /^(https?:\/\/|www\.)/i.test(value);

export function pageDetails(
  params: { title?: string; author?: string; source?: string; image?: string },
  url: string,
): PageDetails {
  let host: string | null = null;
  try {
    host = new URL(url).hostname;
  } catch {
    // no host, no publication name
  }

  const details: PageDetails = {};

  const source = text(params.source, 120);
  if (source && !looksLikeAddress(source)) details.source = source;

  const title = tidyPageTitle(
    text(params.title, 300),
    details.source ?? publicationName(host),
  );
  // A share sheet with nothing better sends the link as the title.
  if (title && !looksLikeAddress(title) && !isWallTitle(title)) {
    details.title = title;
  }

  // Bylines arrive as "By Jane Doe"; some sites put a profile address there.
  const author = text(params.author, 200).replace(/^by\s+/i, "");
  if (author && !looksLikeAddress(author)) details.author = author;

  const image = (params.image ?? "").trim();
  if (image && image.length <= 2000) {
    try {
      if (new URL(image).protocol === "https:") details.image = image;
    } catch {
      // not an address
    }
  }

  return details;
}
