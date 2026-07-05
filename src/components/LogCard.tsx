import Link from "next/link";
import type { Log, User } from "@/lib/data/types";

// The log card: the single repeating unit across the product. Japanese-poster
// treatment — sumi type on a warm paper block, hairline rules, a vermilion form
// label, and a disc-based rating. The card centers the piece and, in the feed,
// the person who read it. Most logs have no take; the take, when present, is a
// small secondary note. A takeless card is the norm and is complete on its own.
//
// On the solo profile it renders without attribution. In the social feed, pass
// `logger` to show whose log it is above the card.

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d).toUpperCase();
}

// Rating as a row of discs: filled vermilion for the score, ink outline for the
// rest. Exported so the work page reuses the exact same presentation.
export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`size-2.5 rounded-full ${
            n <= rating ? "bg-accent" : "border border-foreground/45"
          }`}
        />
      ))}
    </span>
  );
}

export function LogCard({ log, logger }: { log: Log; logger?: User }) {
  const byline = [log.author, log.source].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/work/${log.workId}`}
      className="block"
      aria-label={`Open the work page for ${log.title}`}
    >
      <article className="border border-foreground bg-[#f7f1e3] transition-colors hover:border-accent">
        {logger && (
          // Attribution: whose log this is, marked with a sun-disc. Feed only.
          <div className="flex items-baseline justify-between gap-3 border-b border-foreground px-4 py-3">
            <span className="font-structural text-sm font-bold uppercase tracking-[0.04em] text-foreground">
              <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
              {logger.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-foreground/50">
                @{logger.handle}
              </span>
            </span>
            <span className="shrink-0 text-right font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50">
              {logger.role}
            </span>
          </div>
        )}

        {log.image && (
          // Lead image, full-bleed. Plain img because the source host is
          // arbitrary and not configured for next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={log.image}
            alt=""
            loading="lazy"
            className="block h-52 w-full border-b border-foreground object-cover"
          />
        )}

        <div className="p-6 sm:p-7">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-accent">
              {log.form}
            </span>
            <time className="shrink-0 font-structural text-[0.65rem] font-medium uppercase tracking-[0.14em] text-foreground/50">
              {formatDate(log.createdAt)}
            </time>
          </div>

          <h3 className="mt-4 font-structural text-[1.5rem] font-extrabold uppercase leading-[1.04] tracking-[-0.01em] text-foreground hyphens-auto break-words sm:text-[1.85rem]">
            {log.title}
          </h3>

          {byline && (
            <p className="mt-4 border-t border-foreground/25 pt-3 font-structural text-xs font-medium uppercase tracking-[0.1em] text-foreground/70">
              {byline}
            </p>
          )}

          {log.take && (
            // A small secondary note when one exists. Minor by design.
            <p className="mt-3 font-serif text-[13px] leading-[1.55] text-foreground/70">
              {log.take}
            </p>
          )}

          {log.rating != null && (
            <div className="mt-5">
              <Stars rating={log.rating} />
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
