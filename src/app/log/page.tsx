import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data/logs";
import { coerceUrl, isHandWorkId } from "@/lib/data/url";
import { FORMS, type Form } from "@/lib/data/types";
import { pageDetails } from "@/lib/links";
import { SiteHeader } from "@/components/SiteHeader";
import { LogForm } from "@/components/LogForm";
import { LogElsewhere } from "@/components/LogElsewhere";
import { FollowPeopleStep } from "@/components/FollowPeopleStep";

export const metadata = { title: "Log a piece — Everything Counts" };
export const dynamic = "force-dynamic";

// The quick-log landing pad. Everything that wants to log "from outside"
// funnels here with ?url= — the bookmarklet, the Android/desktop share sheet
// (via the web app manifest's share_target), and the iOS share extension
// (whose /?logurl= is redirected here by the home page). Metadata is fetched
// automatically, so arriving with a URL means: one tap on Save.
//
// The bookmarklet also sends what it read from the page the reader had open
// (title, author, source, image), and a share sheet sends a title. Those
// fill the form at once and cover the publications that won't let our own
// fetch in.
//
// Share targets don't agree on where the link goes — some put it in `url`,
// others (Substack's Android share, for one) bury it in `text`, sometimes
// with the title in front of it. coerceUrl digs the link out of either.
function sharedUrl(params: { url?: string; text?: string }): string | undefined {
  return coerceUrl(params.url ?? "") ?? coerceUrl(params.text ?? "") ?? undefined;
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{
    url?: string;
    text?: string;
    new?: string;
    title?: string;
    author?: string;
    source?: string;
    image?: string;
    form?: string;
    work?: string;
  }>;
}) {
  const [{ profile, hasSession }, params] = await Promise.all([
    getSessionProfile(),
    searchParams,
  ]);
  const shared = sharedUrl(params);
  const isNew = params.new === "1";
  const details = shared ? pageDetails(params, shared) : {};
  // No link: a piece from the record logged again ("Log it" on a work page
  // or the day's piece), carried as its details and the work it pools into.
  const piece = shared ? undefined : handPiece(params);

  // Signed out: through sign-in and straight back here, with the link and
  // whatever came with it intact.
  if (!profile) {
    if (hasSession) redirect("/welcome");
    const back = new URLSearchParams(
      shared ? { url: shared, ...details } : piece ? pieceParams(piece) : {},
    );
    const dest = back.size > 0 ? `/log?${back}` : "/log";
    redirect(`/signin?next=${encodeURIComponent(dest)}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      <section className="mt-10 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-accent-2 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
          {isNew && !shared ? "Log the last thing you read" : "Log a piece"}
        </h2>
        <div className="p-5 sm:p-6">
          {isNew && !shared && (
            <p className="mb-5 font-serif text-[15px] leading-[1.6] text-foreground/75">
              An article, a newsletter, a chapter — whatever you finished most
              recently. Paste the link.
            </p>
          )}
          <LogForm
            initialUrl={shared}
            prefill={piece ?? details}
            autoFocus={!shared && !piece}
          />
        </div>
      </section>

      {isNew && <FollowPeopleStep />}
      {!shared && !piece && <LogElsewhere />}
    </main>
  );
}

type HandPiece = {
  title: string;
  author?: string;
  source?: string;
  form?: Form;
  work?: string;
};

// The details of a no-link piece from the address, trimmed and capped the
// way the form would; nothing without a title.
function handPiece(params: {
  title?: string;
  author?: string;
  source?: string;
  form?: string;
  work?: string;
}): HandPiece | undefined {
  const clip = (value: string | undefined, max: number) =>
    (value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const title = clip(params.title, 300);
  if (!title) return undefined;
  const piece: HandPiece = { title };
  const author = clip(params.author, 200);
  const source = clip(params.source, 120);
  if (author) piece.author = author;
  if (source) piece.source = source;
  if (params.form && (FORMS as readonly string[]).includes(params.form)) {
    piece.form = params.form as Form;
  }
  if (params.work && isHandWorkId(params.work)) piece.work = params.work;
  return piece;
}

function pieceParams(piece: HandPiece): Record<string, string> {
  return Object.fromEntries(
    Object.entries(piece).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
}
