import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy — Everything Counts",
};

// Plain-language privacy policy. Everything here is true of the actual system;
// keep it that way when the system changes.
export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
          Privacy
        </h2>

        <div className="flex flex-col gap-6 p-6 font-serif text-[15px] leading-[1.65] text-foreground/85 sm:p-8">
          <p className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/50">
            Last updated July 2026
          </p>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              What we collect
            </h3>
            <p className="mt-2">
              Your email address and password, used only to sign you in. Your
              profile: a handle, a display name, an optional bio and link, and
              an optional avatar (or a generated seal if you upload none). Your
              logs: the URL, title, author, source, image, form, optional
              take, optional rating, and timestamp of each piece you log. Who
              you follow.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              What is public
            </h3>
            <p className="mt-2">
              Logs are public by default. Logging a piece is the act of sharing
              it. Your profile, your logs, and who you follow are visible to
              anyone. Your email address is never public.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              What we do not do
            </h3>
            <p className="mt-2">
              No ads. No trackers. No analytics beyond server logs. We do not
              sell, rent, or share your data with anyone. When you paste a
              link, our server fetches that page once to read its title and
              image; the site you pasted never learns who you are.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Where it lives
            </h3>
            <p className="mt-2">
              Data is stored in a Postgres database hosted by Supabase in the
              United States. Authentication cookies keep you signed in; there
              are no third-party cookies.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Deleting your account
            </h3>
            <p className="mt-2">
              You can delete your account at any time from your profile page.
              Deletion is immediate and permanent: your profile, logs, and
              follows are removed from the database, not archived.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Community conduct
            </h3>
            <p className="mt-2">
              There is zero tolerance for objectionable content or abusive
              behavior. You can report any log or person, and block anyone, from
              their profile. Reports are reviewed and acted on, and accounts that
              violate this are removed. By using Everything Counts you agree to
              these terms.
            </p>
          </div>

          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Contact
            </h3>
            <p className="mt-2">
              Everything Counts is built by Hannah Levinson. Questions:
              hrlevinson.com.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
