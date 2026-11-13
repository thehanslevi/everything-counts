// The note email, as HTML and as plain text. Pure: no Deno, no network.
//
// It wears the weekly email's clothes (send-weekly/render.ts): the same
// header picture, paper, ink rules and footer, in tables and inline styles
// because mail clients need them. What goes in the middle is one card with
// the sender's note in the serif face and one button to the first-log page.
// Edge functions bundle on their own, so the few helpers it shares with the
// weekly email are copied here rather than imported.

// ---------------------------------------------------------------------------
// COPY: approved by Hannah on 2026-11-12 (the subject is her own words; the
// button, why line and stop link are her picks from drafts). Every word
// this email adds around the note lives here and nowhere else. The note
// itself is the sender's and goes out exactly as typed.
export const COPY = {
  subject: "A warm welcome from Everything Counts",
  // Put in front of the subject on a test send, as the weekly test does.
  testPrefix: "Test: ",
  // The heading of the page it opens (/log?new=1).
  button: "Log the last thing you read",
  why: "You got this because you signed up for Everything Counts.",
  // The unsubscribe page reads as general email for the same reason: this
  // and the weekly email share one setting.
  stop: "Stop email from Everything Counts",
  // The header picture's alt text and the plain-text header: the name only.
  mastheadAlt: "Everything Counts",
  wordmark: "EVERYTHING COUNTS",
} as const;
// ---------------------------------------------------------------------------

const INK = "#171106";
const FIELD = "#f2c400";
const PAPER = "#f7f1e3";
const CARD = "#fbf7ee";
const RED = "#e0202a";
const MUTED = "#6b6557";

// Invisible filler after the preheader. Some inbox lists fill the preview
// from whatever text follows it; with a short note that would be the sender
// line and then the note a second time. This runs the preview out first.
const PREHEADER_STOP = "&#847;&zwnj;&nbsp;".repeat(90);

const SANS = "Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

// Escapes text for HTML, in element content and in quoted attributes.
export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The line above the note: who it is from.
export function senderLine(from: { name: string; handle: string }): string {
  const name = from.name.trim();
  return name ? `${name} · @${from.handle}` : `@${from.handle}`;
}

export function renderNote({
  note,
  from,
  site,
  mastheadUrl,
  firstLogUrl,
  unsubscribeUrl,
  postalAddress,
  test = false,
}: {
  note: string; // as typed (see cleanNote in input.ts)
  from: { name: string; handle: string };
  site: string; // origin the header links to, no trailing slash
  mastheadUrl: string; // the header image (see /email/masthead.png)
  firstLogUrl: string; // where the button goes
  unsubscribeUrl: string; // the weekly email's own link, same token
  postalAddress: string; // "" to leave it out
  test?: boolean;
}): { subject: string; html: string; text: string } {
  const subject = `${test ? COPY.testPrefix : ""}${COPY.subject}`;
  const label = senderLine(from);
  // What inbox lists show after the subject: the note, on one line.
  const preheader = note.replace(/\s+/g, " ").trim();
  // Line breaks and spaces she typed stay as typed. Everything is escaped
  // first, so the only markup in the note is what is added here: a space
  // with another after it becomes a no-break space (HTML would fold a run
  // into one), as does a space starting a line, and a line break a <br>
  // (Outlook ignores white-space:pre-wrap, so that isn't used).
  const noteHtml = esc(note)
    .replace(/ (?= )/g, "&nbsp;")
    .replace(/^ /gm, "&nbsp;")
    .replace(/\n/g, "<br>");

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}${PREHEADER_STOP}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
      <tr><td style="background:${FIELD};font-size:0;line-height:0;">
        <a href="${esc(site)}" style="text-decoration:none;"><img src="${esc(mastheadUrl)}" width="600" alt="${esc(COPY.mastheadAlt)}" style="display:block;width:100%;height:auto;border:0;font:900 26px/2 ${SANS};text-transform:uppercase;color:${INK};"></a>
      </td></tr>
      <tr><td style="padding:16px 2px 12px;font:700 11px ${SANS};letter-spacing:2.5px;text-transform:uppercase;color:${MUTED};">${esc(label)}</td></tr>
      <tr><td style="padding:0 0 16px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid ${INK};background:${CARD};">
          <tr><td style="padding:18px 20px 20px;font:400 17px/1.55 ${SERIF};color:${INK};word-break:break-word;overflow-wrap:anywhere;">${noteHtml}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:0 0 6px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="background:${RED};border:3px solid ${INK};"><a href="${esc(firstLogUrl)}" style="display:inline-block;padding:12px 18px;font:700 12px/1 ${SANS};letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">${esc(COPY.button)}</a></td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:14px 2px 0;font:400 12px/1.6 ${SANS};color:${MUTED};">
        ${esc(COPY.why)}
        <a href="${esc(unsubscribeUrl)}" style="color:${INK};">${esc(COPY.stop)}</a>${
          postalAddress ? `<br>${esc(postalAddress)}` : ""
        }
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    COPY.wordmark,
    label,
    ``,
    note,
    ``,
    `${COPY.button}: ${firstLogUrl}`,
    ``,
    COPY.why,
    `${COPY.stop}: ${unsubscribeUrl}`,
    ...(postalAddress ? [postalAddress] : []),
  ].join("\n");

  return { subject, html, text };
}
