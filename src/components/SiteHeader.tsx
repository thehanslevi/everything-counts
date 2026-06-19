import Link from "next/link";

// The masthead and section nav, shared by the profile and the feed. Active tab
// is passed in by each page (server components, no client state needed).

function tabClass(active: boolean): string {
  const base =
    "flex-1 px-4 py-3 text-center font-structural text-sm font-bold uppercase tracking-[0.12em] transition-colors";
  return active
    ? `${base} bg-black text-white`
    : `${base} bg-white text-black hover:bg-accent hover:text-white`;
}

export function SiteHeader({ active }: { active?: "record" | "feed" }) {
  return (
    <header>
      <div className="border-b-[3px] border-black pb-4">
        <h1 className="font-structural text-5xl font-bold uppercase leading-[0.92] tracking-[-0.03em] text-black sm:text-6xl">
          Reading
          <br />
          <span className="text-accent">Log</span>
        </h1>
      </div>
      <p className="mt-4 font-structural text-sm font-bold uppercase tracking-[0.1em] text-black">
        An honest record of the reading that counts nowhere else.
      </p>

      <nav className="mt-8 flex border-[3px] border-black">
        <Link href="/" className={tabClass(active === "record")}>
          Your record
        </Link>
        <Link
          href="/feed"
          className={`border-l-[3px] border-black ${tabClass(active === "feed")}`}
        >
          Feed
        </Link>
      </nav>
    </header>
  );
}
