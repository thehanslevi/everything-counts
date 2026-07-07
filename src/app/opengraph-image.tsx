import { OG_SIZE, posterCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Everything Counts";

// Site-wide share card.
export default function Image() {
  return posterCard({
    kicker: "For reading that goes beyond books",
    title: "Everything Counts",
    footer: "everything-counts.vercel.app",
  });
}
