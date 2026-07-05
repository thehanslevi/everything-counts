import { notFound } from "next/navigation";
import {
  getLogsByUser,
  getProfileByHandle,
  getSessionProfile,
  isFollowing,
} from "@/lib/data/logs";
import { DeleteAccountForm } from "@/components/DeleteAccountForm";
import { FollowButton } from "@/components/FollowButton";
import { LogCard } from "@/components/LogCard";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// A person's public reading record, newest first.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);
  if (!person) notFound();

  const [{ profile: viewer }, logs] = await Promise.all([
    getSessionProfile(),
    getLogsByUser(person.id),
  ]);

  const isSelf = viewer?.id === person.id;
  const following =
    viewer && !isSelf ? await isFollowing(viewer.id, person.id) : false;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 flex items-start justify-between gap-4 border-[3px] border-foreground bg-paper p-6 sm:p-7">
        <div className="min-w-0">
          <h2 className="font-structural text-2xl font-black uppercase tracking-[-0.01em] text-foreground sm:text-3xl">
            {person.name}
          </h2>
          <p className="mt-1 font-structural text-sm text-foreground/50">
            @{person.handle}
          </p>
          {person.role && (
            <p className="mt-2 font-structural text-xs font-medium uppercase tracking-[0.12em] text-foreground/70">
              {person.role}
            </p>
          )}
        </div>
        {viewer && !isSelf && (
          <FollowButton followeeId={person.id} following={following} />
        )}
      </section>

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            {isSelf ? "Your record" : "Record"}
          </h2>
          <span className="bg-accent-3 px-2 py-1 font-structural text-xs font-bold uppercase tracking-[0.18em] text-white">
            Newest first
          </span>
        </div>

        {logs.length === 0 ? (
          <p className="mt-8 font-structural text-sm font-bold uppercase tracking-wide text-foreground">
            Nothing logged yet.
          </p>
        ) : (
          <ol className="mt-10 flex flex-col gap-12">
            {logs.map((log, i) => (
              <li
                key={log.id}
                className={i % 2 === 0 ? "-rotate-[0.6deg]" : "rotate-[0.6deg]"}
              >
                <LogCard log={log} />
              </li>
            ))}
          </ol>
        )}
      </section>

      {isSelf && (
        <section className="mt-20 border-[3px] border-foreground bg-paper">
          <h2 className="border-b-[3px] border-foreground bg-foreground px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-background">
            Account
          </h2>
          <div className="p-5 sm:p-6">
            <DeleteAccountForm handle={person.handle} />
          </div>
        </section>
      )}
    </main>
  );
}
