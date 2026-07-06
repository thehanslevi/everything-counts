import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Support — Everything Counts",
};

// Support page (required for the App Store listing).
export default function Support() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
          Support
        </h2>
        <div className="flex flex-col gap-6 p-6 font-serif text-[15px] leading-[1.65] text-foreground/85 sm:p-8">
          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Getting started
            </h3>
            <p className="mt-2">
              Create an account, claim a handle, and log a piece by pasting its
              link. On iPhone you can also log straight from Safari: tap Share,
              then “Log to Everything Counts.” Your logs form your record, and
              the people you follow appear in your feed.
            </p>
          </div>
          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Fixing or removing a log
            </h3>
            <p className="mt-2">
              Every log on your own record has an “Edit” link — change the
              title, form, take, or rating, or delete it. You can delete your
              whole account from your profile page at any time.
            </p>
          </div>
          <div>
            <h3 className="font-structural text-sm font-bold uppercase tracking-[0.12em] text-foreground">
              Contact
            </h3>
            <p className="mt-2">
              Questions, bugs, or ideas: reach Hannah Levinson at{" "}
              <a href="https://hrlevinson.com" className="text-accent hover:underline">
                hrlevinson.com
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
