import Link from "next/link";

// The masthead and section nav, shared by the profile, feed, and work pages.
// Japanese-poster treatment: sumi type and a single vermilion sun-disc on warm
// paper, hairline rules, generous negative space. Active tab is passed in by
// each page (server components, no client state needed).

function tabClass(active: boolean): string {
  const base =
    "font-structural text-sm font-bold uppercase tracking-[0.16em] transition-colors";
  return active
    ? `${base} text-foreground`
    : `${base} text-foreground/40 hover:text-foreground`;
}

export function SiteHeader({ active }: { active?: "record" | "feed" }) {
  return (
    <header>
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <h1 className="font-structural text-[2.35rem] font-black uppercase leading-[0.86] tracking-[-0.02em] text-foreground sm:text-7xl">
          Everything
          <br />
          Counts
        </h1>
        {/* The rising sun. */}
        <span
          aria-hidden
          className="mt-1 block size-14 shrink-0 rounded-full bg-accent sm:size-24"
        />
      </div>

      <p className="mt-6 border-t border-foreground pt-3 font-structural text-xs font-medium uppercase tracking-[0.2em] text-foreground/70">
        An honest record of the reading that counts nowhere else.
      </p>

      <nav className="mt-8 flex items-center gap-8">
        <Link href="/" className={tabClass(active === "record")}>
          {active === "record" && (
            <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
          )}
          Your record
        </Link>
        <Link href="/feed" className={tabClass(active === "feed")}>
          {active === "feed" && (
            <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
          )}
          Feed
        </Link>
      </nav>
    </header>
  );
}
