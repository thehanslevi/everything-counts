import Link from "next/link";
import { searchProfiles, searchWorks } from "@/lib/data/logs";
import { formColor } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// Search: works (grouped by piece) and people, matched on title, author,
// source, handle, name, and role.
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [works, people] = query
    ? await Promise.all([searchWorks(query), searchProfiles(query)])
    : [[], []];

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            {query ? `“${query}”` : "Search"}
          </h2>
          {query && (
            <span className="bg-accent-3 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
              {works.length + people.length} result
              {works.length + people.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {!query ? (
          <p className="mt-8 font-serif text-[15px] leading-[1.6] text-foreground/75">
            Type something in the search box above — a title, an author, a
            source, or a person.
          </p>
        ) : works.length + people.length === 0 ? (
          <p className="mt-8 font-structural text-sm font-bold uppercase tracking-wide text-foreground">
            Nothing found. Log it first?
          </p>
        ) : (
          <>
            {people.length > 0 && (
              <div className="mt-8">
                <h3 className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground/50">
                  People
                </h3>
                <ol className="mt-3 flex flex-col gap-3">
                  {people.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/u/${p.handle}`}
                        className="flex items-baseline justify-between gap-4 border-[3px] border-foreground bg-paper px-4 py-3 transition-transform hover:-translate-y-0.5"
                      >
                        <span className="min-w-0 truncate font-structural text-sm font-bold uppercase tracking-[0.04em] text-foreground">
                          {p.name}
                          <span className="ml-2 font-normal normal-case tracking-normal text-foreground/50">
                            @{p.handle}
                          </span>
                        </span>
                        {p.role && (
                          <span className="shrink-0 truncate font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50">
                            {p.role}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {works.length > 0 && (
              <div className="mt-10">
                <h3 className="font-structural text-xs font-bold uppercase tracking-[0.2em] text-foreground/50">
                  Works
                </h3>
                <ol className="mt-3 flex flex-col gap-3">
                  {works.map(({ log, loggerCount }) => (
                    <li key={log.workId}>
                      <Link
                        href={`/work/${log.workId}`}
                        className="block border-[3px] border-foreground bg-paper transition-transform hover:-translate-y-0.5"
                      >
                        <div className="flex items-stretch justify-between border-b border-foreground/25">
                          <span
                            className={`${formColor(log.form)} px-2.5 py-1.5 font-structural text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white`}
                          >
                            {log.form}
                          </span>
                          <span className="self-center px-3 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
                            {loggerCount} logger{loggerCount === 1 ? "" : "s"}
                          </span>
                        </div>
                        <div className="px-4 py-3">
                          <span className="font-structural text-base font-extrabold uppercase leading-tight tracking-[-0.01em] text-foreground hyphens-auto break-words">
                            {log.title}
                          </span>
                          {(log.author || log.source) && (
                            <span className="mt-1 block font-structural text-[0.7rem] font-medium uppercase tracking-[0.1em] text-foreground/60">
                              {[log.author, log.source].filter(Boolean).join(" · ")}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
