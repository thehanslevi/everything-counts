import { OG_SIZE, posterCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Everything Counts";

// Site-wide share card.
export default function Image() {
  return posterCard({
    kicker: "The reading that counts nowhere else",
    title: "Everything Counts",
    footer: "everything-counts.vercel.app",
  });
}
