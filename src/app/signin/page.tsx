import { redirect } from "next/navigation";
import { getProfileByHandle, getSessionProfile } from "@/lib/data/logs";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// Sign in / sign up. ?ref=<handle> marks an invite: we show who invited them
// and the new account starts by following that person.
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ profile, hasSession }, { ref }] = await Promise.all([
    getSessionProfile(),
    searchParams,
  ]);
  if (profile) redirect("/");
  if (hasSession) redirect("/welcome");

  const inviter = ref ? await getProfileByHandle(ref) : undefined;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      {inviter && (
        <section className="mt-14 border-[3px] border-foreground bg-foreground px-5 py-4">
          <p className="font-structural text-sm font-bold uppercase tracking-[0.08em] text-background">
            <span className="mr-2 inline-block size-2 rounded-full bg-accent align-middle" />
            {inviter.name} invited you to Everything Counts
          </p>
        </section>
      )}

      <section
        className={`${inviter ? "mt-6" : "mt-14"} border-[3px] border-foreground bg-paper p-6 sm:p-8`}
      >
        <AuthForm inviteRef={inviter?.handle} />
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
