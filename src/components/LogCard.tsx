import Link from "next/link";
import type { Log, User } from "@/lib/data/types";

// The log card: the single repeating unit across the product. Swiss-brutalist
// skin — loud in the frame (thick black border, hard form-tag banner, big
// grotesque title). The card centers the piece and, in the feed, the person who
// read it. Most logs have no take; the take, when present, is a small secondary
// note, not the card's focus. A takeless card is the norm and is complete on its
// own.
//
// On the solo profile it renders without attribution. In the social feed, pass
// `logger` to show whose log it is as a hard banner above the card.

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d).toUpperCase();
}

// Rating as a hard block: black field, accent-red filled marks. Exported so the
// work page can reuse the exact same presentation in its pooled logs.
export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex bg-black px-2 py-1 font-structural text-sm leading-none tracking-[0.15em]"
      aria-label={`Rated ${rating} out of 5`}
    >
      <span className="text-accent">{"★".repeat(rating)}</span>
      <span className="text-neutral-600">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function LogCard({ log, logger }: { log: Log; logger?: User }) {
  const byline = [log.author, log.source].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/work/${log.workId}`}
      className="block transition-colors"
      aria-label={`Open the work page for ${log.title}`}
    >
      <article className="border-[3px] border-black bg-white transition-colors hover:border-accent">
        {logger && (
        // Attribution banner: whose log this is. Feed only.
        <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-black px-4 py-2.5">
          <span className="font-structural text-sm font-bold uppercase tracking-[0.04em] text-black">
            {logger.name}
            <span className="ml-2 font-normal normal-case tracking-normal text-accent">
              @{logger.handle}
            </span>
          </span>
          <span className="shrink-0 text-right font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-neutral-500">
            {logger.role}
          </span>
        </div>
      )}

      {log.image && (
        // Lead image, full-bleed to the black border: no inset, no radius.
        // Plain img because the source host is arbitrary and not configured
        // for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={log.image}
          alt=""
          loading="lazy"
          className="block h-52 w-full border-b-[3px] border-black object-cover"
        />
      )}

      {/* Hard banner: accent form tag on the left, date on the right. */}
      <div className="flex items-stretch justify-between border-b-[3px] border-black">
        <span className="bg-accent px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-white">
          {log.form}
        </span>
        <time className="self-center px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.15em] text-black">
          {formatDate(log.createdAt)}
        </time>
      </div>

      <div className="p-5 sm:p-6">
        <h3 className="font-structural text-[1.7rem] font-bold uppercase leading-[1.02] tracking-[-0.02em] text-black sm:text-3xl">
          {log.title}
        </h3>

        {byline && (
          <p className="mt-4 border-t-2 border-black pt-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-black">
            {byline}
          </p>
        )}

        {log.take && (
          // A small secondary note when one exists. Minor by design.
          <p className="mt-3 font-serif text-[13px] leading-[1.5] text-neutral-600">
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
