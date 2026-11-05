import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/mark";
import { formatEstTime, tally } from "@/lib/data/stats";
import type { Log } from "@/lib/data/types";

// Shared poster renderer for OG share cards: taxi-yellow field, vermilion sun,
// sumi type, black footer band. The link preview is the poster.
export const OG_SIZE = { width: 1200, height: 630 };

export function posterCard({
  kicker,
  title,
  footer,
}: {
  kicker: string;
  title: string;
  footer: string;
}) {
  const display = title.length > 90 ? `${title.slice(0, 87)}…` : title;
  const titleSize = display.length > 60 ? 60 : display.length > 34 ? 76 : 92;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f2c400",
          padding: "56px",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={markDataUri()}
          width={190}
          height={190}
          alt=""
          style={{ position: "absolute", top: 40, right: 40 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 27,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 5,
            color: "#171106",
            maxWidth: 880,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: titleSize,
            fontWeight: 800,
            textTransform: "uppercase",
            lineHeight: 1.04,
            color: "#171106",
            maxWidth: 920,
          }}
        >
          {display}
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            right: 0,
            background: "#171106",
            color: "#f2c400",
            padding: "22px 56px",
            display: "flex",
            fontSize: 25,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 4,
          }}
        >
          {footer}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}

// --- The record as a poster ----------------------------------------------------

// Portrait, story-sized: something to drop into a group chat or a story. A
// month lists what was read; a year shows the shape of it (forms, and where
// the reading came from). Same field, seal, and type as the link previews.
export const STORY_SIZE = { width: 1080, height: 1920 };

const INK = "#171106";
const FIELD = "#f2c400";
const RED = "#e0202a";
const MAG = "#e5007e";
const BLUE = "#0053c0";
const PAPER = "#f7f1e3";

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

const clip = (s: string, n: number) =>
  s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;

const MAX_ROWS = 8;
const FACE = "Zen Kaku Gothic New";

// The poster needs the heavy structural face the site uses; the renderer
// ships one regular weight and ignores bold without it. Two Latin-subset
// weights live in assets/fonts (OFL). Loaded once per server instance. The
// paths are literal so the build traces the files into the function.
let posterFonts: Promise<
  | { name: string; data: Buffer; weight: 700 | 900; style: "normal" }[]
  | undefined
> | null = null;

function loadPosterFonts() {
  posterFonts ??= Promise.all([
    readFile(
      join(process.cwd(), "assets/fonts/zen-kaku-gothic-new-latin-900-normal.woff"),
    ),
    readFile(
      join(process.cwd(), "assets/fonts/zen-kaku-gothic-new-latin-700-normal.woff"),
    ),
  ]).then(
    ([black, bold]) => [
      { name: FACE, data: black, weight: 900 as const, style: "normal" as const },
      { name: FACE, data: bold, weight: 700 as const, style: "normal" as const },
    ],
    // No font file, no poster face: fall back to the renderer's default
    // rather than fail the image.
    () => undefined,
  );
  return posterFonts;
}

// One piece on the poster: form band, title, source.
function PieceRow({ log }: { log: Log }) {
  return (
    <div
      style={{
        display: "flex",
        marginTop: 14,
        height: 100,
        border: `5px solid ${INK}`,
        background: PAPER,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 190,
          background: FORM_HEX[log.form] ?? INK,
          borderRight: `5px solid ${INK}`,
          color: "#ffffff",
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {log.form}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          padding: "0 22px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 900,
            textTransform: "uppercase",
            lineHeight: 1.05,
            whiteSpace: "nowrap",
          }}
        >
          {clip(log.title, 30)}
        </div>
        {log.source && (
          <div
            style={{
              display: "flex",
              marginTop: 6,
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              opacity: 0.6,
              whiteSpace: "nowrap",
            }}
          >
            {clip(log.source, 40)}
          </div>
        )}
      </div>
    </div>
  );
}

export async function periodPoster({
  handle,
  kind,
  title,
  yearLabel,
  logs,
}: {
  handle: string;
  kind: "month" | "year";
  title: string; // "October" or "2026"
  yearLabel: string | null;
  logs: Log[]; // newest first
}) {
  const stats = tally(logs);
  const rows = logs.slice(0, MAX_ROWS);
  const more = logs.length - rows.length;

  const forms = Object.entries(stats.byForm).sort(([, a], [, b]) => b - a);
  const maxForm = forms[0]?.[1] ?? 1;
  const sourceCounts = new Map<string, number>();
  for (const log of logs) {
    if (log.source) {
      sourceCounts.set(log.source, (sourceCounts.get(log.source) ?? 0) + 1);
    }
  }
  const sources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // A year's breakdown rarely fills the sheet; give what's left to the most
  // recent pieces. Heights are the layout's own: 70 per form row, the
  // sources box, 114 per piece row.
  const sourcesBlock = sources.length ? 150 + sources.length * 57 : 0;
  const yearRows = logs.slice(
    0,
    Math.max(
      0,
      Math.min(4, Math.floor((990 - forms.length * 70 - sourcesBlock) / 114)),
    ),
  );

  const fonts = await loadPosterFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: FIELD,
          padding: "72px",
          position: "relative",
          color: INK,
          fontFamily: fonts ? FACE : undefined,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={markDataUri({ seed: handle })}
          width={176}
          height={176}
          alt=""
          style={{ position: "absolute", top: 56, right: 56 }}
        />
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 6,
          }}
        >
          Everything Counts
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 150,
            fontSize: 132,
            fontWeight: 900,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          <div style={{ display: "flex" }}>{title}</div>
          {yearLabel && (
            <div style={{ display: "flex", color: RED }}>{yearLabel}</div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 34,
            fontWeight: 700,
            opacity: 0.7,
          }}
        >
          @{handle}
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 40 }}>
          <div
            style={{
              display: "flex",
              fontSize: 150,
              fontWeight: 900,
              lineHeight: 1,
              color: RED,
            }}
          >
            {stats.pieces}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginLeft: 28,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            <div style={{ display: "flex", fontSize: 38, letterSpacing: 3 }}>
              {stats.pieces === 1 ? "thing read" : "things read"}
            </div>
            {stats.pieces > 0 && (
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  fontSize: 28,
                  letterSpacing: 3,
                  opacity: 0.7,
                }}
              >
                {formatEstTime(stats.estMinutes)}
              </div>
            )}
          </div>
        </div>

        {kind === "month" ? (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 34 }}>
            {rows.map((log) => (
              <PieceRow key={log.id} log={log} />
            ))}
            {more > 0 && (
              <div
                style={{
                  display: "flex",
                  marginTop: 18,
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                + {more} more
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
            {forms.map(([form, count]) => (
              <div
                key={form}
                style={{ display: "flex", alignItems: "center", marginTop: 16 }}
              >
                <div
                  style={{
                    display: "flex",
                    width: 250,
                    fontSize: 28,
                    fontWeight: 700,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {form}
                </div>
                <div
                  style={{
                    display: "flex",
                    height: 54,
                    width: Math.max(24, Math.round((count / maxForm) * 560)),
                    background: FORM_HEX[form] ?? INK,
                    border: `5px solid ${INK}`,
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    marginLeft: 20,
                    fontSize: 34,
                    fontWeight: 900,
                  }}
                >
                  {count}
                </div>
              </div>
            ))}

            {sources.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 64,
                  border: `5px solid ${INK}`,
                  background: PAPER,
                  padding: "28px 30px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: 5,
                    textTransform: "uppercase",
                    opacity: 0.6,
                  }}
                >
                  Read most from
                </div>
                {sources.map(([source, count]) => (
                  <div
                    key={source}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 16,
                      fontSize: 34,
                      fontWeight: 900,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <div style={{ display: "flex" }}>{clip(source, 30)}</div>
                    <div style={{ display: "flex", color: RED }}>{count}</div>
                  </div>
                ))}
              </div>
            )}

            {yearRows.length > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", marginTop: 36 }}
              >
                {yearRows.map((log) => (
                  <PieceRow key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            right: 0,
            background: INK,
            color: FIELD,
            padding: "30px 72px",
            display: "flex",
            fontSize: 26,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 3,
          }}
        >
          everything-counts.vercel.app/u/{handle}
        </div>
      </div>
    ),
    {
      ...STORY_SIZE,
      ...(fonts ? { fonts } : {}),
      // A month in progress changes; don't let the default year-long cache
      // freeze the card.
      headers: { "cache-control": "public, max-age=300" },
    },
  );
}

// --- The link preview for a piece ------------------------------------------------

// What a messaging app shows when someone sends a piece. The app prints the
// title under the image on its own, so the card never repeats it: the left
// side is the piece's own lead image (or, without one, where it was
// published, in big type), the right side is the seal, the form, and how
// many people logged it. Byline in the band.

const PHOTO = { width: 794, height: 552 };

// The piece's lead image as a data URI, if it is something the renderer can
// draw (JPEG or PNG, told by the bytes, not the URL or the header). Anything
// else, anything too big, any failure: null, and the card uses type instead.
async function leadImageDataUri(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    // Public hosts only: this URL came from a page's metadata or a form
    // field, and it is fetched from the server.
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.includes(":") ||
      /^[\d.]+$/.test(host)
    ) {
      return null;
    }
    const res = await fetch(u, {
      signal: controller.signal,
      // Ask for what can be drawn; CDNs that negotiate format honor this.
      headers: { Accept: "image/jpeg,image/png;q=0.9" },
    });
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength < 4 || bytes.byteLength > 6_000_000) return null;
    const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    if (!isJpeg && !isPng) return null;
    return `data:image/${isJpeg ? "jpeg" : "png"};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function workCard({
  form,
  loggerCount,
  source,
  author,
  image,
}: {
  form: string;
  loggerCount: number;
  source: string | null;
  author: string | null;
  image: string | null;
}): Promise<Response> {
  const [fonts, photo] = await Promise.all([
    loadPosterFonts(),
    image ? leadImageDataUri(image) : Promise.resolve(null),
  ]);

  const band =
    [author, source].filter(Boolean).join(" · ") ||
    "everything-counts.vercel.app";
  const big = source ?? "Everything Counts";
  const bigSize =
    big.length <= 10 ? 124 : big.length <= 18 ? 94 : big.length <= 30 ? 68 : 52;

  const render = (withPhoto: string | null) =>
    new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: FIELD,
            color: INK,
            fontFamily: fonts ? FACE : undefined,
          }}
        >
          <div style={{ display: "flex", height: PHOTO.height }}>
            <div
              style={{
                display: "flex",
                width: PHOTO.width + 6,
                height: PHOTO.height,
                borderRight: `6px solid ${INK}`,
                overflow: "hidden",
              }}
            >
              {withPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={withPhoto}
                  width={PHOTO.width}
                  height={PHOTO.height}
                  alt=""
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "0 56px",
                    fontSize: bigSize,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    lineHeight: 1.02,
                    wordBreak: "break-word",
                  }}
                >
                  {clip(big, 60)}
                </div>
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={markDataUri()} width={210} height={210} alt="" />
              <div
                style={{
                  display: "flex",
                  marginTop: 30,
                  background: FORM_HEX[form] ?? INK,
                  color: "#ffffff",
                  border: `5px solid ${INK}`,
                  padding: "10px 24px",
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                {form}
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: 4,
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                }}
              >
                Logged by {loggerCount} {loggerCount === 1 ? "person" : "people"}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flex: 1,
              background: INK,
              color: FIELD,
              padding: "0 56px",
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 4,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            {clip(band, 56)}
          </div>
        </div>
      ),
      { ...OG_SIZE, ...(fonts ? { fonts } : {}) },
    );

  // The renderer draws lazily, so a lead image it can't decode only fails
  // once the bytes are pulled. Pull them here: if the photo version throws,
  // the type version goes out instead of an error. An hour's cache, since
  // the logger count on the card moves.
  const headers = {
    "content-type": "image/png",
    "cache-control": "public, max-age=3600",
  };
  if (photo) {
    try {
      return new Response(await render(photo).arrayBuffer(), { headers });
    } catch {
      // fall through to the type version
    }
  }
  return new Response(await render(null).arrayBuffer(), { headers });
}
