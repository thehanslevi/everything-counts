import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Newsreader, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial serif for the one calm zone: the take and readable body text.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Structural gothic for the poster frame: masthead, titles, labels. A clean
// Japanese-designed geometric gothic (heavy weights for poster scale). Wired to
// --font-structural in globals.css so the type stack stays easy to swap.
const zenKaku = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Everything Counts",
  description: "An honest record of the reading that counts nowhere else.",
};

// viewport-fit=cover lets the poster field run edge-to-edge in the iOS shell;
// the body's safe-area padding keeps content clear of the notch and home bar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
