import sharp from "sharp";
import { mkdirSync } from "node:fs";

// App Store screenshots, poster-styled to match the app. Generated at BOTH
// accepted iPhone sizes, and — critically — with NO alpha channel (App Store
// Connect rejects screenshots that carry transparency, often with a misleading
// "wrong dimensions" error). Panel 2 shows the share extension on purpose, to
// answer guideline 4.2.
const SIZES = [
  { dir: "iphone-6.9", W: 1320, H: 2868 }, // iPhone 16 Pro Max
  { dir: "iphone-6.7", W: 1290, H: 2796 }, // iPhone 15 Pro Max
  { dir: "iphone-6.5", W: 1242, H: 2688 }, // iPhone 11 Pro Max — the slot ASC is asking for
];
const YELLOW = "#f2c400";
const INK = "#171106";
const RED = "#e0202a";
const MAGENTA = "#e5007e";
const BLUE = "#0053c0";
const PAPER = "#f7f1e3";

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function card(x, y, w, h) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>`;
}

function tag(x, y, text, color) {
  const w = 60 + text.length * 26;
  return `<rect x="${x}" y="${y}" width="${w}" height="66" fill="${color}"/>
    <text x="${x + 30}" y="${y + 46}" font-family="Arial" font-weight="800" font-size="30" letter-spacing="5" fill="#ffffff">${esc(text)}</text>`;
}

function discs(x, y, filled) {
  let s = "";
  for (let i = 0; i < 5; i++) {
    const c = i < filled ? RED : "none";
    s += `<circle cx="${x + i * 46}" cy="${y}" r="15" fill="${c}" stroke="${INK}" stroke-width="4"/>`;
  }
  return s;
}

function buildPanels(W, H) {
  const panel = (caption, content) => {
    const capSvg = caption
      .split("\n")
      .map(
        (l, i) =>
          `<text x="90" y="${300 + i * 150}" font-family="Arial" font-weight="900" font-size="118" letter-spacing="-3" fill="${INK}">${esc(l)}</text>`,
      )
      .join("");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${YELLOW}"/>
      <circle cx="${W - 150}" cy="150" r="90" fill="${RED}"/>
      ${capSvg}
      ${content}
    </svg>`;
  };

  return {
    "01-counts": panel("EVERYTHING\nYOU READ\nCOUNTS", `
      ${card(90, 820, W - 180, 620)}
      ${tag(90, 820, "ESSAY", RED)}
      <text x="${W - 130}" y="866" text-anchor="end" font-family="Arial" font-weight="700" font-size="30" letter-spacing="3" fill="${INK}">JUN 16</text>
      <text x="140" y="1050" font-family="Arial" font-weight="800" font-size="72" fill="${INK}">THE WORK OF ART</text>
      <text x="140" y="1130" font-family="Arial" font-weight="800" font-size="72" fill="${INK}">IN THE AGE OF</text>
      <text x="140" y="1210" font-family="Arial" font-weight="800" font-size="72" fill="${INK}">ATTENTION</text>
      <line x1="140" y1="1270" x2="${W - 140}" y2="1270" stroke="${INK}" stroke-width="3"/>
      <text x="140" y="1330" font-family="Arial" font-weight="700" font-size="34" letter-spacing="2" fill="${INK}">JIA TOLENTINO · THE NEW YORKER</text>
      ${discs(150, 1400, 4)}
      <text x="90" y="1600" font-family="Georgia" font-size="52" fill="${INK}">The essay. The poem. The report.</text>
      <text x="90" y="1670" font-family="Georgia" font-size="52" fill="${INK}">The chapter. All of it counts.</text>`),

    "02-share": panel("LOG IT FROM\nANYWHERE", `
      <rect x="90" y="820" width="${W - 180}" height="700" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
      <text x="140" y="930" font-family="Arial" font-weight="700" font-size="34" letter-spacing="3" fill="${INK}">SAFARI · SHARE SHEET</text>
      <rect x="140" y="980" width="${W - 280}" height="130" fill="${YELLOW}" stroke="${INK}" stroke-width="5"/>
      <circle cx="215" cy="1045" r="34" fill="${RED}"/>
      <text x="290" y="1060" font-family="Arial" font-weight="800" font-size="44" fill="${INK}">Log to Everything Counts</text>
      <rect x="140" y="1150" width="${W - 280}" height="90" fill="none" stroke="${INK}" stroke-width="3" opacity="0.4"/>
      <text x="165" y="1207" font-family="Arial" font-weight="700" font-size="38" fill="${INK}" opacity="0.4">Copy</text>
      <rect x="140" y="1270" width="${W - 280}" height="90" fill="none" stroke="${INK}" stroke-width="3" opacity="0.4"/>
      <text x="165" y="1327" font-family="Arial" font-weight="700" font-size="38" fill="${INK}" opacity="0.4">Add to Reading List</text>
      <text x="90" y="1680" font-family="Georgia" font-size="52" fill="${INK}">Reading something? Share it</text>
      <text x="90" y="1750" font-family="Georgia" font-size="52" fill="${INK}">straight into your record.</text>`),

    "03-record": panel("YOUR READING\nRECORD", `
      <rect x="90" y="820" width="${W - 180}" height="300" fill="${INK}"/>
      <text x="140" y="905" font-family="Arial" font-weight="700" font-size="34" letter-spacing="4" fill="${YELLOW}" opacity="0.7">2026</text>
      <text x="140" y="1010" font-family="Arial" font-weight="900" font-size="76" fill="${PAPER}">YOU READ <tspan fill="${RED}">14</tspan> THINGS,</text>
      <text x="140" y="1095" font-family="Arial" font-weight="900" font-size="76" fill="${PAPER}"><tspan fill="${RED}">ABOUT 6 HRS</tspan></text>
      ${card(90, 1180, W - 180, 260)}
      ${tag(90, 1180, "POEM", MAGENTA)}
      <text x="140" y="1360" font-family="Arial" font-weight="800" font-size="62" fill="${INK}">THE SUMMER DAY</text>
      <text x="140" y="1420" font-family="Arial" font-weight="700" font-size="30" fill="${INK}">MARY OLIVER · POETRY FOUNDATION</text>
      ${card(90, 1490, W - 180, 260)}
      ${tag(90, 1490, "REPORT", BLUE)}
      <text x="140" y="1670" font-family="Arial" font-weight="800" font-size="62" fill="${INK}">ON THE MEASURE</text>
      <text x="140" y="1730" font-family="Arial" font-weight="700" font-size="30" fill="${INK}">A. RESEARCHER · ARXIV</text>`),

    "04-feed": panel("SEE WHAT\nYOUR PEOPLE\nREAD", `
      <rect x="90" y="880" width="${W - 180}" height="90" fill="${INK}"/>
      <circle cx="150" cy="925" r="16" fill="${RED}"/>
      <text x="185" y="940" font-family="Arial" font-weight="800" font-size="40" letter-spacing="2" fill="${PAPER}">HANNAH L <tspan font-weight="400" fill="${RED}">@hrlevinson</tspan></text>
      ${tag(90, 970, "ARTICLE", BLUE)}
      <rect x="90" y="1036" width="${W - 180}" height="340" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
      <text x="140" y="1140" font-family="Arial" font-weight="800" font-size="62" fill="${INK}">WHY THE KNICKS ARE</text>
      <text x="140" y="1210" font-family="Arial" font-weight="800" font-size="62" fill="${INK}">THE GREATEST TEAM</text>
      <line x1="140" y1="1270" x2="${W - 140}" y2="1270" stroke="${INK}" stroke-width="3"/>
      <text x="140" y="1330" font-family="Arial" font-weight="700" font-size="30" fill="${INK}">IAN O'CONNOR · THE ATHLETIC</text>
      <text x="90" y="1560" font-family="Georgia" font-size="52" fill="${INK}">Not an algorithm. Just the people</text>
      <text x="90" y="1630" font-family="Georgia" font-size="52" fill="${INK}">whose attention you trust.</text>`),

    "05-work": panel("EVERY PIECE\nPOOLS", `
      <rect x="90" y="820" width="${W - 180}" height="90" fill="${MAGENTA}"/>
      <text x="130" y="880" font-family="Arial" font-weight="800" font-size="40" letter-spacing="4" fill="#ffffff">ESSAY</text>
      <rect x="90" y="910" width="${W - 180}" height="340" fill="${PAPER}" stroke="${INK}" stroke-width="7"/>
      <text x="140" y="1030" font-family="Arial" font-weight="900" font-size="72" fill="${INK}">THE WORK OF ART</text>
      <text x="140" y="1110" font-family="Arial" font-weight="900" font-size="72" fill="${INK}">IN THE AGE OF</text>
      <text x="140" y="1190" font-family="Arial" font-weight="900" font-size="72" fill="${INK}">ATTENTION</text>
      <text x="90" y="1400" font-family="Arial" font-weight="900" font-size="80" fill="${INK}">YOU AND <tspan fill="${RED}">3</tspan></text>
      <text x="90" y="1490" font-family="Arial" font-weight="900" font-size="80" fill="${INK}">OTHERS LOGGED THIS</text>
      <line x1="90" y1="1540" x2="${W - 90}" y2="1540" stroke="${INK}" stroke-width="6"/>
      <text x="90" y="1680" font-family="Georgia" font-size="52" fill="${INK}">"Several people you follow read</text>
      <text x="90" y="1750" font-family="Georgia" font-size="52" fill="${INK}">this." Discovery through people.</text>`),
  };
}

for (const { dir, W, H } of SIZES) {
  mkdirSync(`screenshots/${dir}`, { recursive: true });
  const panels = buildPanels(W, H);
  for (const [name, svg] of Object.entries(panels)) {
    // .flatten() composites onto an opaque background and removes the alpha
    // channel — the fix for App Store Connect's transparency rejection.
    await sharp(Buffer.from(svg))
      .flatten({ background: YELLOW })
      .png()
      .toFile(`screenshots/${dir}/${name}.png`);
  }
  console.log(`wrote screenshots/${dir}/ (5 files at ${W}x${H}, no alpha)`);
}
console.log("done");
