"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Native-style bottom tab bar, mobile only. Fixed to the bottom edge (clear of
// the home bar via safe-area padding), it keeps navigation in thumb reach and
// present at all times — the single biggest "this is an app" signal on a phone.
// The header nav still carries branding, account, and search on every width.

type Tab = { href: string; label: string; match: (p: string) => boolean };

const TABS: Tab[] = [
  { href: "/", label: "Record", match: (p) => p === "/" },
  { href: "/feed", label: "Feed", match: (p) => p.startsWith("/feed") },
  { href: "/search", label: "Search", match: (p) => p.startsWith("/search") },
  { href: "/people", label: "People", match: (p) => p.startsWith("/people") },
];

function Glyph({ tab, active }: { tab: Tab; active: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--foreground)";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 2.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (tab.label) {
    case "Record":
      return (
        <svg {...common}>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="14" y2="17" />
        </svg>
      );
    case "Feed":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="7" />
          <rect x="4" y="14" width="16" height="6" />
        </svg>
      );
    case "Search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6" />
          <line x1="20" y1="20" x2="15.5" y2="15.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="9" r="3" />
          <circle cx="16" cy="9" r="3" />
          <path d="M3 19c0-2.5 2.2-4 5-4s5 1.5 5 4" />
          <path d="M13 19c0-2.5 2.2-4 5-4 1 0 1.9.2 2.6.6" />
        </svg>
      );
  }
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex border-t-[3px] border-foreground bg-background sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 transition-transform active:scale-90"
          >
            <Glyph tab={tab} active={active} />
            <span
              className={`font-structural text-[0.6rem] font-bold uppercase tracking-[0.1em] ${
                active ? "text-accent" : "text-foreground"
              }`}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
