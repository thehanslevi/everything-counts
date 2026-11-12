// Renders the seal the home-screen widget shows, from the same mark the site
// and the icon use (src/lib/mark.ts), into the widget's own asset catalog.
//
//   node --no-warnings scripts/make_widget_seal.mjs
//
// Writes ios/App/Widget/Assets.xcassets/Seal.imageset at 1x/2x/3x. The seal
// keeps its transparent ground: it sits on the widget's yellow field. Edit the
// mark in mark.ts (and make_icons.mjs), never these PNGs.
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import { markSvg } from "../src/lib/mark.ts";

const OUT = "ios/App/Widget/Assets.xcassets/Seal.imageset";
const POINTS = 84; // drawn at up to 84pt (the medium note face); smaller uses scale down

async function main() {
  await mkdir(OUT, { recursive: true });
  const images = [];
  for (const scale of [1, 2, 3]) {
    const px = POINTS * scale;
    const svg = markSvg().replace('width="100%" height="100%"', `width="${px}" height="${px}"`);
    const filename = `seal@${scale}x.png`;
    await sharp(Buffer.from(svg)).resize(px, px).png().toFile(`${OUT}/${filename}`);
    images.push({ idiom: "universal", filename, scale: `${scale}x` });
  }
  const contents = { images, info: { author: "xcode", version: 1 } };
  await writeFile(`${OUT}/Contents.json`, JSON.stringify(contents, null, 2) + "\n");
  console.log(`Wrote ${OUT} (${POINTS}pt at 1x/2x/3x)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
