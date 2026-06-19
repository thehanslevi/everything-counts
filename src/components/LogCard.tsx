import type { Log } from "@/lib/data/types";

// The log card: the single repeating unit across the product. Swiss-brutalist
// skin — loud in the frame (thick black border, hard form-tag banner, big
// grotesque title), calm in the take (readable serif). Data, fields, and
// structure are unchanged from Phase 2; this is purely a visual treatment.

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d).toUpperCase();
}

// Rating as a hard block: black field, accent-red filled marks.
function Stars({ rating }: { rating: number }) {
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

export function LogCard({ log }: { log: Log }) {
  const byline = [log.author, log.source].filter(Boolean).join(" · ");

  return (
    <article className="border-[3px] border-black bg-white">
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
          // The one calm zone: readable serif, normal weight, near-black.
          <p className="mt-4 font-serif text-[15px] font-normal leading-[1.55] text-neutral-900">
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
  );
}
