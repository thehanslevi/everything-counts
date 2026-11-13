import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getFollowCounts,
  getLogsByUser,
  getWeeklyEmail,
  getProfileByHandle,
  getSessionProfile,
  isBlocked,
  isFollowing,
  sourceSlugsWithPages,
} from "@/lib/data/logs";
import { toggleWeeklyEmail } from "@/app/actions";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { ExternalLink } from "@/components/ExternalLink";
import { FollowButton } from "@/components/FollowButton";
import { formColor } from "@/components/LogCard";
import { RecordList } from "@/components/RecordList";
import { SafetyMenu } from "@/components/SafetyMenu";
import { SiteHeader } from "@/components/SiteHeader";
import { Avatar } from "@/components/Avatar";
import { ProfileEditPanel } from "@/components/ProfileEditPanel";
import { computeStats, formatEstTime } from "@/lib/data/stats";
import { parsePeriod } from "@/lib/period";
import { monthKeyIn } from "@/lib/dates";
import { getTimeZone } from "@/lib/timezone";
import { slugify, sourceHref } from "@/lib/slug";
import type { Log, Profile } from "@/lib/data/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);
  if (!person) return { title: "Everything Counts" };
  return {
    title: `${person.name} (@${person.handle}) — Everything Counts`,
    description: `${person.name}'s reading record on Everything Counts.`,
    alternates: {
      types: { "application/rss+xml": `/u/${person.handle}/rss` },
    },
  };
}

// A person's public reading record, newest first.
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const [{ handle }, { edit }] = await Promise.all([params, searchParams]);
  const person = await getProfileByHandle(handle);
  if (!person) notFound();

  const [{ profile: viewer }, logs, counts, timeZone, pubPages] =
    await Promise.all([
      getSessionProfile(),
      getLogsByUser(person.id),
      getFollowCounts(person.id),
      getTimeZone(),
      // Only publications that have a /source page get linked.
      sourceSlugsWithPages(person.favoritePublications.map(slugify)),
    ]);

  const isSelf = viewer?.id === person.id;
  const editing = isSelf && edit === "1";
  // Nothing added yet beyond a name: the edit button gets the accent.
  const bare =
    !person.avatarUrl &&
    !person.bio &&
    !person.pronouns &&
    !person.location &&
    !person.currentlyReading &&
    person.favoritePublications.length === 0 &&
    person.links.length === 0;
  const weeklyOn = isSelf ? await getWeeklyEmail() : false;
  const [following, blocked] =
    viewer && !isSelf
      ? await Promise.all([
          isFollowing(viewer.id, person.id),
          isBlocked(viewer.id, person.id),
        ])
      : [false, false];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 flex items-start justify-between gap-4 border-[3px] border-foreground bg-paper p-6 sm:p-7">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Avatar profile={person} className="size-16 sm:size-20" />
            {isSelf && !person.avatarUrl && !editing && (
              <Link
                href={`/u/${person.handle}?edit=1#edit`}
                className="w-16 text-center font-structural text-[0.6rem] font-bold uppercase leading-tight tracking-[0.1em] text-accent hover:underline sm:w-20"
              >
                Add a photo
              </Link>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground sm:text-3xl">
              {person.name}
              {person.pronouns && (
                <span className="ml-2 align-middle font-structural text-xs font-bold normal-case tracking-[0.04em] text-foreground/50 sm:text-sm">
                  {person.pronouns}
                </span>
              )}
            </h2>
            <p className="mt-1 font-structural text-sm text-foreground/50">
              @{person.handle}
              {person.location && <> · {person.location}</>}
            </p>
            {person.bio && (
              <p className="mt-3 font-serif text-[14px] leading-[1.55] text-foreground/75">
                {person.bio}
              </p>
            )}
            <ProfileDetails person={person} pubPages={pubPages} />
            <div className="mt-3 flex gap-4 font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground">
              <Link
                href={`/u/${person.handle}/followers`}
                className="hover:underline"
              >
                <span className="text-accent">{counts.followers}</span> Followers
              </Link>
              <Link
                href={`/u/${person.handle}/following`}
                className="hover:underline"
              >
                <span className="text-accent">{counts.following}</span> Following
              </Link>
            </div>
            {isSelf && !editing && (
              <Link
                href={`/u/${person.handle}?edit=1#edit`}
                className={`mt-4 inline-block ${
                  bare
                    ? "bg-accent text-white transition-opacity hover:opacity-85"
                    : "border-2 border-foreground text-foreground transition-colors hover:border-accent hover:text-accent"
                } px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em]`}
              >
                Edit profile
              </Link>
            )}
          </div>
        </div>
        {viewer && !isSelf && (
          <div className="flex shrink-0 items-start gap-2">
            <FollowButton followeeId={person.id} following={following} />
            <SafetyMenu
              targetUserId={person.id}
              name={person.name.split(" ")[0]}
              blocked={blocked}
            />
          </div>
        )}
      </section>

      {editing && (
        <section
          id="edit"
          className="mt-4 scroll-mt-4 border-[3px] border-foreground bg-paper"
        >
          <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
            Edit profile
          </h2>
          <div className="p-5 sm:p-6">
            <ProfileEditPanel profile={person} />
          </div>
        </section>
      )}

      {isSelf && (
        // The email switch (the weekly email and the founder's note share it):
        // its state, and one button to change it.
        <form
          action={toggleWeeklyEmail}
          className="mt-4 flex items-center justify-between gap-4 border-[3px] border-foreground bg-paper px-5 py-3"
        >
          <input type="hidden" name="on" value={String(!weeklyOn)} />
          <span className="font-structural text-xs font-bold uppercase tracking-[0.14em] text-foreground/70">
            Email{" "}
            <span className={weeklyOn ? "text-accent" : "text-foreground/40"}>
              {weeklyOn ? "On" : "Off"}
            </span>
          </span>
          <button
            type="submit"
            className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground underline decoration-foreground/40 underline-offset-2 hover:text-accent"
          >
            {weeklyOn ? "Turn off" : "Turn on"}
          </button>
        </form>
      )}

      {blocked ? (
        <section className="mt-14 border-[3px] border-foreground bg-paper p-6 sm:p-8">
          <p className="font-structural text-sm font-bold uppercase tracking-wide text-foreground">
            You blocked {person.name.split(" ")[0]}. Their logs are hidden from
            you across the app. Use the ••• menu above to unblock.
          </p>
        </section>
      ) : (
        <>
      {/* The anchor metric: pieces + estimated time, form-neutral. Quantity is
          a feature (the spec's reversed decision) — an honest mirror, shown on
          every profile so comparison can motivate. */}
      <Favorites logs={logs} />

      {logs.length > 0 && (
        <StatsBand
          logs={logs}
          isSelf={isSelf}
          name={person.name}
          timeZone={timeZone}
        />
      )}
      {logs.length > 0 && (
        <CardLinks
          handle={person.handle}
          latest={logs[0].createdAt}
          timeZone={timeZone}
        />
      )}

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            {isSelf ? "Your record" : "Record"}
          </h2>
          <span className="bg-accent-3 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
            Newest first
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="mt-8 font-structural text-sm font-bold uppercase tracking-wide text-foreground">
            Nothing logged yet.
          </p>
        ) : (
          <RecordList logs={logs} own={isSelf} timeZone={timeZone} />
        )}
      </section>
        </>
      )}

      {isSelf && (
        <section className="mt-20 border-[3px] border-foreground bg-paper">
          <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
            Account
          </h2>
          <div className="p-5 sm:p-6">
            <DeleteAccountForm handle={person.handle} />
          </div>
        </section>
      )}
    </main>
  );
}

// The optional details under the bio: links, currently reading, favorite
// publications. Each shows only when filled in, so a profile without them
// looks as it always did.
function ProfileDetails({
  person,
  pubPages,
}: {
  person: Profile;
  pubPages: Set<string>;
}) {
  const labelClass =
    "mr-1 whitespace-nowrap font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50";
  return (
    <>
      {person.links.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {person.links.map((url) => (
            <ExternalLink
              key={url}
              href={url}
              rel="me noopener nofollow"
              className="break-all font-structural text-xs font-bold uppercase tracking-[0.1em] text-accent-3 hover:underline"
            >
              {linkLabel(url, person.links)}
            </ExternalLink>
          ))}
        </p>
      )}
      {person.currentlyReading && (
        <p className="mt-3 font-serif text-[14px] leading-[1.55] text-foreground/75">
          <span className={labelClass}>Currently reading</span>{" "}
          {person.currentlyReading}
        </p>
      )}
      {person.favoritePublications.length > 0 && (
        <p className="mt-2 font-serif text-[14px] leading-[1.55] text-foreground/75">
          <span className={labelClass}>Favorite publications</span>{" "}
          {person.favoritePublications.map((name, i) => {
            const slug = slugify(name);
            return (
              <span key={`${name}-${i}`}>
                {i > 0 && " · "}
                {pubPages.has(slug) ? (
                  <Link
                    href={`/source/${slug}`}
                    className="underline decoration-foreground/30 underline-offset-2 hover:decoration-accent"
                  >
                    {name}
                  </Link>
                ) : (
                  name
                )}
              </span>
            );
          })}
        </p>
      )}
    </>
  );
}

// A link shown by its site: "example.com". When two links share a site, the
// path tells them apart.
function linkLabel(url: string, all: string[]): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./i, "");
    const shared = all.some(
      (other) =>
        other !== url &&
        (() => {
          try {
            return new URL(other).hostname.replace(/^www\./i, "") === host;
          } catch {
            return false;
          }
        })(),
    );
    if (!shared) return host;
    const path = u.pathname.replace(/\/$/, "");
    return path ? `${host}${path}` : host;
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/i, "");
  }
}

function plural(form: string, count: number): string {
  if (count === 1) return form;
  return form === "short story" ? "short stories" : `${form}s`;
}

// Up to four pieces this person chose to put first, in the order they chose
// them. Compact tiles; each opens the piece.
function Favorites({ logs }: { logs: Log[] }) {
  const pinned = logs
    .filter((log) => log.pinnedAt)
    .sort((a, b) => (a.pinnedAt ?? "").localeCompare(b.pinnedAt ?? ""))
    .slice(0, 4);
  if (pinned.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="border-b-[3px] border-foreground pb-3 font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground">
        Favorites
      </h2>
      <ol className="mt-6 grid grid-cols-2 gap-3 sm:gap-4">
        {pinned.map((log) => (
          <li key={log.id}>
            <Link
              href={`/work/${log.workId}`}
              className="flex h-full flex-col border-[3px] border-foreground bg-paper transition-transform hover:-translate-y-0.5"
            >
              {log.image ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={log.image}
                    alt=""
                    loading="lazy"
                    className="block h-24 w-full border-b-[3px] border-foreground object-cover sm:h-32"
                  />
                  <span
                    className={`${formColor(log.form)} self-start px-2 py-1 font-structural text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white`}
                  >
                    {log.form}
                  </span>
                </>
              ) : (
                // No lead image: a block in the form's color at the same
                // height, so the row of tiles stays even.
                <span
                  className={`${formColor(log.form)} flex h-24 w-full items-end border-b-[3px] border-foreground px-2 py-1 font-structural text-[0.6rem] font-bold uppercase tracking-[0.16em] text-white sm:h-32`}
                >
                  {log.form}
                </span>
              )}
              <span className="flex flex-1 flex-col p-3">
                <span className="line-clamp-3 break-words font-structural text-sm font-black uppercase leading-[1.05] tracking-[-0.01em] text-foreground">
                  {log.title}
                </span>
                {log.source && (
                  <span className="mt-2 truncate font-structural text-[0.6rem] font-bold uppercase tracking-[0.1em] text-foreground/55">
                    {log.source}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// The record as a poster: the most recent month with reading in it, and
// that year. Each opens a card made to be saved or sent.
function CardLinks({
  handle,
  latest,
  timeZone,
}: {
  handle: string;
  latest: string;
  timeZone: string;
}) {
  const month = parsePeriod(monthKeyIn(latest, timeZone));
  if (!month) return null;
  const linkClass =
    "border-b-2 border-foreground pb-0.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-accent hover:text-accent";
  return (
    <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      <Link href={`/u/${handle}/card/${month.key}`} className={linkClass}>
        {month.title} card
      </Link>
      <Link href={`/u/${handle}/card/${month.yearLabel}`} className={linkClass}>
        {month.yearLabel} card
      </Link>
    </p>
  );
}

// The reading-so-far band: "You read 5 things, about 1.5 hrs" for the year,
// with the form texture underneath and an all-time line when it differs.
function StatsBand({
  logs,
  isSelf,
  name,
  timeZone,
}: {
  logs: Parameters<typeof computeStats>[0];
  isSelf: boolean;
  name: string;
  timeZone: string;
}) {
  const stats = computeStats(logs, timeZone);
  const y = stats.thisYear;
  const who = isSelf ? "You read" : `${name.split(" ")[0]} read`;
  const forms = Object.entries(y.byForm).sort(([, a], [, b]) => b - a);

  // The three places this reading most often comes from, each linked to
  // everything logged here from it.
  const sourceCounts = new Map<string, number>();
  for (const log of logs) {
    if (log.source) {
      sourceCounts.set(log.source, (sourceCounts.get(log.source) ?? 0) + 1);
    }
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .flatMap(([name]) => {
      const href = sourceHref(name);
      return href ? [{ name, href }] : [];
    });

  return (
    <section className="mt-10 border-[3px] border-foreground bg-foreground p-6 sm:p-7">
      <p className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-background/60">
        {stats.year}
      </p>
      <p className="mt-2 font-structural text-2xl font-black uppercase leading-[1.05] tracking-[-0.01em] text-background sm:text-3xl">
        {who} <span className="text-accent">{y.pieces}</span>{" "}
        {y.pieces === 1 ? "thing" : "things"},{" "}
        <span className="text-accent">{formatEstTime(y.estMinutes)}</span>
      </p>
      {forms.length > 0 && (
        <p className="mt-3 font-structural text-[0.7rem] font-bold uppercase tracking-[0.14em] text-background/60">
          {forms
            .map(([form, count]) => `${count} ${plural(form, count)}`)
            .join(" · ")}
        </p>
      )}
      {stats.allTime.pieces > y.pieces && (
        <p className="mt-1 font-structural text-[0.7rem] font-bold uppercase tracking-[0.14em] text-background/40">
          All time: {stats.allTime.pieces} things,{" "}
          {formatEstTime(stats.allTime.estMinutes)}
        </p>
      )}
      {topSources.length > 0 && (
        <p className="mt-3 font-structural text-[0.7rem] font-bold uppercase tracking-[0.14em] text-background/60">
          Most from{" "}
          {topSources.map(({ name, href }, i) => (
            <span key={href}>
              {i > 0 && " · "}
              <Link
                href={href}
                className="text-background underline decoration-background/40 underline-offset-2 hover:decoration-accent"
              >
                {name}
              </Link>
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
