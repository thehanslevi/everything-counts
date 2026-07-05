import { notFound } from "next/navigation";
import {
  getLogsByUser,
  getProfileByHandle,
  getSessionProfile,
  isFollowing,
} from "@/lib/data/logs";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { FollowButton } from "@/components/FollowButton";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";
import { computeStats, formatEstTime } from "@/lib/data/stats";

export const dynamic = "force-dynamic";

// A person's public reading record, newest first.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);
  if (!person) notFound();

  const [{ profile: viewer }, logs] = await Promise.all([
    getSessionProfile(),
    getLogsByUser(person.id),
  ]);

  const isSelf = viewer?.id === person.id;
  const following =
    viewer && !isSelf ? await isFollowing(viewer.id, person.id) : false;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 flex items-start justify-between gap-4 border-[3px] border-foreground bg-paper p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground sm:text-3xl">
            {person.name}
          </h2>
          <p className="mt-1 font-structural text-sm text-foreground/50">
            @{person.handle}
          </p>
          {person.role && (
            <p className="mt-2 font-structural text-xs font-medium uppercase tracking-[0.12em] text-foreground/70">
              {person.role}
            </p>
          )}
        </div>
        {viewer && !isSelf && (
          <FollowButton followeeId={person.id} following={following} />
        )}
      </section>

      {/* The anchor metric: pieces + estimated time, form-neutral. Quantity is
          a feature (the spec's reversed decision) — an honest mirror, shown on
          every profile so comparison can motivate. */}
      {logs.length > 0 && (
        <StatsBand logs={logs} isSelf={isSelf} name={person.name} />
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
          <ol className="mt-10 flex flex-col gap-12">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
              >
                <LogCard log={log} />
              </li>
            ))}
          </ol>
        )}
      </section>

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

function plural(form: string, count: number): string {
  if (count === 1) return form;
  return form === "short story" ? "short stories" : `${form}s`;
}

// The reading-so-far band: "You read 5 things, about 1.5 hrs" for the year,
// with the form texture underneath and an all-time line when it differs.
function StatsBand({
  logs,
  isSelf,
  name,
}: {
  logs: Parameters<typeof computeStats>[0];
  isSelf: boolean;
  name: string;
}) {
  const stats = computeStats(logs);
  const y = stats.thisYear;
  const who = isSelf ? "You read" : `${name.split(" ")[0]} read`;
  const forms = Object.entries(y.byForm).sort(([, a], [, b]) => b - a);

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
    </section>
  );
}
