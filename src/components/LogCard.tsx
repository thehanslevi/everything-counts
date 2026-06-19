import type { Log } from "@/lib/data/types";

// The log card: the single repeating unit across the product. Shows the lead
// image when present, the form, the title as a beautiful object, the byline,
// the take as the dominant reflection, and an optional, visually minor rating.
// Every form is rendered with identical weight; none is privileged.

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d);
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="text-sm tracking-wide text-amber-500/80"
      aria-label={`Rated ${rating} out of 5`}
    >
      {"★".repeat(rating)}
      <span className="text-stone-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function LogCard({ log }: { log: Log }) {
  const byline = [log.author, log.source].filter(Boolean).join(" · ");

  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(28,25,23,0.06)]">
      {log.image && (
        // Lead image. Plain img because the source host is arbitrary and not
        // configured for next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={log.image}
          alt=""
          loading="lazy"
          className="h-52 w-full object-cover"
        />
      )}

      <div className="flex flex-col gap-3 p-6 sm:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-stone-400">
            {log.form}
          </span>
          <time className="shrink-0 text-xs text-stone-400">
            {formatDate(log.createdAt)}
          </time>
        </div>

        <h3 className="font-serif text-2xl leading-snug tracking-tight text-stone-900">
          {log.title}
        </h3>

        {byline && <p className="text-sm text-stone-500">{byline}</p>}

        {log.take && (
          <p className="mt-1 font-serif text-lg leading-relaxed text-stone-700">
            {log.take}
          </p>
        )}

        {log.rating != null && (
          <div className="mt-1">
            <Stars rating={log.rating} />
          </div>
        )}
      </div>
    </article>
  );
}
