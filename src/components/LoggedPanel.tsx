"use client";

import { useEffect, useRef, useState } from "react";
import type { Log } from "@/lib/data/types";
import { LogCard } from "@/components/LogCard";
import { Mark } from "@/components/Mark";
import { savedHaptic } from "@/lib/native";

// What a save turns into: the finished card, the seal pressed onto its
// corner, one true line about the log, and two ways on. This is the moment
// the form exists for, so it takes the form's place rather than sitting
// under it.
export function LoggedPanel({
  log,
  line,
  shareUrl,
  onAnother,
}: {
  log: Log;
  line: string | null;
  shareUrl: string | null; // signed for this reader on the server
  onAnother: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [note, setNote] = useState<string | null>(null);

  // In the iOS app, a tap under the thumb as the card lands.
  useEffect(() => {
    void savedHaptic();
  }, []);

  // Save sits at the end of a long form; the card takes its place near the
  // top. If that leaves any of it off screen, bring its top into view
  // instead of leaving the reader where the button used to be.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const box = el.getBoundingClientRect();
    if (box.top >= 0 && box.bottom <= window.innerHeight) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
  }, []);

  // The phone's own share sheet where there is one, the clipboard otherwise.
  async function share() {
    if (!shareUrl) return;
    setNote(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: log.title, url: shareUrl });
        return;
      } catch (err) {
        // Closing the share sheet is not an error; anything else falls
        // through to copying.
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setNote("Link copied");
    } catch {
      setNote("Couldn't copy the link");
    }
  }

  return (
    <div ref={ref} className="flex scroll-mt-24 flex-col gap-5">
      <p role="status" className="sr-only">
        Logged {log.title}.
      </p>

      {/* The seal is pressed onto the card's top corner like a rubber stamp.
          Over a lead image it sits onto the picture. Without one that corner
          holds the date, so it rides higher and only its rays cross the card. */}
      <div
        className={`relative -rotate-[0.6deg] ${log.image ? "pt-9" : "pt-[4.5rem]"}`}
      >
        <LogCard log={log} />
        <Mark className="pointer-events-none absolute -right-2 top-0 block size-24 rotate-12 [animation:stamp_0.45s_cubic-bezier(0.2,0.8,0.2,1)] sm:-right-6 sm:size-28" />
      </div>

      {line && (
        <p className="border-l-4 border-accent-3 pl-3 font-structural text-sm font-bold uppercase tracking-[0.08em] text-foreground">
          {line}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {shareUrl && (
          <button
            type="button"
            onClick={share}
            className="rounded-none bg-accent px-5 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-transform hover:opacity-85 active:scale-95"
          >
            Share
          </button>
        )}
        <button
          type="button"
          onClick={onAnother}
          className="rounded-none border-2 border-foreground px-5 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-foreground hover:text-background active:scale-95"
        >
          Log another
        </button>
        {note && (
          <span
            role="status"
            className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/60"
          >
            {note}
          </span>
        )}
      </div>
    </div>
  );
}
