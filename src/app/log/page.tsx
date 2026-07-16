import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { LogForm } from "@/components/LogForm";
import { Bookmarklet } from "@/components/Bookmarklet";

export const metadata = { title: "Log a piece — Everything Counts" };
export const dynamic = "force-dynamic";

// The quick-log landing pad. Everything that wants to log "from outside"
// funnels here with ?url= — the bookmarklet, the Android/desktop share sheet
// (via the web app manifest's share_target), and the iOS share extension
// (whose /?logurl= is redirected here by the home page). Metadata is fetched
// automatically, so arriving with a URL means: one tap on Save.
//
// Share targets don't agree on where the link goes — some put it in `url`,
// others (Substack's Android share, for one) bury it in `text`. Take either.
function sharedUrl(params: { url?: string; text?: string }): string | undefined {
  if (params.url?.trim()) return params.url.trim();
  return params.text?.match(/https?:\/\/\S+/)?.[0];
}

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string; text?: string }>;
}) {
  const [{ profile, hasSession }, params] = await Promise.all([
    getSessionProfile(),
    searchParams,
  ]);
  const shared = sharedUrl(params);

  // Signed out: through sign-in and straight back here, URL intact.
  if (!profile) {
    if (hasSession) redirect("/welcome");
    const dest = shared ? `/log?url=${encodeURIComponent(shared)}` : "/log";
    redirect(`/signin?next=${encodeURIComponent(dest)}`);
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      <section className="mt-10 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-accent-2 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
          Log a piece
        </h2>
        <div className="p-5 sm:p-6">
          <LogForm initialUrl={shared} autoFocus={!shared} />
        </div>
      </section>

      {!shared && <Bookmarklet />}
    </main>
  );
}
