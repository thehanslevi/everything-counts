// The note email's rendering and input checks. Runs in Node (24+ strips
// the types itself):
//   node --test supabase/functions/send-note/render.test.ts
// Not part of the function: index.ts never imports it, so it is never
// bundled.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COPY, renderNote } from "./render.ts";
import {
  MAX_NOTE,
  MAX_RECIPIENTS,
  parseNoteInput,
  personalize,
  piecesText,
  SENDER_HANDLE,
} from "./input.ts";

const LONG_WORD = "Supercalifragilistic".repeat(6); // 120 characters, no break
const NOTE =
  `Read <b>anything</b> & "log" it — it's 1 < 2.\nSecond line.\n\n${LONG_WORD}`;

const base = {
  note: NOTE,
  from: { name: "H.R. <Levinson>", handle: "hrlevinson" },
  site: "https://example.test",
  mastheadUrl: "https://example.test/email/masthead.png",
  firstLogUrl: "https://everything-counts.vercel.app/log?new=1",
  unsubscribeUrl: "https://example.test/unsubscribe?t=abc&x=1",
  postalAddress: "",
};

test("the note is escaped in the HTML, and only the line breaks become tags", () => {
  const { html } = renderNote(base);
  assert.ok(!html.includes("<b>anything</b>"), "raw <b> must not survive");
  assert.ok(
    html.includes(
      "Read &lt;b&gt;anything&lt;/b&gt; &amp; &quot;log&quot; it — it&#39;s 1 &lt; 2.<br>Second line.<br><br>",
    ),
    "escaped note with <br> line breaks",
  );
  // The sender's name is escaped too, in the label and in <title>.
  assert.ok(!html.includes("<Levinson>"));
  assert.ok(html.includes("H.R. &lt;Levinson&gt; · @hrlevinson"));
  assert.ok(html.includes("<title>A warm welcome from Everything Counts</title>"));
  // Attribute values are escaped (the & in the unsubscribe link).
  assert.ok(html.includes('href="https://example.test/unsubscribe?t=abc&amp;x=1"'));
});

test("a long word stays whole and the card lets it wrap", () => {
  const { html, text } = renderNote(base);
  assert.ok(html.includes(LONG_WORD));
  assert.ok(text.includes(LONG_WORD));
  assert.match(html, /overflow-wrap:anywhere[^>]*>Read &lt;b&gt;/);
});

test("the plain text carries the note exactly as typed", () => {
  const { text } = renderNote(base);
  assert.ok(text.includes(`\n${NOTE}\n`), "note verbatim, line breaks and all");
  assert.ok(!text.includes("&lt;") && !text.includes("&amp;"), "no HTML entities");
  // The only angle brackets are the ones the note and the name were typed with.
  const rest = text.replace(NOTE, "").replace("H.R. <Levinson>", "");
  assert.ok(!/[<>]/.test(rest), "no tags of its own");
  assert.ok(text.includes(`${COPY.button}: ${base.firstLogUrl}`));
  assert.ok(text.includes(`${COPY.stop}: ${base.unsubscribeUrl}`));
  assert.ok(text.includes(COPY.why));
  assert.ok(text.startsWith(`${COPY.wordmark}\nH.R. <Levinson> · @hrlevinson\n`));
});

test("HTML has the masthead, the button and the footer", () => {
  const { html } = renderNote(base);
  assert.ok(html.includes('src="https://example.test/email/masthead.png"'));
  assert.ok(html.includes(`href="https://everything-counts.vercel.app/log?new=1"`));
  assert.ok(html.includes(COPY.button));
  assert.ok(html.includes(COPY.stop));
  assert.ok(html.includes(COPY.why));
  // The preheader is the note on one line, escaped, then the filler that
  // keeps inbox previews from running on into the body.
  assert.ok(html.includes("Second line. " + LONG_WORD + "&#847;&zwnj;&nbsp;"));
});

test("spaces she typed stay in the HTML; the preview stops after the note", () => {
  const typed = "Two  spaces,   three.\n  Indented.\n Once.";
  const { html, text } = renderNote({ ...base, note: typed });
  // A space with another after it, or one starting a line, can't fold away.
  assert.ok(
    html.includes("Two&nbsp; spaces,&nbsp;&nbsp; three.<br>&nbsp; Indented.<br>&nbsp;Once."),
  );
  // Single spaces stay ordinary, so lines still wrap between words.
  assert.ok(html.includes("Two&nbsp; spaces,"));
  assert.ok(text.includes(`\n${typed}\n`), "plain text exactly as typed");
  assert.match(
    html,
    /Two spaces, three\. Indented\. Once\.(&#847;&zwnj;&nbsp;){90}<\/div>/,
  );
});

test("subject is fixed; a test says so; the sender line falls back to @handle", () => {
  assert.equal(renderNote(base).subject, "A warm welcome from Everything Counts");
  const noName = renderNote({ ...base, from: { name: "", handle: "hrlevinson" } });
  assert.equal(noName.subject, "A warm welcome from Everything Counts");
  assert.ok(noName.text.includes("\n@hrlevinson\n"));
  assert.equal(renderNote({ ...base, test: true }).subject, "Test: A warm welcome from Everything Counts");
});

test("each audience has its own subject; the rest of the email is the same", () => {
  assert.equal(
    renderNote({ ...base, audience: "newcomers" }).subject,
    "A warm welcome from Everything Counts",
  );
  const thanks = renderNote({ ...base, audience: "loggers" });
  assert.equal(thanks.subject, "A thank-you from Everything Counts");
  assert.ok(thanks.html.includes("<title>A thank-you from Everything Counts</title>"));
  assert.equal(
    renderNote({ ...base, audience: "loggers", test: true }).subject,
    "Test: A thank-you from Everything Counts",
  );
  // Button, why line and stop link: the same words, the same places.
  const welcome = renderNote(base);
  assert.equal(thanks.text, welcome.text);
  assert.equal(
    thanks.html.replace(/<title>[^<]*<\/title>/, ""),
    welcome.html.replace(/<title>[^<]*<\/title>/, ""),
  );
});

test("a postal address shows only when there is one", () => {
  assert.ok(!renderNote(base).html.includes("<br>1 Main"));
  const withAddress = renderNote({ ...base, postalAddress: "1 Main St & Co" });
  assert.ok(withAddress.html.includes("<br>1 Main St &amp; Co"));
  assert.ok(withAddress.text.endsWith("\n1 Main St & Co"));
});

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const good = {
  userIds: [id(1)],
  body: "  Hello\r\nthere  ",
  from: { name: "  Hannah   Levinson ", handle: "hrlevinson" },
};

test("input: the note keeps its line breaks, the name goes on one line", () => {
  const parsed = parseNoteInput(good);
  assert.ok(!("error" in parsed));
  if ("error" in parsed) return;
  assert.equal(parsed.body, "Hello\nthere");
  assert.equal(parsed.from.name, "Hannah Levinson");
  assert.equal(parsed.test, false);
});

test("input: refuses what it can't send safely", () => {
  const err = (raw: unknown) => {
    const parsed = parseNoteInput(raw);
    return "error" in parsed ? parsed.error : null;
  };
  assert.equal(err({ ...good, test: "true" }), "bad-test");
  assert.equal(err({ ...good, test: 1 }), "bad-test");
  assert.equal(err({ ...good, userIds: [] }), "no-recipients");
  assert.equal(err({ ...good, userIds: ["someone@example.com"] }), "bad-recipient");
  assert.equal(
    err({ ...good, userIds: Array.from({ length: MAX_RECIPIENTS + 1 }, (_, i) => id(i)) }),
    "too-many-recipients",
  );
  assert.equal(err({ ...good, body: "   " }), "empty-note");
  assert.equal(err({ ...good, body: "x".repeat(MAX_NOTE + 1) }), "note-too-long");
  assert.equal(err({ ...good, body: "x".repeat(MAX_NOTE) }), null);
  assert.equal(err({ ...good, from: { name: "x", handle: "Not A Handle" } }), "bad-sender");
  // Only the pinned sender, on a real send or a test.
  assert.equal(err({ ...good, from: { name: "x", handle: "someone_else" } }), "wrong-sender");
  assert.equal(
    err({ ...good, test: true, from: { name: "x", handle: "someone_else" } }),
    "wrong-sender",
  );
  assert.equal(SENDER_HANDLE, "hrlevinson");
  assert.equal(err(null), "bad-body");
  // The same id twice is one person.
  const twice = parseNoteInput({ ...good, userIds: [id(1), id(1).toUpperCase()] });
  assert.ok(!("error" in twice) && twice.userIds.length === 1);
  const asTest = parseNoteInput({ ...good, test: true });
  assert.ok(!("error" in asTest) && asTest.test === true);
});

test("input: the audience is newcomers unless it says loggers", () => {
  const plain = parseNoteInput(good);
  assert.ok(!("error" in plain) && plain.audience === "newcomers");
  const welcome = parseNoteInput({ ...good, audience: "newcomers" });
  assert.ok(!("error" in welcome) && welcome.audience === "newcomers");
  const thanks = parseNoteInput({ ...good, audience: "loggers" });
  assert.ok(!("error" in thanks) && thanks.audience === "loggers");
  for (const audience of ["everyone", "Loggers", "", null, 1, true]) {
    const parsed = parseNoteInput({ ...good, audience });
    assert.ok("error" in parsed && parsed.error === "bad-audience", String(audience));
  }
});

test("{name} becomes the first name, or goes with its space when there is none", () => {
  const note = "Hi {name}! A note.\n\nHannah";
  assert.equal(personalize(note, "Jane Q. Doe", 0), "Hi Jane! A note.\n\nHannah");
  assert.equal(personalize(note, "  ", 0), "Hi! A note.\n\nHannah");
  assert.equal(personalize(note, null, 0), "Hi! A note.\n\nHannah");
  assert.equal(personalize("No placeholder here.", "Jane", 3), "No placeholder here.");
  assert.equal(personalize("{name}, {name}!", "Ana", 0), "Ana, Ana!");
  // A name is text, never a replacement pattern.
  assert.equal(personalize("Hi {name}.", "$&$1", 0), "Hi $&$1.");
});

test("{pieces} becomes their own count: 1 piece, 0 pieces, 22 pieces", () => {
  assert.equal(piecesText(0), "0 pieces");
  assert.equal(piecesText(1), "1 piece");
  assert.equal(piecesText(2), "2 pieces");
  assert.equal(piecesText(22), "22 pieces");
  assert.equal(personalize("You've logged {pieces}.", "Ana", 22), "You've logged 22 pieces.");
  assert.equal(personalize("You've logged {pieces}.", "Ana", 1), "You've logged 1 piece.");
  assert.equal(personalize("You've logged {pieces}.", null, 0), "You've logged 0 pieces.");
  assert.equal(personalize("{pieces}, {pieces}", null, 2), "2 pieces, 2 pieces");
});

test("{name} and {pieces} fill in together", () => {
  const note = "Thank you {name}, for {pieces} so far.\n\nHannah";
  assert.equal(
    personalize(note, "Jane Q. Doe", 22),
    "Thank you Jane, for 22 pieces so far.\n\nHannah",
  );
  assert.equal(personalize(note, "Jo", 1), "Thank you Jo, for 1 piece so far.\n\nHannah");
  // No name: "{name}" goes with its space; the count stays.
  assert.equal(personalize(note, "", 0), "Thank you, for 0 pieces so far.\n\nHannah");
  // A name that reads like the other placeholder stays as typed.
  assert.equal(personalize("{name}: {pieces}", "{pieces}", 3), "{pieces}: 3 pieces");
});

test('a "pieces" typed after {pieces} is not doubled', () => {
  assert.equal(personalize("You've logged {pieces} pieces.", "Ana", 22), "You've logged 22 pieces.");
  assert.equal(personalize("You've logged {pieces} pieces.", "Ana", 1), "You've logged 1 piece.");
  assert.equal(personalize("You've logged {pieces} piece.", "Ana", 0), "You've logged 0 pieces.");
  assert.equal(personalize("{pieces} pieces of reading", null, 2), "2 pieces of reading");
  // Only the word itself goes, not a longer one.
  assert.equal(personalize("{pieces} piecework", null, 2), "2 pieces piecework");
});
