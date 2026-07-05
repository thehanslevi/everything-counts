import { notFound } from "next/navigation";
import Link from "next/link";
import { getFolloweeIds, getSessionProfile, getWork } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { Stars, formColor } from "@/components/LogCard";
import type { Log, Profile } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const work = await getWork(workId);
  if (!work) return { title: "Everything Counts" };
  const byline = [work.author, work.source].filter(Boolean).join(" · ");
  return {
    title: `${work.title} — Everything Counts`,
    description: byline
      ? `${byline}. Logged on Everything Counts.`
      : "Logged on Everything Counts.",
  };
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d).toUpperCase();
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const [work, { profile: viewer }] = await Promise.all([
    getWork(workId),
    getSessionProfile(),
  ]);
  if (!work) notFound();

  const byline = [work.author, work.source].filter(Boolean).join(" · ");

  const loggerIds = new Set(work.logs.map((log) => log.userId));
  const you = viewer ? loggerIds.has(viewer.id) : false;
  const others = [...loggerIds].filter((id) => id !== viewer?.id).length;
  const people = others === 1 ? "person" : "people";

  // Average rating across all logs that carry one (Goodreads book-page DNA,
  // rendered visually minor per the spec).
  const ratings = work.logs
    .map((log) => log.rating)
    .filter((r): r is number => r != null);
  const avgRating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  // "Including N you follow" — the social-proof overlap for the viewer.
  const followedLoggers = viewer
    ? [...(await getFolloweeIds(viewer.id))].filter((id) => loggerIds.has(id))
        .length
    : 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      {/* The work's identity, shown once. */}
      <section className="mt-12 border-[3px] border-foreground bg-paper">
        {work.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.image}
            alt=""
            className="block h-56 w-full border-b-[3px] border-foreground object-cover"
          />
        )}

        <div className="border-b-[3px] border-foreground">
          <span
            className={`${formColor(work.form)} inline-block px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-white`}
          >
            {work.form}
          </span>
        </div>

        <div className="p-6 sm:p-8">
          <h1 className="font-structural text-3xl font-black uppercase leading-[1.02] tracking-[-0.01em] text-foreground hyphens-auto break-words sm:text-4xl">
            {work.title}
          </h1>

          {byline && (
            <p className="mt-4 border-t-2 border-foreground pt-2 font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/75">
              {byline}
            </p>
          )}

          {avgRating != null && (
            <p className="mt-4 flex items-center gap-2">
              <Stars rating={Math.round(avgRating)} />
              <span className="font-structural text-[0.7rem] font-bold uppercase tracking-[0.12em] text-foreground/60">
                {avgRating} avg · {ratings.length} rating
                {ratings.length === 1 ? "" : "s"}
              </span>
            </p>
          )}

          {work.url && (
            <a
              href={work.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block font-structural text-xs font-bold uppercase tracking-[0.12em] text-accent hover:underline"
            >
              Open the piece ↗
            </a>
          )}
        </div>
      </section>

      {/* The pool: who logged this piece. */}
      <section className="mt-16">
        <div className="border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground">
            {you && others > 0 ? (
              <>
                You and <span className="text-accent">{others}</span> other{" "}
                {people} logged this
              </>
            ) : you ? (
              <>You logged this</>
            ) : (
              <>
                Logged by <span className="text-accent">{others}</span> {people}
              </>
            )}
          </h2>
          {followedLoggers > 0 && !(you && others === followedLoggers && others === 0) && (
            <p className="mt-1 font-structural text-xs font-bold uppercase tracking-[0.14em] text-foreground/60">
              Including{" "}
              <span className="text-accent">{followedLoggers}</span>{" "}
              {followedLoggers === 1 ? "person" : "people"} you follow
            </p>
          )}
        </div>

        <ol className="mt-8 flex flex-col gap-6">
          {work.logs.map((log) => (
            <li key={log.id}>
              <PooledLog log={log} user={work.loggers.get(log.userId)} />
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

// One entry in the pool: who read it and when, plus their take and rating if
// they left any. A bare entry (no take, no rating) is the norm and is complete
// on its own — it records that this person read the piece.
function PooledLog({ log, user }: { log: Log; user?: Profile }) {
  const hasBody = Boolean(log.take) || log.rating != null;

  return (
    <article className="border-[3px] border-foreground bg-paper">
      <div
        className={`flex items-baseline justify-between gap-3 bg-foreground px-4 py-2.5 ${
          hasBody ? "border-b-[3px] border-foreground" : ""
        }`}
      >
        <span className="font-structural text-sm font-bold uppercase tracking-[0.04em] text-background">
          {user ? (
            <Link href={`/u/${user.handle}`} className="hover:underline">
              {user.name}
              <span className="ml-2 font-normal normal-case tracking-normal text-background/60">
                @{user.handle}
              </span>
            </Link>
          ) : (
            "Someone"
          )}
        </span>
        <time className="shrink-0 font-structural text-[0.65rem] font-medium uppercase tracking-[0.1em] text-background/60">
          {formatDate(log.createdAt)}
        </time>
      </div>

      {hasBody && (
        <div className="px-4 py-4">
          {log.take && (
            <p className="font-serif text-[13px] leading-[1.55] text-foreground/70">
              {log.take}
            </p>
          )}
          {log.rating != null && (
            <div className={log.take ? "mt-3" : ""}>
              <Stars rating={log.rating} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
