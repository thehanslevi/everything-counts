// The weekly email, as HTML and as plain text. Pure: no Deno, no network.
//
// Email clients are a decade behind browsers, so this is tables and inline
// styles on purpose. It carries the app's look as far as mail allows: the
// taxi-yellow masthead, ink frames, a color band per form.

import { type Piece, voices } from "./digest.ts";

const INK = "#171106";
const FIELD = "#f2c400";
const PAPER = "#f7f1e3";
const CARD = "#fbf7ee";
const RED = "#e0202a";
const MAG = "#e5007e";
const BLUE = "#0053c0";

// Mirrors the form banners on the log cards.
const FORM_HEX: Record<string, string> = {
  essay: RED,
  article: BLUE,
  report: MAG,
  poem: MAG,
  chapter: BLUE,
  "short story": RED,
  other: INK,
};

const SANS = "Helvetica, Arial, sans-serif";

// Some stored titles and bylines still carry entities the scraper once
// failed to decode ("Cairo Airport &mdash; Off Assignment"). Decode the
// common ones before the text is escaped for the email.
const ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function tidy(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// "@a", "@a and @b", "@a, @b and 2 others"
export function readersLine(readers: string[]): string {
  const at = readers.map((h) => `@${h}`);
  if (at.length <= 2) return at.join(" and ");
  const rest = at.length - 2;
  return `${at[0]}, ${at[1]} and ${rest} ${rest === 1 ? "other" : "others"}`;
}

// Whether a stored image is worth showing as a piece's picture: served over
// https (mail clients block the rest), and not plainly a site-wide default.
// Some sites answer every page with their logo or a generic share icon; a
// big third-party logo is not a picture of the piece.
export function isLeadImage(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return !/(share[-_]?icons?|logo|favicon|placeholder|sprite|default[-_]?(image|img|share|og|social|thumb))/i
      .test(u.pathname);
  } catch {
    return false;
  }
}

// "@a", "@a and @b", "@a, @b and @c", "@a, @b and 3 others": the people an
// email is from, for its subject line.
export function namesLine(handles: string[]): string {
  const at = handles.map((h) => `@${h}`);
  if (at.length <= 2) return at.join(" and ");
  if (at.length === 3) return `${at[0]}, ${at[1]} and ${at[2]}`;
  return `${at[0]}, ${at[1]} and ${at.length - 2} others`;
}

const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const SENT_FMT = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function renderWeekly({
  pieces,
  site,
  unsubscribeUrl,
  profileUrl,
  postalAddress,
  now,
}: {
  pieces: Piece[];
  site: string; // origin for piece links, no trailing slash
  unsubscribeUrl: string;
  profileUrl: string;
  postalAddress: string; // "" to leave it out
  now: Date;
}): { subject: string; html: string; text: string } {
  // Clean every piece's text once, up front.
  pieces = pieces.map((p) => ({
    ...p,
    title: tidy(p.title),
    author: p.author ? tidy(p.author) : null,
    source: p.source ? tidy(p.source) : null,
  }));
  const n = pieces.length;
  // An email can sit this week's pieces beside older ones (see digest.ts), so
  // it is dated by the day it goes out, and each card says when it was logged.
  const label = SENT_FMT.format(now);
  const subject = `${n} ${n === 1 ? "piece" : "pieces"} read by ${namesLine(voices(pieces))}`;
  // What inbox lists show after the subject.
  const preheader = pieces
    .slice(0, 3)
    .map((p) => p.title)
    .join(" · ");

  const cards = pieces
    .map((p) => {
      const url = `${site}/work/${p.workId}`;
      const byline = [p.author, p.source].filter(Boolean).join(" · ");
      // The lead image, full width above the text, linked like the title.
      // Natural proportions, capped in height where the client can crop.
      const image = p.image
        ? `<tr><td colspan="2" style="border-bottom:3px solid ${INK};font-size:0;line-height:0;"><a href="${esc(url)}"><img src="${esc(p.image)}" width="594" alt="" style="display:block;width:100%;height:auto;max-height:260px;object-fit:cover;border:0;"></a></td></tr>`
        : "";
      return `
        <tr><td style="padding:0 0 12px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid ${INK};background:${CARD};">
            ${image}
            <tr>
              <td width="86" align="center" valign="middle" style="background:${FORM_HEX[p.form] ?? INK};border-right:3px solid ${INK};padding:0 6px;font:700 10px ${SANS};letter-spacing:2px;text-transform:uppercase;color:#ffffff;">${esc(p.form)}</td>
              <td style="padding:14px 16px;">
                <a href="${esc(url)}" style="font:900 17px/1.2 ${SANS};color:${INK};text-decoration:none;text-transform:uppercase;">${esc(p.title)}</a>
                ${
                  byline
                    ? `<div style="margin-top:6px;font:700 11px/1.4 ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:#5c5548;">${esc(byline)}</div>`
                    : ""
                }
                <div style="margin-top:6px;font:400 13px/1.4 Georgia, 'Times New Roman', serif;color:#4a4439;">Logged by ${esc(readersLine(p.readers))} &middot; ${esc(DAY_FMT.format(new Date(p.loggedAt)))}</div>
              </td>
            </tr>
          </table>
        </td></tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
      <tr><td style="background:${FIELD};border:3px solid ${INK};border-bottom:0;padding:26px 24px 22px;">
        <a href="${esc(site)}" style="font:900 34px/0.95 ${SANS};letter-spacing:-0.5px;text-transform:uppercase;color:${INK};text-decoration:none;">Everything<br>Counts</a>
      </td></tr>
      <tr><td style="background:${INK};padding:11px 24px;font:700 12px ${SANS};letter-spacing:3px;text-transform:uppercase;color:${FIELD};">${esc(label)}</td></tr>
      <tr><td style="height:18px;line-height:18px;font-size:0;">&nbsp;</td></tr>
      ${cards}
      <tr><td style="padding:14px 2px 0;font:400 12px/1.6 ${SANS};color:#6b6557;">
        You get this once a week because you have an account on Everything Counts.
        <a href="${esc(unsubscribeUrl)}" style="color:${INK};">Stop this email</a> &middot;
        <a href="${esc(profileUrl)}" style="color:${INK};">Your profile</a>${
          postalAddress ? `<br>${esc(postalAddress)}` : ""
        }
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    `EVERYTHING COUNTS`,
    label,
    ``,
    ...pieces.flatMap((p) => [
      p.title,
      [p.author, p.source].filter(Boolean).join(" · "),
      `Logged by ${readersLine(p.readers)} · ${DAY_FMT.format(new Date(p.loggedAt))}`,
      `${site}/work/${p.workId}`,
      ``,
    ]),
    `You get this once a week because you have an account on Everything Counts.`,
    `Stop this email: ${unsubscribeUrl}`,
    `Your profile: ${profileUrl}`,
    ...(postalAddress ? [postalAddress] : []),
  ]
    .filter((line, i, all) => !(line === "" && all[i - 1] === ""))
    .join("\n");

  return { subject, html, text };
}
