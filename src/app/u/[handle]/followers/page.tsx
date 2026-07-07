import Link from "next/link";
import { notFound } from "next/navigation";
import { getFollowers, getProfileByHandle } from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { ProfileList } from "@/components/ProfileList";

export const dynamic = "force-dynamic";

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);
  if (!person) notFound();
  const followers = await getFollowers(person.id);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />
      <section className="mt-16">
        <div className="border-b-[3px] border-foreground pb-3">
          <Link
            href={`/u/${person.handle}`}
            className="font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground/50 hover:text-foreground"
          >
            ← {person.name}
          </Link>
          <h2 className="mt-2 font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Followers
          </h2>
        </div>
        <ProfileList
          profiles={followers}
          empty={`No one follows @${person.handle} yet.`}
        />
      </section>
    </main>
  );
}
