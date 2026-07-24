"use client";

import { useEffect, useRef } from "react";

const SITE = "https://everything-counts.vercel.app";

// One-tap logging from any desktop browser: drag the link to the bookmarks
// bar, tap it on any page, land on /log with that page's URL ready to save.
// React refuses javascript: hrefs in JSX (rightly), so the href is set
// imperatively — the string is a constant we authored, not user input.
const BOOKMARKLET = `javascript:location.href='${SITE}/log?url='+encodeURIComponent(location.href)`;

export function Bookmarklet() {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    ref.current?.setAttribute("href", BOOKMARKLET);
  }, []);

  return (
    <section className="mt-10 border-[3px] border-foreground bg-paper p-5 sm:p-6">
      <h3 className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground/60">
        Log from anywhere
      </h3>
      <p className="mt-3 font-serif text-[14px] leading-[1.6] text-foreground/75">
        Drag this to your bookmarks bar, then tap it on any page:
      </p>
      <a
        ref={ref}
        onClick={(e) => e.preventDefault()}
        className="mt-3 inline-block cursor-grab border-2 border-foreground bg-accent px-4 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white"
        title="Drag me to your bookmarks bar"
      >
        ⊕ Log this
      </a>
      <p className="mt-4 font-serif text-[13px] leading-[1.5] text-foreground/55">
        On a phone: share a page from any app (Safari, Substack) and pick
        Everything Counts. On this page, pasting a link logs it too.
      </p>
    </section>
  );
}
