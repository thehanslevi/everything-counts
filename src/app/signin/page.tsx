import { redirect } from "next/navigation";
import {
  getProfileByHandle,
  getSessionProfile,
  getWork,
} from "@/lib/data/logs";
import { coerceUrl, workIdFor } from "@/lib/data/url";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// Sign in / sign up. ?ref=<handle> marks an invite: we show who invited them
// and the new account starts by following that person. ?piece=<url> is a
// piece that person sent: members land on it ready to log after signing in;
// a new account gets it as its first log, already filled in.
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; next?: string; piece?: string }>;
}) {
  const [{ profile, hasSession }, { ref, next, piece }] = await Promise.all([
    getSessionProfile(),
    searchParams,
  ]);
  // Same-site relative paths only; anything else is an open-redirect vector.
  const pieceUrl = piece ? coerceUrl(piece) : null;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : pieceUrl
        ? `/log?url=${encodeURIComponent(pieceUrl)}`
        : undefined;
  if (profile) redirect(safeNext ?? "/");
  if (hasSession) redirect("/welcome");

  const inviter = ref ? await getProfileByHandle(ref) : undefined;
  const sentWork =
    inviter && pieceUrl ? await getWork(workIdFor(pieceUrl, "")) : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      {inviter && (
        <section className="mt-14 border-[3px] border-foreground bg-foreground px-5 py-4">
          <p className="font-structural text-sm font-bold uppercase tracking-[0.08em] text-background">
            <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
            {sentWork
              ? `${inviter.name} sent you “${sentWork.title}”`
              : `${inviter.name} invited you to Everything Counts`}
          </p>
        </section>
      )}

      <section
        className={`${inviter ? "mt-6" : "mt-14"} border-[3px] border-foreground bg-paper p-6 sm:p-8`}
      >
        <AuthForm
          inviteRef={inviter?.handle}
          next={safeNext}
          piece={pieceUrl ?? undefined}
        />
        <p className="mt-6 border-t border-foreground/25 pt-3 font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50">
          Logs are public by default.{" "}
          <a href="/privacy" className="text-accent hover:underline">
            Privacy
          </a>
        </p>
      </section>
    </main>
  );
}
