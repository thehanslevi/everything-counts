// The Everything Counts rising-sun page seal, as an SVG string. One source so
// the in-app masthead, the OG cards, and per-user avatar seals all stay
// identical to the icon master in scripts/make_icons.mjs. Geometry lives in a
// 200x200 space.
//
// markSvg() with no seed returns the canonical brand mark. markSvg({ seed })
// returns a deterministic *personal* variant — same seal, different disc
// color, accent-beam colors, dog-ear, and a slight ring rotation — so every
// handle gets its own stamp with no upload required.
const FIELD = "#f2c400";
const INK = "#171106";
const RED = "#e0202a";
const MAG = "#e5007e";
const BLUE = "#0053c0";
const PAPER = "#f7f1e3";

const ACCENTS = [MAG, BLUE, RED];
// Disc fills paired with a readable text color for the lines of "prose".
const DISCS = [
  { fill: RED, text: INK },
  { fill: MAG, text: INK },
  { fill: BLUE, text: PAPER },
  { fill: INK, text: PAPER },
];

// FNV-1a: small, stable string hash so a handle always maps to the same seal.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 20 tapered rays: base color, with the top/bottom and left/right beams in two
// accents. Optional whole-ring rotation shifts the accent positions.
function rays(base: string, accentTB: string, accentLR: string, rot: number): string {
  const accent: Record<number, string> = {
    0: accentTB,
    10: accentTB,
    5: accentLR,
    15: accentLR,
  };
  let out = "";
  for (let i = 0; i < 20; i++) {
    const fill = accent[i] ?? base;
    out += `<polygon points="98,43 102,43 103.3,10 96.7,10" fill="${fill}" transform="rotate(${i * 18} 100 100)"/>`;
  }
  return rot ? `<g transform="rotate(${rot} 100 100)">${out}</g>` : out;
}

// The disc of reading with its top-right corner turned down as a dog-ear.
function disc(discFill: string, textColor: string, dogColor: string): string {
  const lines = [
    [64, 84, 102],
    [61, 98, 136],
    [62, 112, 128],
    [68, 126, 98],
  ]
    .map(
      ([x1, y, x2]) =>
        `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${textColor}" stroke-width="3.2" stroke-linecap="round"/>`,
    )
    .join("");
  return (
    `<path d="M113.2 58 A44 44 0 1 0 142 86.8 Z" fill="${discFill}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>` +
    lines +
    `<path d="M113.2 58 L113.2 86.8 L142 86.8 Z" fill="${dogColor}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
  );
}

// The mark as an SVG string. Transparent by default (it sits on the yellow
// field); pass field:true for a self-contained square (avatars, share cards).
// Pass seed for a deterministic personal variant.
export function markSvg({
  field = false,
  seed,
}: { field?: boolean; seed?: string } = {}): string {
  let inner: string;
  if (!seed) {
    // Canonical brand mark.
    inner = rays(RED, MAG, BLUE, 0) + disc(RED, INK, BLUE);
  } else {
    const h = hash(seed);
    const d = DISCS[h % DISCS.length];
    const accentTB = ACCENTS[(h >>> 3) % ACCENTS.length];
    const accentLR = ACCENTS[(h >>> 6) % ACCENTS.length];
    const dogColor = ACCENTS[(h >>> 9) % ACCENTS.length];
    const rot = [0, 8, -8, 16][(h >>> 12) % 4];
    inner = rays(RED, accentTB, accentLR, rot) + disc(d.fill, d.text, dogColor);
  }
  const bg = field ? `<rect width="200" height="200" fill="${FIELD}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">${bg}${inner}</svg>`;
}

// A ready-to-use data URI, for <img> in OG cards or CSS backgrounds.
export function markDataUri(opts: { field?: boolean; seed?: string } = {}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(opts))}`;
}
