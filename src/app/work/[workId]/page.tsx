import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAlsoRead,
  getFolloweeIds,
  getRepliesForLogs,
  getSendablePeople,
  getSessionProfile,
  getWork,
} from "@/lib/data/logs";
import { removeReply } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";
import { Stars, formColor } from "@/components/LogCard";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { Avatar } from "@/components/Avatar";
import { ReplyForm } from "@/components/ReplyForm";
import { SendPieceForm } from "@/components/SendPieceForm";
import type { Log, Profile, Reply } from "@/lib/data/types";

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
  const [work, { profile: viewer }, alsoRead] = await Promise.all([
    getWork(workId),
    getSessionProfile(),
    getAlsoRead(workId),
  ]);
  if (!work) notFound();

  // Replies on each log, and who the viewer could send this piece to.
  const [replies, sendable] = await Promise.all([
    getRepliesForLogs(work.logs.map((log) => log.id)),
    viewer ? getSendablePeople(viewer.id) : Promise.resolve([]),
  ]);

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

          <div className="mt-5 flex flex-wrap items-center gap-4">
            {work.url && (
              <a
                href={work.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-accent hover:underline"
              >
                Open the piece ↗
              </a>
            )}
            <CopyLinkButton />
            {viewer && (
              <SendPieceForm
                people={sendable}
                workId={work.id}
                url={work.url}
                title={work.title}
              />
            )}
          </div>
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
              <PooledLog
                log={log}
                user={work.loggers.get(log.userId)}
                replies={replies.get(log.id) ?? []}
                viewer={viewer}
              />
            </li>
          ))}
        </ol>
      </section>

      {/* Discovery through overlap: what this work's readers also logged. */}
      {alsoRead.length > 0 && (
        <section className="mt-16">
          <h2 className="border-b-[3px] border-foreground pb-3 font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground">
            Readers of this also read
          </h2>
          <ol className="mt-6 flex flex-col gap-3">
            {alsoRead.map(({ log, readerCount }) => (
              <li key={log.workId}>
                <Link
                  href={`/work/${log.workId}`}
                  className="flex items-center justify-between gap-4 border-[3px] border-foreground bg-paper transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex min-w-0 items-center">
                    <span
                      className={`${formColor(log.form)} self-stretch px-2 py-2 font-structural text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white [writing-mode:vertical-rl]`}
                    >
                      {log.form}
                    </span>
                    <span className="min-w-0 px-4 py-3">
                      <span className="block truncate font-structural text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                        {log.title}
                      </span>
                      {(log.author || log.source) && (
                        <span className="block truncate font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground/55">
                          {[log.author, log.source].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </span>
                  {readerCount > 1 && (
                    <span className="shrink-0 pr-4 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
                      {readerCount} readers
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}

// One entry in the pool: who read it and when, plus their take and rating if
// they left any. A bare entry (no take, no rating) is the norm and is complete
// on its own — it records that this person read the piece. Replies, when
// there are any, sit under the take; a signed-in viewer who isn't the logger
// gets one line back.
function PooledLog({
  log,
  user,
  replies,
  viewer,
}: {
  log: Log;
  user?: Profile;
  replies: Reply[];
  viewer: Profile | null;
}) {
  const isOwner = viewer?.id === log.userId;
  const alreadyReplied = viewer
    ? replies.some((r) => r.user.id === viewer.id)
    : false;
  const canReply = Boolean(viewer) && !isOwner && !alreadyReplied;
  const hasBody =
    Boolean(log.take) || log.rating != null || replies.length > 0 || canReply;

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

          {replies.length > 0 && (
            <ol
              className={`flex flex-col gap-3 ${
                log.take || log.rating != null
                  ? "mt-4 border-t border-foreground/30 pt-4"
                  : ""
              }`}
            >
              {replies.map((reply) => {
                const canRemove =
                  isOwner || viewer?.id === reply.user.id;
                return (
                  <li key={reply.id} className="flex items-start gap-3">
                    <Avatar profile={reply.user} className="size-7 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-[13px] leading-[1.55] text-foreground/80">
                        <Link
                          href={`/u/${reply.user.handle}`}
                          className="mr-2 font-structural text-xs font-bold uppercase tracking-[0.04em] text-foreground hover:underline"
                        >
                          @{reply.user.handle}
                        </Link>
                        {reply.body}
                      </p>
                    </div>
                    {canRemove && (
                      <form action={removeReply}>
                        <input type="hidden" name="replyId" value={reply.id} />
                        <input type="hidden" name="workId" value={log.workId} />
                        <button
                          type="submit"
                          className="font-structural text-[0.6rem] font-bold uppercase tracking-[0.12em] text-foreground/40 hover:text-accent"
                          aria-label="Remove reply"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {canReply && (
            <div
              className={
                log.take || log.rating != null || replies.length > 0
                  ? "mt-4"
                  : ""
              }
            >
              <ReplyForm logId={log.id} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
