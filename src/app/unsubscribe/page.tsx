import Link from "next/link";
import { confirmUnsubscribe } from "@/app/actions";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Email — Everything Counts" };
export const dynamic = "force-dynamic";

// Where the stop link in the weekly email and the founder's note lands (they
// share one setting, so the page speaks of email in general). It asks before
// acting: mail scanners follow links, and a robot opening this page must not
// unsubscribe anyone. ?done=1 is the page after the button.
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; done?: string }>;
}) {
  const { t, done } = await searchParams;
  const token = t ?? "";

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
          Email
        </h2>
        <div className="p-5 sm:p-6">
          {done ? (
            <>
              <p className="font-structural text-lg font-black uppercase tracking-[-0.01em] text-foreground">
                It&apos;s off.
              </p>
              <p className="mt-3 font-serif text-[15px] leading-[1.6] text-foreground/75">
                You can turn it back on from your profile.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block font-structural text-xs font-bold uppercase tracking-[0.12em] text-accent hover:underline"
              >
                Everything Counts
              </Link>
            </>
          ) : token ? (
            <form action={confirmUnsubscribe}>
              <input type="hidden" name="token" value={token} />
              <p className="font-structural text-lg font-black uppercase tracking-[-0.01em] text-foreground">
                Stop email from Everything Counts?
              </p>
              <button
                type="submit"
                className="mt-5 rounded-none bg-accent px-6 py-2.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
              >
                Stop it
              </button>
            </form>
          ) : (
            <p className="font-serif text-[15px] leading-[1.6] text-foreground/75">
              That link is missing its code. You can turn email off from your
              profile.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
