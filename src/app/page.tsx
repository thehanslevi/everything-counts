import { getLogs } from "@/lib/data/logs";
import { LogForm } from "@/components/LogForm";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";

// Home (Your record): log a piece, and below it the profile — a chronological
// record of everything the current user has logged, newest first, as cards. No
// counts or metrics; chronological texture only.
export default async function Home() {
  const logs = await getLogs();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="record" />

      {/* Log a piece */}
      <section className="mt-14 border border-foreground">
        <h2 className="bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
          Log a piece
        </h2>
        <div className="p-5 sm:p-6">
          <LogForm />
        </div>
      </section>

      {/* The record */}
      <section className="mt-16">
        <div className="flex items-end justify-between border-b border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Your record
          </h2>
          <span className="font-structural text-xs font-bold uppercase tracking-[0.18em] text-accent">
            <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
            Newest first
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="mt-8 font-structural text-sm font-bold uppercase tracking-wide text-foreground">
            Nothing logged yet.
          </p>
        ) : (
          <ol className="mt-8 flex flex-col gap-10">
            {logs.map((log) => (
              <li key={log.id}>
                <LogCard log={log} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
