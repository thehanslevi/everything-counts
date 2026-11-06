import Link from "next/link";
import { notFound } from "next/navigation";
import { getLogsByUser, getProfileByHandle } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { CardActions } from "@/components/CardActions";
import { logsIn, parsePeriod } from "@/lib/period";
import { monthKeyIn, yearIn } from "@/lib/dates";
import { getTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const SITE = "https://everything-counts.vercel.app";

type Params = Promise<{ handle: string; period: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { handle, period: raw } = await params;
  const period = parsePeriod(raw);
  const person = period ? await getProfileByHandle(handle) : undefined;
  if (!period || !person) return { title: "Everything Counts" };
  const image = `${SITE}/u/${person.handle}/card/${period.key}/image`;
  return {
    title: `${person.name}, ${period.label} — Everything Counts`,
    description: `What ${person.name} read in ${period.label}.`,
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

// A month or a year of someone's record, as a poster to save or send.
export default async function CardPage({ params }: { params: Params }) {
  const { handle, period: raw } = await params;
  const period = parsePeriod(raw);
  if (!period) notFound();
  const person = await getProfileByHandle(handle);
  if (!person) notFound();

  // Months and years are the reader's own: a piece logged late on the 30th
  // belongs to that month where they are. The poster is asked for in the
  // same zone, so the picture and this page count the same pieces.
  const [all, timeZone] = await Promise.all([
    getLogsByUser(person.id),
    getTimeZone(),
  ]);
  const count = logsIn(all, period, timeZone).length;
  const src = `/u/${person.handle}/card/${period.key}/image?tz=${encodeURIComponent(timeZone)}`;

  // Step to the neighbors only where there is something to see: not into
  // the future, not before the first log.
  const keyOf = (when: string | Date) =>
    period.kind === "month"
      ? monthKeyIn(when, timeZone)
      : String(yearIn(when, timeZone));
  const nowKey = keyOf(new Date());
  const oldest = all[all.length - 1];
  const firstKey = oldest ? keyOf(oldest.createdAt) : nowKey;
  const hasPrev = period.prevKey >= firstKey;
  const hasNext = period.nextKey <= nowKey;

  const navClass =
    "font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground hover:text-accent";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4 border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            {period.label}
          </h2>
          <Link href={`/u/${person.handle}`} className={navClass}>
            @{person.handle}
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {hasPrev ? (
            <Link
              href={`/u/${person.handle}/card/${period.prevKey}`}
              className={navClass}
            >
              ← Earlier
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              href={`/u/${person.handle}/card/${period.nextKey}`}
              className={navClass}
            >
              Later →
            </Link>
          ) : (
            <span />
          )}
        </div>

        {/* Plain img: the poster is generated per request, not a static asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${person.name}'s reading in ${period.label}: ${count} ${
            count === 1 ? "piece" : "pieces"
          }.`}
          width={1080}
          height={1920}
          className="mx-auto mt-6 block h-auto w-full max-w-sm border-[3px] border-foreground"
        />

        <CardActions
          src={src}
          filename={`everything-counts-${person.handle}-${period.key}.png`}
          title={`${person.name}, ${period.label}`}
        />
      </section>
    </main>
  );
}
