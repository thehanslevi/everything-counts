import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// Password-reset landing. The email link arrives with ?code=; exchange it for
// a session server-side, then let the user set a new password.
export default async function Reset({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;

  let ready = false;
  let message = "This reset link is invalid or has expired.";

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) ready = true;
    else message = error.message;
  } else {
    // Arriving without a code but with a live session (e.g. refresh after
    // exchange) still allows setting a password.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) ready = true;
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
          Reset password
        </h2>
        <div className="p-5 sm:p-6">
          {ready ? (
            <ResetPasswordForm />
          ) : (
            <p className="font-serif text-[15px] leading-[1.6] text-foreground/75">
              {message}{" "}
              <Link href="/signin" className="text-accent underline">
                Request a new one.
              </Link>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
