import Link from "next/link";
import type { FeedItem } from "@/lib/data/types";
import { LogCard } from "@/components/LogCard";

// The day's piece at the top of the feed, set apart on ink so it doesn't
// read as the newest log. The card says whose record it came from; under it,
// two ways on.
export function DailyPiece({
  item,
  timeZone,
}: {
  item: FeedItem;
  timeZone: string;
}) {
  const { log, user } = item;
  return (
    <section
      aria-labelledby="daily-piece"
      className="mt-8 border-[3px] border-foreground bg-foreground p-4 sm:p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3
          id="daily-piece"
          className="font-structural text-sm font-bold uppercase tracking-[0.2em] text-background"
        >
          From the record
        </h3>
        <span className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.14em] text-background/60">
          Changes daily
        </span>
      </div>

      <div className="mt-4">
        <LogCard log={log} logger={user} timeZone={timeZone} />
      </div>

      {log.url && (
        <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <a
            href={log.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent px-4 py-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
          >
            Open the piece ↗
          </a>
          <Link
            href={`/log?url=${encodeURIComponent(log.url)}`}
            className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-background underline decoration-background/40 underline-offset-2 hover:decoration-accent"
          >
            Log it
          </Link>
        </p>
      )}
    </section>
  );
}
