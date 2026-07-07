import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import type { Profile } from "@/lib/data/types";

// A plain list of people (avatar, name, handle, bio) linking to each profile.
// Used by the followers / following pages.
export function ProfileList({
  profiles,
  empty,
}: {
  profiles: Profile[];
  empty: string;
}) {
  if (profiles.length === 0) {
    return (
      <p className="mt-8 font-serif text-[15px] leading-[1.6] text-foreground/75">
        {empty}
      </p>
    );
  }
  return (
    <ol className="mt-8 flex flex-col gap-4">
      {profiles.map((p) => (
        <li key={p.id}>
          <Link
            href={`/u/${p.handle}`}
            className="flex items-center gap-3 border-[3px] border-foreground bg-paper px-4 py-3 transition-transform hover:-translate-y-0.5"
          >
            <Avatar profile={p} className="size-10" />
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
        </li>
      ))}
    </ol>
  );
}
