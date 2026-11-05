// The weekly email, as HTML and as plain text. Pure: no Deno, no network.
//
// Email clients are a decade behind browsers, so this is tables and inline
// styles on purpose. It carries the app's look as far as mail allows: the
// taxi-yellow masthead, ink frames, a color band per form.

import type { Piece } from "./digest.ts";

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

const DAY = 24 * 60 * 60 * 1000;

// What stretch the email covers, said plainly. A normal week reads
// "This week · Oct 30 – Nov 5"; a first email reaching further back (a
// catch-up) reads "Since Sep 6" rather than calling two months a week.
export function coverage(
  since: Date,
  now: Date,
): { isWeek: boolean; label: string; sinceText: string } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const sinceText = fmt.format(since);
  const isWeek = now.getTime() - since.getTime() <= 8 * DAY;
  return {
    isWeek,
    sinceText,
    label: isWeek
      ? `This week · ${fmt.format(new Date(now.getTime() - 6 * DAY))} – ${fmt.format(now)}`
      : `Since ${sinceText}`,
  };
}

export function renderWeekly({
  pieces,
  site,
  unsubscribeUrl,
  profileUrl,
  postalAddress,
  since,
  now,
}: {
  pieces: Piece[];
  site: string; // origin for piece links, no trailing slash
  unsubscribeUrl: string;
  profileUrl: string;
  postalAddress: string; // "" to leave it out
  since: Date; // start of the stretch this email covers
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
  const { isWeek, label, sinceText } = coverage(since, now);
  const noun = n === 1 ? "piece" : "pieces";
  const subject = isWeek
    ? `${n} ${noun} from this week`
    : `${n} ${noun} logged since ${sinceText}`;
  // What inbox lists show after the subject.
  const preheader = pieces
    .slice(0, 3)
    .map((p) => p.title)
    .join(" · ");

  const cards = pieces
    .map((p) => {
      const url = `${site}/work/${p.workId}`;
      const byline = [p.author, p.source].filter(Boolean).join(" · ");
      return `
        <tr><td style="padding:0 0 10px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid ${INK};background:${CARD};">
            <tr>
              <td width="86" align="center" valign="middle" style="background:${FORM_HEX[p.form] ?? INK};border-right:3px solid ${INK};padding:0 6px;font:700 10px ${SANS};letter-spacing:2px;text-transform:uppercase;color:#ffffff;">${esc(p.form)}</td>
              <td style="padding:14px 16px;">
                <a href="${esc(url)}" style="font:900 17px/1.2 ${SANS};color:${INK};text-decoration:none;text-transform:uppercase;">${esc(p.title)}</a>
                ${
                  byline
                    ? `<div style="margin-top:6px;font:700 11px/1.4 ${SANS};letter-spacing:1.5px;text-transform:uppercase;color:#5c5548;">${esc(byline)}</div>`
                    : ""
                }
                <div style="margin-top:6px;font:400 13px/1.4 Georgia, 'Times New Roman', serif;color:#4a4439;">Logged by ${esc(readersLine(p.readers))}</div>
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
      `Logged by ${readersLine(p.readers)}`,
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
