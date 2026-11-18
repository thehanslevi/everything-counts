"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

// Text set in display type, with the site's rules for long words applied.
//
// Hyphenation is off everywhere (globals.css), so a word that doesn't fit at
// the end of a line moves whole to the next one. A long word can make that
// look wrong in two ways, and each has its answer here.
//
// It can push the short words beside it onto lines of their own ("WHY" over
// a twenty-letter word, "IS" under it). A title set with `fit` is then set
// a step smaller, down to three quarters of its size, until the words sit
// together again.
//
// And it can be too wide for a line by itself, at any size allowed. Then it
// has to break, and a break with no hyphen reads as a mistake, so that word,
// and only that word, is hyphenated. The browser does it where it will;
// Chrome leaves capitals alone, and these titles are set in capitals, so
// where the browser won't, the break points are worked out here
// (breakPoints, below).
//
// All of it depends on the width of the column and the type in it, so it is
// measured here, again whenever the column changes size and once the fonts
// have loaded.

// Shorter words fit a line at every size the site sets type in, and are
// never measured.
const MEASURED_FROM = 8;
// A title with no word this long has no line a long word could empty.
const CROWDS_FROM = 10;
// The sizes a fitted title may be set at, as a share of its own.
const SIZES = [1, 0.94, 0.88, 0.82, 0.76];
// A line before the last that fills less than this much of the column holds
// a short word or two, stranded by the long word after it.
const STRANDED_UNDER = 0.36;

type TooWide = { at: number; byBrowser: boolean };
type Setting = { size: number; tooWide: readonly TooWide[] };
const PLAIN: Setting = { size: 1, tooWide: [] };

export function Words({ text, fit = false }: { text: string; fit?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const tokens = useMemo(() => pieces(text), [text]);
  const [setting, setSetting] = useState<Setting>(PLAIN);

  const measure = useCallback(() => {
    const el = ref.current;
    // A fitted title is its own block; otherwise the lines belong to the
    // nearest block around it. The probe goes where the type is full size.
    const column = el && (fit ? el : columnOf(el));
    const host = el && (fit ? el.parentElement : el);
    if (!el || !column || !host) return;
    const room = fit ? el.clientWidth : roomIn(column);
    if (room <= 0) return;

    const long = tokens
      .map((_, i) => i)
      .filter((i) => tokens[i].length >= MEASURED_FROM && isWord(tokens[i]));
    const crowded =
      fit && tokens.some((token) => token.length >= CROWDS_FROM) && tokens.length > 1;
    let next = PLAIN;

    if (long.length > 0 || crowded) {
      // Out of sight, in the same type and as wide as the column.
      const probe = document.createElement("span");
      probe.setAttribute("aria-hidden", "true");
      probe.style.cssText =
        `position:absolute;left:0;top:0;width:${room}px;visibility:hidden;pointer-events:none`;

      // Each long word on one line, to see how wide it is.
      const lines = long.map((i) => {
        const line = document.createElement("span");
        line.style.cssText = "display:block;width:max-content;white-space:nowrap";
        line.textContent = tokens[i];
        probe.appendChild(line);
        return line;
      });
      // The whole title, to see how its lines fall at each size.
      const whole = document.createElement("span");
      whole.style.cssText = "display:block;white-space:normal";
      whole.textContent = text;
      probe.appendChild(whole);
      host.appendChild(probe);

      const widths = lines.map((line) => line.getBoundingClientRect());
      const wideAt = (size: number) =>
        long.filter((_, n) => widths[n].width * size > room + 0.5);

      // The largest size with no word too wide and no line stranded; failing
      // that, the one that leaves the fewest of each.
      let size = 1;
      if (fit) {
        let best = [Infinity, Infinity];
        for (const candidate of SIZES) {
          whole.style.fontSize = `${candidate}em`;
          const filled = lineWidths(whole);
          const stranded = filled
            .slice(0, -1)
            .filter((width) => width < room * STRANDED_UNDER).length;
          const wide = wideAt(candidate).length;
          if (wide < best[0] || (wide === best[0] && stranded < best[1])) {
            best = [wide, stranded];
            size = candidate;
          }
        }
      }

      // Each word still too wide, in a box with the browser's hyphenation on
      // and nothing else allowed to break it. If the box runs to a second
      // line, the browser hyphenated it.
      const tooWide = wideAt(size).map((at) => {
        const n = long.indexOf(at);
        const box = document.createElement("span");
        box.style.cssText =
          `display:block;font-size:${size}em;white-space:normal;overflow-wrap:normal;` +
          "word-break:normal;-webkit-hyphens:auto;hyphens:auto";
        box.textContent = tokens[at];
        probe.appendChild(box);
        const height = box.getBoundingClientRect().height;
        return { at, byBrowser: height > widths[n].height * size * 1.5 };
      });

      probe.remove();
      next = { size, tooWide };
    }

    setSetting((before) =>
      before.size === next.size &&
      before.tooWide.length === next.tooWide.length &&
      before.tooWide.every(
        (word, n) =>
          word.at === next.tooWide[n].at &&
          word.byBrowser === next.tooWide[n].byBrowser,
      )
        ? before
        : next,
    );
  }, [tokens, text, fit]);

  useLayoutEffect(() => {
    measure();
    const el = ref.current;
    const column = el && (fit ? el : columnOf(el));
    const watcher =
      column && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => measure())
        : null;
    if (column) watcher?.observe(column);
    let live = true;
    document.fonts?.ready.then(() => {
      if (live) measure();
    });
    return () => {
      live = false;
      watcher?.disconnect();
    };
  }, [measure, fit]);

  // Runs of ordinary words stay plain text; a too-wide word gets its own span.
  const parts: (string | (TooWide & { word: string }))[] = [];
  tokens.forEach((token, i) => {
    const wide = setting.tooWide.find((word) => word.at === i);
    if (wide) {
      parts.push({ ...wide, word: token });
    } else if (typeof parts[parts.length - 1] === "string") {
      parts[parts.length - 1] += token;
    } else {
      parts.push(token);
    }
  });

  return (
    <span
      ref={ref}
      className={fit ? "block" : undefined}
      style={fit && setting.size !== 1 ? { fontSize: `${setting.size}em` } : undefined}
    >
      {parts.map((part) =>
        typeof part === "string" ? (
          part
        ) : (
          <span
            key={part.at}
            className={part.byBrowser ? "hyphens-auto" : "hyphens-manual"}
          >
            {part.byBrowser ? part.word : breakPoints(part.word)}
          </span>
        ),
      )}
    </span>
  );
}

// The text in the pieces a line can break between: words, the spaces between
// them, and the parts of a compound, each with the hyphen or dash that ends
// it ("entrepreneur-", "in-", "residence"). A compound breaks after its own
// hyphens, so it is only too wide if one of its parts is.
function pieces(text: string): string[] {
  return text
    .split(/(\s+)/)
    .flatMap((token) =>
      /^\s*$/.test(token)
        ? [token]
        : token.split(/([^-–—]+[-–—]+)/).filter(Boolean),
    )
    .filter(Boolean);
}

// How much of the column each line of a block fills, top to bottom.
function lineWidths(block: HTMLElement): number[] {
  const range = document.createRange();
  range.selectNodeContents(block);
  const lines = new Map<number, [number, number]>();
  for (const rect of range.getClientRects()) {
    if (rect.width === 0) continue;
    const top = Math.round(rect.top);
    const line = lines.get(top);
    lines.set(top, [
      Math.min(line?.[0] ?? rect.left, rect.left),
      Math.max(line?.[1] ?? rect.right, rect.right),
    ]);
  }
  return [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, [left, right]]) => right - left);
}

// The nearest box that sets lines: the first ancestor that isn't inline.
function columnOf(el: HTMLElement): HTMLElement | null {
  let box = el.parentElement;
  while (box && /^(inline|contents)$/.test(getComputedStyle(box).display)) {
    box = box.parentElement;
  }
  return box;
}

// The width a line has inside that box.
function roomIn(box: HTMLElement): number {
  const style = getComputedStyle(box);
  return (
    box.clientWidth -
    parseFloat(style.paddingLeft) -
    parseFloat(style.paddingRight)
  );
}

// Letters, with whatever punctuation hangs off them. An address, a handle or
// a number is not a word: a hyphen put into one would change what it says,
// so those are left to break where they must.
function isWord(token: string): boolean {
  return /\p{L}/u.test(token) && !/[\/\\@_\d]|\.\p{L}/u.test(token);
}

const SOFT_HYPHEN = "\u00ad";
// Letter pairs that are one sound and stay together.
const PAIRS = ["ch", "sh", "th", "ph", "wh", "gh", "ck", "qu"];
// Beginnings and endings that are never split, and can always be split off.
const WHOLE =
  /tion|sion|cian|cial|tial|cious|tious|geous|ment|ness|less|ship|hood|^anti|^counter|^inter|^super|^under|^over|^trans|^multi|^semi|^micro|^hyper|^non|^dis|^mis|^pre|^un/g;
// Endings a word breaks before, longest first.
const ENDINGS = [
  "ically", "arians", "izing", "arian", "ities", "ably", "ibly", "ally",
  "able", "ible", "ious", "eous", "isms", "ists", "ized", "izes",
  "ism", "ist", "ity", "ous", "ize",
];

// The word with a soft hyphen at each place it may break, for a browser that
// won't find them. English breaks between syllables, and no set of rules
// finds every syllable; these find most. One consonant between vowels goes
// with the vowel after it, two or more split after the first, common
// beginnings and endings come off whole, and at least two letters stay
// before a break and three after it.
export function breakPoints(word: string): string {
  const lower = word.toLowerCase();
  const isVowel = (i: number) =>
    "aeiou".includes(lower[i]) || (lower[i] === "y" && i > 0);
  const isLetter = (i: number) => /\p{L}/u.test(lower[i] ?? "");
  const breaks = new Set<number>();

  // Between syllables.
  for (let i = 0; i < lower.length; ) {
    if (!isVowel(i)) {
      i += 1;
      continue;
    }
    // From a vowel: past the rest of its group, then the consonants after.
    let start = i;
    while (start < lower.length && isVowel(start)) start += 1;
    let end = start;
    while (end < lower.length && isLetter(end) && !isVowel(end)) end += 1;
    if (end < lower.length && isVowel(end) && end > start) {
      // The consonants between two vowels, counted in sounds.
      const sounds: number[] = [];
      for (let at = start; at < end; ) {
        sounds.push(at);
        at += PAIRS.includes(lower.slice(at, at + 2)) && at + 2 <= end ? 2 : 1;
      }
      if (sounds.length > 1) breaks.add(sounds[1]);
      else breaks.add(lower.slice(start, end) === "ck" ? end : start);
    }
    i = Math.max(end, i + 1);
  }

  // Before each ending, working in from the end of the word.
  const letters = lower.match(/^[^\p{L}]*([\p{L}'’-]*\p{L})/u);
  let stem = letters ? letters[0].length : 0;
  for (let found = true; found; ) {
    found = false;
    for (const ending of ENDINGS) {
      const from = stem - ending.length;
      if (from < 3 || lower.slice(from, stem) !== ending) continue;
      for (let at = from + 1; at < stem; at += 1) breaks.delete(at);
      breaks.delete(from - 1);
      // A doubled consonant splits down the middle: "pos-sible".
      const doubled = lower[from - 1] === lower[from - 2] && !isVowel(from - 1);
      breaks.add(doubled ? from - 1 : from);
      stem = from;
      found = true;
      break;
    }
  }

  for (const match of lower.matchAll(WHOLE)) {
    const from = match.index;
    const to = from + match[0].length;
    for (let at = from + 1; at < to; at += 1) breaks.delete(at);
    breaks.add(from);
    breaks.add(to);
  }

  // A final "e", "es" or "ed" is not a syllable to break before ("-ble").
  const tail = lower.match(/[^aeiouy]+e[sd]?[^\p{L}]*$/u);
  if (tail) {
    for (let at = tail.index ?? 0; at < lower.length; at += 1) breaks.delete(at);
  }

  // No piece of one letter, and none without a vowel in it.
  const ordered = [...breaks].sort((a, b) => a - b);
  for (let n = 0; n + 1 < ordered.length; n += 1) {
    const [from, to] = [ordered[n], ordered[n + 1]];
    const piece = lower.slice(from, to);
    if (piece.length === 1 && isVowel(from)) breaks.delete(to);
    else if (![...piece].some((_, k) => isVowel(from + k))) breaks.delete(from);
  }

  let out = "";
  for (let at = 0; at < word.length; at += 1) {
    const before = lower.slice(0, at).replace(/[^\p{L}]/gu, "").length;
    const after = lower.slice(at).replace(/[^\p{L}]/gu, "").length;
    if (
      breaks.has(at) &&
      before >= 2 &&
      after >= 3 &&
      isLetter(at - 1) &&
      isLetter(at)
    ) {
      out += SOFT_HYPHEN;
    }
    out += word[at];
  }
  return out;
}
