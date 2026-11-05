import Link from "next/link";
import type { Catalog } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { Avatar } from "@/components/Avatar";
import { formColor } from "@/components/LogCard";

// Everything logged here from one publication, or by one author: the pieces,
// most-read first, then the people who read them. The same page for both;
// only the label and the second line of each row differ (a source's rows
// name the author, an author's rows name where it ran).
export function CatalogView({
  kind,
  catalog,
}: {
  kind: "source" | "author";
  catalog: Catalog;
}) {
  const pieces = catalog.works.length;
  const people = catalog.readers.length;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-12 border-[3px] border-foreground bg-paper">
        <div className="border-b-[3px] border-foreground">
          <span className="inline-block bg-foreground px-3 py-2 font-structural text-xs font-bold uppercase tracking-[0.2em] text-background">
            {kind === "source" ? "Source" : "Author"}
          </span>
        </div>
        <div className="p-6 sm:p-8">
          <h1 className="font-structural text-3xl font-black uppercase leading-[1.02] tracking-[-0.01em] text-foreground hyphens-auto break-words sm:text-4xl">
            {catalog.name}
          </h1>
          <p className="mt-4 border-t-2 border-foreground pt-2 font-structural text-xs font-bold uppercase tracking-[0.1em] text-foreground/75">
            <span className="text-accent">{pieces}</span>{" "}
            {pieces === 1 ? "piece" : "pieces"} logged ·{" "}
            <span className="text-accent">{people}</span>{" "}
            {people === 1 ? "reader" : "readers"}
          </p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="border-b-[3px] border-foreground pb-3 font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground">
          Pieces
        </h2>
        <ol className="mt-6 flex flex-col gap-3">
          {catalog.works.map(({ log, readerCount }) => {
            const second = kind === "source" ? log.author : log.source;
            return (
              <li key={log.workId}>
                <Link
                  href={`/work/${log.workId}`}
                  className="flex items-center justify-between gap-4 border-[3px] border-foreground bg-paper transition-transform hover:-translate-y-0.5"
                >
                  <span className="flex min-w-0 items-center">
                    <span
                      className={`${formColor(log.form)} self-stretch px-2 py-2 font-structural text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white [writing-mode:vertical-rl]`}
                    >
                      {log.form}
                    </span>
                    <span className="min-w-0 px-4 py-3">
                      <span className="block truncate font-structural text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                        {log.title}
                      </span>
                      {second && (
                        <span className="block truncate font-structural text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground/55">
                          {second}
                        </span>
                      )}
                    </span>
                  </span>
                  {readerCount > 1 && (
                    <span className="shrink-0 pr-4 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
                      {readerCount} readers
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="border-b-[3px] border-foreground pb-3 font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground">
          Read by
        </h2>
        <ol className="mt-6 flex flex-col gap-3">
          {catalog.readers.map(({ profile, pieces: count }) => (
            <li key={profile.id}>
              <Link
                href={`/u/${profile.handle}`}
                className="flex items-center justify-between gap-4 border-[3px] border-foreground bg-paper px-4 py-3 transition-transform hover:-translate-y-0.5"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar profile={profile} className="size-9" />
                  <span className="min-w-0 truncate font-structural text-sm font-bold uppercase tracking-[0.04em] text-foreground">
                    {profile.name}
                    <span className="ml-2 font-normal normal-case tracking-normal text-foreground/50">
                      @{profile.handle}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/50">
                  {count} {count === 1 ? "piece" : "pieces"}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
