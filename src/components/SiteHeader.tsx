import Link from "next/link";
import { getSessionProfile } from "@/lib/data/logs";
import { signOut } from "@/app/actions";
import { Mark } from "@/components/Mark";

// The masthead and section nav, shared across pages. Loud Japanese-poster
// treatment (Yokoo mode). Session-aware: signed-out visitors get a sign-in
// link; signed-in users get their handle and sign out. Active tab is passed in
// by each page.

function tabClass(active: boolean): string {
  const base =
    "px-4 py-2 font-structural text-sm font-bold uppercase tracking-[0.14em] transition-colors";
  return active
    ? `${base} bg-foreground text-background`
    : `${base} text-foreground hover:bg-foreground/10`;
}

export async function SiteHeader({
  active,
  variant = "full",
}: {
  active?: "record" | "feed" | "people";
  // "minimal" drops the search box and section nav — for onboarding pages
  // (sign in, welcome) where the form is the whole point and a full masthead
  // would bury it below the fold.
  variant?: "full" | "minimal";
}) {
  const { profile, hasSession } = await getSessionProfile();

  return (
    <header>
      <div className="flex items-start justify-between gap-4 sm:gap-6">
        <Link href="/" aria-label="Everything Counts home">
          <h1 className="font-structural text-[2.35rem] font-black uppercase leading-[0.86] tracking-[-0.02em] text-foreground sm:text-7xl">
            Everything
            <br />
            <span className="text-transparent [-webkit-text-stroke:2.5px_var(--foreground)] sm:[-webkit-text-stroke:3.5px_var(--foreground)]">
              Counts
            </span>
          </h1>
        </Link>

        {/* The rising-sun page seal. */}
        <Mark className="mt-1 block size-20 shrink-0 sm:size-32" />
      </div>

      <p className="mt-6 bg-foreground px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-background">
        For reading that goes beyond books.
      </p>
      {/* The Yokoo clash as a base rule: vermilion, magenta, blue. */}
      <div aria-hidden className="flex h-2">
        <span className="flex-1 bg-accent" />
        <span className="flex-1 bg-accent-2" />
        <span className="flex-1 bg-accent-3" />
      </div>

      {variant === "full" && (
        <>
      {/* Search: a plain GET form to /search. */}
      <form action="/search" className="mt-8 flex">
        <input
          type="search"
          name="q"
          placeholder="Search works and people"
          className="w-full rounded-none border-2 border-foreground bg-paper px-3 py-2 font-structural text-sm text-foreground outline-none placeholder:text-foreground/40 focus:border-accent"
        />
        <button
          type="submit"
          className="border-2 border-l-0 border-foreground bg-foreground px-4 font-structural text-xs font-bold uppercase tracking-[0.14em] text-background transition-colors hover:bg-accent hover:border-accent"
        >
          Search
        </button>
      </form>

      <nav className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/" className={tabClass(active === "record")}>
          {profile ? "Your record" : "Home"}
        </Link>
        {profile && (
          <Link href="/feed" className={tabClass(active === "feed")}>
            Feed
          </Link>
        )}
        <Link href="/people" className={tabClass(active === "people")}>
          People
        </Link>

        <span className="ml-auto flex items-center gap-3">
          {profile ? (
            <>
              <Link
                href={`/u/${profile.handle}`}
                className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground hover:underline"
              >
                @{profile.handle}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/50 hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : hasSession ? (
            <Link
              href="/welcome"
              className="bg-accent px-3 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              Finish setup
            </Link>
          ) : (
            <Link
              href="/signin"
              className="bg-accent px-3 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.1em] text-white"
            >
              Sign in
            </Link>
          )}
        </span>
      </nav>
        </>
      )}
    </header>
  );
}
