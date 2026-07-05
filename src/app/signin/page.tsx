import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/data/logs";
import { AuthForm } from "@/components/AuthForm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

export default async function SignIn() {
  const { profile, hasSession } = await getSessionProfile();
  if (profile) redirect("/");
  if (hasSession) redirect("/welcome");

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 border-[3px] border-foreground bg-paper p-6 sm:p-8">
        <AuthForm />
      </section>
    </main>
  );
}
