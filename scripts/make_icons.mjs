// Generates every Everything Counts brand raster from one vector master.
//
//   node scripts/make_icons.mjs
//
// Writes the SVG masters (assets/icon.svg, assets/splash.svg) plus the source
// PNGs capacitor-assets consumes, then the web app icons. Run
// `npx capacitor-assets generate --ios` afterwards to fan the sources out into
// the iOS AppIcon + Splash imagesets. Every raster is flattened onto an opaque
// field — the App Store rejects icons that carry an alpha channel.
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const FIELD = "#f2c400"; // taxi-yellow
const INK = "#171106"; // sumi
const RED = "#e0202a"; // vermilion sun
const MAG = "#e5007e"; // Yokoo magenta
const BLUE = "#0053c0"; // electric blue

// --- the mark, in a 200x200 coordinate space -------------------------------

// 20 tapered rays: mostly vermilion, with magenta at top/bottom and blue at
// the sides — the loud-but-controlled Yokoo clash.
function rays() {
  const accent = { 0: MAG, 5: BLUE, 10: MAG, 15: BLUE };
  let out = "";
  for (let i = 0; i < 20; i++) {
    const fill = accent[i] ?? RED;
    out += `<polygon points="98,43 102,43 103.3,10 96.7,10" fill="${fill}" transform="rotate(${i * 18} 100 100)"/>`;
  }
  return out;
}

// The disc of reading with its top-right corner cut and turned down. Left edges
// hug the disc; ragged right; a short final line reads as the end of a
// paragraph; the top line clears the fold.
function disc() {
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

// Full-bleed square icon (iOS applies the rounded mask itself).
function iconSVG(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 200 200"><rect width="200" height="200" fill="${FIELD}"/>${rays()}${disc()}</svg>`;
}

// Centered mark on a generous field, for the launch screen.
function splashSVG(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${FIELD}"/><g transform="translate(280 280) scale(2.2)">${rays()}${disc()}</g></svg>`;
}

// --- render ----------------------------------------------------------------

// Flatten kills the alpha channel (App Store requirement) and bakes the field.
const png = (svg, size) =>
  sharp(Buffer.from(svg))
    .resize(size, size)
    .flatten({ background: FIELD })
    .png()
    .toBuffer();

async function main() {
  const iconMaster = iconSVG(1024);
  const splashMaster = splashSVG(2732);

  await writeFile("assets/icon.svg", iconMaster);
  await writeFile("assets/splash.svg", splashMaster);

  const icon1024 = await png(iconMaster, 1024);
  const splash2732 = await png(splashMaster, 2732);

  // capacitor-assets sources.
  await writeFile("assets/logo.png", icon1024);
  await writeFile("assets/icon-only.png", icon1024);
  await writeFile("assets/icon-foreground.png", icon1024);
  await writeFile("assets/splash.png", splash2732);
  await writeFile("assets/splash-dark.png", splash2732);

  // Web app icons (Next app-router serves these as favicon + apple-touch).
  await writeFile("src/app/icon.png", await png(iconMaster, 512));
  await writeFile("src/app/apple-icon.png", await png(iconMaster, 180));

  console.log("Wrote SVG masters + source PNGs. Next: npx capacitor-assets generate --ios");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
