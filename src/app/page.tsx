import { getLogs } from "@/lib/data/logs";
import { LogForm } from "@/components/LogForm";

// Phase 1 home page: log a piece, and read it back through the data layer.
//
// The "Your record" list below is intentionally plain. It exists only to prove
// the saved log round-trips through getLogs(). Phase 2 replaces it with the
// real, designed profile.
export default async function Home() {
  const logs = await getLogs();

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-16">
      <header className="mb-10">
        <h1 className="font-serif text-3xl tracking-tight text-stone-900">
          Reading Log
        </h1>
        <p className="mt-2 text-stone-600">
          Log a piece you have read. Everything you read counts.
        </p>
      </header>

      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <LogForm />
      </section>

      <section className="mt-14">
        <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">
          Your record
        </h2>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing logged yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-200">
            {logs.map((log) => (
              <li key={log.id} className="py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-stone-900">
                    {log.title}
                  </span>
                  <span className="shrink-0 text-xs uppercase tracking-wide text-stone-400">
                    {log.form}
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-stone-500">
                  {[log.author, log.source].filter(Boolean).join(" · ")}
                  {log.rating ? `  ${"★".repeat(log.rating)}` : ""}
                </div>
                {log.take && (
                  <p className="mt-2 text-sm leading-relaxed text-stone-700">
                    {log.take}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
