import { ImageResponse } from "next/og";
import { markDataUri } from "@/lib/mark";

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
