import { notFound } from "next/navigation";
import { getUsers, getWork } from "@/lib/data/logs";
import { CURRENT_USER_ID } from "@/lib/data/seed";
import { SiteHeader } from "@/components/SiteHeader";
import { Stars } from "@/components/LogCard";
import type { Log, User } from "@/lib/data/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : dateFormatter.format(d).toUpperCase();
}

// "Logged by N people you follow", accounting for whether the current user is
// among the loggers.
function loggedByLine(logs: Log[]): { you: boolean; followers: number } {
  const ids = new Set(logs.map((log) => log.userId));
  return {
    you: ids.has(CURRENT_USER_ID),
    followers: [...ids].filter((id) => id !== CURRENT_USER_ID).length,
  };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const work = await getWork(workId);
  if (!work) notFound();

  const users = await getUsers();
  const usersById = new Map(users.map((u) => [u.id, u]));

  const byline = [work.author, work.source].filter(Boolean).join(" · ");
  const { you, followers } = loggedByLine(work.logs);
  const people = followers === 1 ? "person" : "people";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      {/* The work's identity, shown once. */}
      <section className="mt-12 border-[3px] border-black bg-white">
        {work.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={work.image}
            alt=""
            className="block h-56 w-full border-b-[3px] border-black object-cover"
          />
        )}

        <div className="border-b-[3px] border-black">
          <span className="inline-block bg-accent px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-white">
            {work.form}
          </span>
        </div>

        <div className="p-5 sm:p-6">
          <h1 className="font-structural text-3xl font-bold uppercase leading-[1.02] tracking-[-0.02em] text-black sm:text-4xl">
            {work.title}
          </h1>

          {byline && (
            <p className="mt-4 border-t-2 border-black pt-2 font-structural text-xs font-bold uppercase tracking-[0.12em] text-black">
              {byline}
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
        <div className="border-b-[3px] border-black pb-3">
          <h2 className="font-structural text-2xl font-bold uppercase tracking-[-0.02em] text-black">
            {you && followers > 0 ? (
              <>
                You and <span className="text-accent">{followers}</span> {people}{" "}
                you follow logged this
              </>
            ) : you ? (
              <>You logged this</>
            ) : (
              <>
                Logged by <span className="text-accent">{followers}</span>{" "}
                {people} you follow
              </>
            )}
          </h2>
        </div>

        <ol className="mt-8 flex flex-col gap-6">
          {work.logs.map((log) => (
            <li key={log.id}>
              <PooledLog log={log} user={usersById.get(log.userId)} />
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
function PooledLog({ log, user }: { log: Log; user?: User }) {
  const hasBody = Boolean(log.take) || log.rating != null;

  return (
    <article className="border-[3px] border-black bg-white">
      <div
        className={`flex items-baseline justify-between gap-3 px-4 py-2.5 ${
          hasBody ? "border-b-[3px] border-black" : ""
        }`}
      >
        <span className="font-structural text-sm font-bold uppercase tracking-[0.04em] text-black">
          {user ? user.name : "Someone"}
          {user && (
            <span className="ml-2 font-normal normal-case tracking-normal text-accent">
              @{user.handle}
            </span>
          )}
        </span>
        <time className="shrink-0 font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-neutral-500">
          {formatDate(log.createdAt)}
        </time>
      </div>

      {hasBody && (
        <div className="px-4 py-4">
          {log.take && (
            <p className="font-serif text-[13px] leading-[1.5] text-neutral-600">
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
