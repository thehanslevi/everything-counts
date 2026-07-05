import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfiles, getSessionProfile } from "@/lib/data/logs";
import { FollowButton } from "@/components/FollowButton";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// People: everyone on the network, with follow buttons for signed-in viewers.
// The feed is only as good as who you follow, so this is the discovery seam.
export default async function People() {
  const [{ profile }, profiles] = await Promise.all([
    getSessionProfile(),
    getProfiles(),
  ]);

  // One query for the viewer's whole follow set beats N per-row checks.
  let followingIds = new Set<string>();
  if (profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("follows")
      .select("followee_id")
      .eq("follower_id", profile.id);
    followingIds = new Set((data ?? []).map((f) => f.followee_id));
  }

  const others = profiles.filter((p) => p.id !== profile?.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader active="people" />

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            People
          </h2>
          <span className="bg-accent-2 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
            On the network
          </span>
        </div>

        {others.length === 0 ? (
          <p className="mt-8 font-serif text-[15px] leading-[1.6] text-foreground/75">
            No one else here yet. Send someone the link — the feed gets good
            when the right people are in it.
          </p>
        ) : (
          <ol className="mt-8 flex flex-col gap-4">
            {others.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 border-[3px] border-foreground bg-paper px-4 py-3"
              >
                <Link href={`/u/${p.handle}`} className="min-w-0">
                  <span className="block truncate font-structural text-sm font-bold uppercase tracking-[0.04em] text-foreground hover:underline">
                    {p.name}
                    <span className="ml-2 font-normal normal-case tracking-normal text-foreground/50">
                      @{p.handle}
                    </span>
                  </span>
                  {p.role && (
                    <span className="block truncate font-structural text-[0.65rem] font-medium uppercase tracking-[0.12em] text-foreground/50">
                      {p.role}
                    </span>
                  )}
                </Link>
                {profile && (
                  <FollowButton
                    followeeId={p.id}
                    following={followingIds.has(p.id)}
                  />
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
