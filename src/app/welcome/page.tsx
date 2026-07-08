import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { WelcomeForm } from "@/components/WelcomeForm";

export const dynamic = "force-dynamic";

// Post-signup onboarding: a signed-in user without a profile picks a handle.
export default async function Welcome() {
  const { profile, hasSession } = await getSessionProfile();
  if (!hasSession) redirect("/signin");
  if (profile) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader variant="minimal" />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-accent-2 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
          Create your profile
        </h2>
        <div className="p-5 sm:p-6">
          <WelcomeForm />
          <p className="mt-6 border-t border-foreground/25 pt-3 font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50">
            You&apos;ll start by following the people who brought you here —
            unfollow anytime.
          </p>
        </div>
      </section>
    </main>
  );
}
