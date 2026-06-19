import { getFeed } from "@/lib/data/logs";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";

// Feed: what the people you follow (and you) have shared, newest first. Not
// algorithmic — reverse chronological. Reuses LogCard with attribution.
export default async function Feed() {
  const items = await getFeed();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="feed" />

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-black pb-3">
          <h2 className="font-structural text-3xl font-bold uppercase tracking-[-0.02em] text-black">
            Feed
          </h2>
          <span className="font-structural text-xs font-bold uppercase tracking-[0.18em] text-accent">
            People you follow
          </span>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 font-structural text-sm font-bold uppercase tracking-wide text-black">
            Nothing shared yet.
          </p>
        ) : (
          <ol className="mt-8 flex flex-col gap-10">
            {items.map(({ log, user }) => (
              <li key={log.id}>
                <LogCard log={log} logger={user} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
