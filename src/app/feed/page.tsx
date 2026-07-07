import Link from "next/link";
import { redirect } from "next/navigation";
import { getFeed, getSessionProfile } from "@/lib/data/logs";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

// Feed: what the people you follow (and you) have logged, newest first. Not
// algorithmic — reverse chronological.
export default async function Feed() {
  const { profile, hasSession } = await getSessionProfile();
  if (!profile) redirect(hasSession ? "/welcome" : "/signin");

  const items = await getFeed(profile.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="feed" />

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Feed
          </h2>
          <span className="bg-accent px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
            People you follow
          </span>
        </div>

        {items.length === 0 ? (
          <EmptyState title="Nothing here yet">
            Your feed is the logging of the people you follow.{" "}
            <Link href="/people" className="text-accent-3 underline">
              Find people
            </Link>{" "}
            or log your own piece — it shows up here too.
          </EmptyState>
        ) : (
          <ol className="mt-10 flex flex-col gap-12">
            {items.map(({ log, user }, i) => (
              <li
                key={log.id}
                className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
              >
                <LogCard log={log} logger={user} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
