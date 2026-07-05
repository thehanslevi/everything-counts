import Link from "next/link";

// The masthead and section nav, shared by the profile, feed, and work pages.
// Loud Japanese-poster treatment (Yokoo mode): a radiating sunburst, stroked
// display type, and a black strapline band on a saturated yellow field. Active
// tab is passed in by each page (server components, no client state needed).

function tabClass(active: boolean): string {
  const base =
    "px-4 py-2 font-structural text-sm font-bold uppercase tracking-[0.14em] transition-colors";
  return active
    ? `${base} bg-foreground text-background`
    : `${base} text-foreground hover:bg-foreground/10`;
}

export function SiteHeader({ active }: { active?: "record" | "feed" }) {
  return (
    <header>
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <h1 className="font-structural text-[2.35rem] font-black uppercase leading-[0.86] tracking-[-0.02em] text-foreground sm:text-7xl">
          Everything
          <br />
          <span className="text-transparent [-webkit-text-stroke:2.5px_var(--foreground)] sm:[-webkit-text-stroke:3.5px_var(--foreground)]">
            Counts
          </span>
        </h1>

        {/* The rising sun, radiating. */}
        <span
          aria-hidden
          className="relative mt-1 block size-16 shrink-0 sm:size-28"
        >
          <span className="absolute inset-0 rounded-full bg-[repeating-conic-gradient(var(--accent)_0deg_11deg,transparent_11deg_26deg)]" />
          <span className="absolute inset-[26%] rounded-full bg-accent" />
        </span>
      </div>

      <p className="mt-6 bg-foreground px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-background">
        An honest record of the reading that counts nowhere else.
      </p>

      <nav className="mt-8 flex items-center gap-3">
        <Link href="/" className={tabClass(active === "record")}>
          Your record
        </Link>
        <Link href="/feed" className={tabClass(active === "feed")}>
          Feed
        </Link>
      </nav>
    </header>
  );
}
