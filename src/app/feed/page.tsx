import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getDailyPiece,
  getFeed,
  getRecentActivity,
  getSessionProfile,
} from "@/lib/data/logs";
import { dayNumber, nothingNew } from "@/lib/daily";
import type { FeedItem } from "@/lib/data/types";
import { DailyPiece } from "@/components/DailyPiece";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";

export const metadata = { title: "Your feed — Everything Counts" };

export const dynamic = "force-dynamic";

// Feed: what the people you follow (and you) have logged, newest first. Not
// algorithmic — reverse chronological.
export default async function Feed() {
  const { profile, hasSession } = await getSessionProfile();
  if (!profile) redirect(hasSession ? "/welcome" : "/signin");

  // Your feed is you + the people you follow. When that's empty (new here, or
  // following no one yet), fall back to recent activity across the network so
  // the feed is never a dead screen — discovery on first load.
  const items = await getFeed(profile.id);
  const showingNetwork = items.length === 0;
  const display = showingNetwork ? await getRecentActivity() : items;

  // A day with nothing new from anyone else: lead with one piece from the
  // record that this reader hasn't logged. It changes daily, so the screen
  // does too. The three cards they would see first are left out of the
  // running, and the chosen log isn't repeated in the list under it.
  const daily = await pieceForToday(profile.id, display);
  const list = daily
    ? display.filter((item) => item.log.id !== daily.log.id)
    : display;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="feed" />

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Feed
          </h2>
          <span
            className={`${showingNetwork ? "bg-accent-3" : "bg-accent"} px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white`}
          >
            {showingNetwork ? "Across the network" : "People you follow"}
          </span>
        </div>

        {display.length === 0 ? (
          <EmptyState title="No feed yet">
            Follow a few people to start one.{" "}
            <Link href="/people" className="text-accent-3 underline">
              Find people
            </Link>
          </EmptyState>
        ) : (
          <>
            {showingNetwork && (
              <p className="mt-6 border-l-4 border-accent-3 bg-paper px-4 py-3 font-serif text-[14px] leading-[1.55] text-foreground/75">
                No one you follow has logged yet. This is the wider network.{" "}
                <Link
                  href="/people"
                  className="font-structural text-xs font-bold uppercase tracking-[0.08em] text-accent-3 underline"
                >
                  Find people to follow
                </Link>
              </p>
            )}
            {daily && <DailyPiece item={daily} />}
            <ol className="mt-10 flex flex-col gap-12">
              {list.map(({ log, user }, i) => (
                <li
                  key={log.id}
                  className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
                >
                  <LogCard log={log} logger={user} />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}

async function pieceForToday(
  viewerId: string,
  display: FeedItem[],
): Promise<FeedItem | null> {
  const now = new Date();
  const recent = display.map(({ log }) => ({
    userId: log.userId,
    createdAt: log.createdAt,
  }));
  if (!nothingNew(recent, viewerId, now)) return null;
  return getDailyPiece(
    viewerId,
    dayNumber(now),
    display.slice(0, 3).map((item) => item.log.workId),
  );
}
