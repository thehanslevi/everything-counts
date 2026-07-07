import Link from "next/link";
import type { Form, Log, Profile } from "@/lib/data/types";

// The log card: the single repeating unit across the product. Loud Japanese-
// poster treatment — thick ink frames on a saturated field, a clashing color
// banner per form, and a calm paper body so the reading itself stays quiet.
// Most logs have no take; the take, when present, is a small secondary note.
// A takeless card is the norm and is complete on its own.
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

// Each form claims one of the clashing accents. The clash is the point: no
// form is privileged, but every form is loud.
const FORM_COLORS: Record<Form, string> = {
  essay: "bg-accent",
  article: "bg-accent-3",
  report: "bg-accent-2",
  poem: "bg-accent-2",
  chapter: "bg-accent-3",
  "short story": "bg-accent",
  other: "bg-foreground",
};

export function formColor(form: Form): string {
  return FORM_COLORS[form] ?? "bg-foreground";
}

// Rating as a row of discs cycling the three accents — a tiny Yokoo rainbow.
// Exported so the work page reuses the exact same presentation.
const DISC_COLORS = ["bg-accent", "bg-accent-2", "bg-accent-3"];

export function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="inline-flex items-center gap-1.5"
      aria-label={`Rated ${rating} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`size-3 rounded-full ${
            n <= rating
              ? DISC_COLORS[(n - 1) % DISC_COLORS.length]
              : "border-2 border-foreground/40"
          }`}
        />
      ))}
    </span>
  );
}

export function LogCard({ log, logger }: { log: Log; logger?: Profile }) {
  const byline = [log.author, log.source].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/work/${log.workId}`}
      className="block"
      aria-label={`Open the work page for ${log.title}`}
    >
      <article className="border-[3px] border-foreground bg-paper transition-all hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--accent-3)] active:translate-y-0 active:shadow-none">
        {logger && (
          // Attribution: whose log this is, on a hard ink band. Feed only.
          <div className="flex items-baseline justify-between gap-3 border-b-[3px] border-foreground bg-foreground px-4 py-2.5">
            <span className="font-structural text-sm font-bold uppercase tracking-[0.04em] text-background">
              {logger.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-background/60">
                @{logger.handle}
              </span>
            </span>
            <span className="shrink-0 text-right font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-background/60">
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
            className="block h-52 w-full border-b-[3px] border-foreground object-cover"
          />
        )}

        {/* Hard banner: the form's clashing color, date opposite. */}
        <div className="flex items-stretch justify-between border-b-[3px] border-foreground">
          <span
            className={`${formColor(log.form)} px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-white`}
          >
            {log.form}
          </span>
          <time className="self-center px-3 py-2 font-structural text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground/60">
            {formatDate(log.createdAt)}
          </time>
        </div>

        <div className="p-6 sm:p-7">
          <h3 className="font-structural text-[1.5rem] font-black uppercase leading-[1.02] tracking-[-0.01em] text-foreground hyphens-auto break-words sm:text-[1.85rem]">
            {log.title}
          </h3>

          {byline && (
            <p className="mt-4 border-t-2 border-foreground pt-2 font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/75">
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
