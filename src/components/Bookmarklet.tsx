"use client";

import { useEffect, useRef } from "react";

const SITE = "https://everything-counts.vercel.app";

// One-tap logging from any desktop browser: drag the link to the bookmarks
// bar, tap it on any page, land on /log with that page ready to save.
//
// It runs in the reader's own browser, on a page they already have open, so
// it can read what our server often can't: paywalled publications turn our
// fetch away, but the title, byline, publication and lead image are in the
// page's own tags. Those go along with the link. Written plain (no
// arrow functions, no template strings) because it runs as-is on any page.
//
// React refuses javascript: hrefs in JSX (rightly), so the href is set
// imperatively — the string is a constant we authored, not user input.
const BOOKMARKLET = `javascript:(function(){var d=document,e=encodeURIComponent,m=function(s){var n=d.querySelector(s);return n&&n.getAttribute('content')||''},a=m('meta[name="author"]')||m('meta[name="byl"]')||m('meta[name="parsely-author"]')||m('meta[name="sailthru.author"]')||m('meta[name="citation_author"]')||m('meta[property="article:author"]');location.href='${SITE}/log?url='+e(location.href)+'&title='+e((m('meta[property="og:title"]')||d.title||'').slice(0,300))+'&author='+e(a.slice(0,200))+'&source='+e(m('meta[property="og:site_name"]').slice(0,120))+'&image='+e(m('meta[property="og:image"]')||m('meta[name="twitter:image"]'))})()`;

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
        It takes the title, author and picture from the page itself, so
        paywalled sites come through filled in.
      </p>
      <p className="mt-2 font-serif text-[13px] leading-[1.5] text-foreground/55">
        On a phone: share a page from any app (Safari, Substack) and pick
        Everything Counts. On this page, pasting a link logs it too.
      </p>
    </section>
  );
}
