import { getLogs } from "@/lib/data/logs";
import { LogForm } from "@/components/LogForm";
import { LogCard } from "@/components/LogCard";

// Home: log a piece, and below it the profile — a chronological record of
// everything the current user has logged, newest first, each piece rendered as
// a beautiful card. This screen carries the emotional weight of the product, so
// it leans on whitespace and typography rather than chrome. No counts or
// metrics here; chronological texture only.
export default async function Home() {
  const logs = await getLogs();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-16 sm:py-20">
      <header className="mb-12">
        <h1 className="font-serif text-4xl tracking-tight text-stone-900">
          Reading Log
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-stone-600">
          An honest record of the reading that counts nowhere else.
        </p>
      </header>

      <section className="mb-16 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="mb-5 font-serif text-xl text-stone-900">Log a piece</h2>
        <LogForm />
      </section>

      <section>
        <div className="mb-8 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl tracking-tight text-stone-900">
            Your record
          </h2>
          <span className="text-xs uppercase tracking-[0.18em] text-stone-400">
            Newest first
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="text-stone-500">Nothing logged yet.</p>
        ) : (
          <ol className="flex flex-col gap-8">
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
