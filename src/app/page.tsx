import Link from "next/link";
import {
  getLogsByUser,
  getRecentActivity,
  getSessionProfile,
} from "@/lib/data/logs";
import { LogForm } from "@/components/LogForm";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { BulkImport } from "@/components/BulkImport";

export const dynamic = "force-dynamic";

// Home. Signed in: log a piece + your chronological record, newest first.
// Signed out: the pitch and recent activity across the network.
//
// ?logurl= is the share-sheet landing pad: the iOS share extension opens the
// app here with the shared URL, and the log form pre-fills from it.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ logurl?: string }>;
}) {
  const [{ profile, hasSession }, { logurl }] = await Promise.all([
    getSessionProfile(),
    searchParams,
  ]);

  if (!profile) {
    const recent = await getRecentActivity();
    return (
      <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
        <SiteHeader />

        <section className="mt-14 border-[3px] border-foreground bg-paper p-6 sm:p-8">
          <h2 className="font-structural text-2xl font-black uppercase leading-[1.05] tracking-[-0.01em] text-foreground sm:text-3xl">
            The essay counts. The poem counts.
            <br />
            The chapter counts.
          </h2>
          <p className="mt-4 font-serif text-[15px] leading-[1.6] text-foreground/75">
            Keep a record of what you read, and see what the people you trust
            are reading.
          </p>
          <Link
            href={hasSession ? "/welcome" : "/signin"}
            className="mt-6 inline-block bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
          >
            {hasSession ? "Finish setup" : "Start your record"}
          </Link>
        </section>

        {recent.length > 0 && (
          <section className="mt-16">
            <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
              <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
                Recently logged
              </h2>
              <span className="bg-accent-3 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
                Across the network
              </span>
            </div>
            <ol className="mt-10 flex flex-col gap-12">
              {recent.map(({ log, user }, i) => (
                <li
                  key={log.id}
                  className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
                >
                  <LogCard log={log} logger={user} />
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    );
  }

  const logs = await getLogsByUser(profile.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="record" />

      {/* Log a piece */}
      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-accent-2 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
          Log a piece
        </h2>
        <div className="p-5 sm:p-6">
          <LogForm initialUrl={logurl} />
        </div>
        {/* Backfill: log a whole list at once. Tucked away so it never
            competes with the primary single-log flow. */}
        <details className="border-t-[3px] border-foreground">
          <summary className="cursor-pointer list-none px-5 py-3 font-structural text-xs font-bold uppercase tracking-[0.14em] text-foreground/70 transition-colors hover:text-foreground">
            + Backfill a reading list
          </summary>
          <div className="border-t border-foreground/25 p-5 sm:p-6">
            <BulkImport />
          </div>
        </details>
      </section>

      {/* The record */}
      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Your record
          </h2>
          <span className="bg-accent-3 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
            Newest first
          </span>
        </div>

        {logs.length === 0 ? (
          <EmptyState title="Nothing logged yet">
            Paste a link above to log your first piece.
          </EmptyState>
        ) : (
          <ol className="mt-10 flex flex-col gap-12">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
              >
                <LogCard log={log} />
                <div className="mt-1 text-right">
                  <Link
                    href={`/log/${log.id}/edit`}
                    className="font-structural text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground/40 hover:text-accent"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
