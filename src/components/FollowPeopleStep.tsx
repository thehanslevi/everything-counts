import Link from "next/link";
import { getFolloweeIds, getProfiles, getSessionProfile } from "@/lib/data/logs";
import { Avatar } from "@/components/Avatar";
import { FollowButton } from "@/components/FollowButton";

// Shown once, right after signup: everyone already here, one tap each. A feed
// with nobody in it is the fastest way to lose a new account, and at this size
// the whole network fits on the screen.
export async function FollowPeopleStep() {
  const { profile } = await getSessionProfile();
  if (!profile) return null;

  const [everyone, following] = await Promise.all([
    getProfiles(),
    getFolloweeIds(profile.id),
  ]);
  const others = everyone.filter(
    (p) => p.id !== profile.id && !following.has(p.id),
  );
  if (others.length === 0) return null;

  return (
    <section className="mt-6 border-[3px] border-foreground bg-paper">
      <h2 className="border-b-[3px] border-foreground bg-accent-3 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
        Follow along
      </h2>
      <div className="p-5 sm:p-6">
        <p className="font-serif text-[14px] leading-[1.55] text-foreground/75">
          Their reading shows up in your feed.
        </p>
        <ol className="mt-4 flex flex-col gap-3">
          {others.slice(0, 8).map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 border-2 border-foreground px-3 py-2"
            >
              <Link
                href={`/u/${p.handle}`}
                className="flex min-w-0 items-center gap-3"
              >
                <Avatar profile={p} className="size-9" />
                <span className="min-w-0">
                  <span className="block truncate font-structural text-sm font-bold uppercase tracking-[0.04em] text-foreground">
                    {p.name}
                    <span className="ml-2 font-normal normal-case tracking-normal text-foreground/50">
                      @{p.handle}
                    </span>
                  </span>
                  {p.bio && (
                    <span className="block truncate font-serif text-[13px] normal-case text-foreground/60">
                      {p.bio}
                    </span>
                  )}
                </span>
              </Link>
              <FollowButton followeeId={p.id} following={false} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
