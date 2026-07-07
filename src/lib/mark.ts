// The Everything Counts rising-sun page seal, as an SVG string. One source so
// the in-app masthead and the OG share cards stay identical to the icon master
// in scripts/make_icons.mjs. Geometry lives in a 200x200 space.
const FIELD = "#f2c400";
const INK = "#171106";
const RED = "#e0202a";
const MAG = "#e5007e";
const BLUE = "#0053c0";

// 20 tapered rays: mostly vermilion, magenta at top/bottom, blue at the sides.
function rays(): string {
  const accent: Record<number, string> = { 0: MAG, 5: BLUE, 10: MAG, 15: BLUE };
  let out = "";
  for (let i = 0; i < 20; i++) {
    const fill = accent[i] ?? RED;
    out += `<polygon points="98,43 102,43 103.3,10 96.7,10" fill="${fill}" transform="rotate(${i * 18} 100 100)"/>`;
  }
  return out;
}

// The disc of reading with its top-right corner turned down as a blue dog-ear.
function disc(): string {
  const lines = [
    [64, 84, 102],
    [61, 98, 136],
    [62, 112, 128],
    [68, 126, 98],
  ]
    .map(
      ([x1, y, x2]) =>
        `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/>`,
    )
    .join("");
  return (
    `<path d="M113.2 58 A44 44 0 1 0 142 86.8 Z" fill="${RED}" stroke="${INK}" stroke-width="4.5" stroke-linejoin="round"/>` +
    lines +
    `<path d="M113.2 58 L113.2 86.8 L142 86.8 Z" fill="${BLUE}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`
  );
}

// The mark as an SVG string. Transparent by default (it sits on the yellow
// field); pass field:true for a self-contained square (share cards, avatars).
export function markSvg({ field = false }: { field?: boolean } = {}): string {
  const bg = field ? `<rect width="200" height="200" fill="${FIELD}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 200 200">${bg}${rays()}${disc()}</svg>`;
}

// A ready-to-use data URI, for <img> in OG cards or CSS backgrounds.
export function markDataUri(opts: { field?: boolean } = {}): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(markSvg(opts))}`;
}
