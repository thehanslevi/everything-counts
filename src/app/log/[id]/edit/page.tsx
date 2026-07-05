import { notFound, redirect } from "next/navigation";
import { getOwnLog, getSessionProfile } from "@/lib/data/logs";
import { EditLogForm } from "@/components/EditLogForm";
import { SiteHeader } from "@/components/SiteHeader";

export const dynamic = "force-dynamic";

// Edit one of your own logs. Anyone else's id 404s (the query is scoped to
// the signed-in user).
export default async function EditLog({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, hasSession } = await getSessionProfile();
  if (!profile) redirect(hasSession ? "/welcome" : "/signin");

  const log = await getOwnLog(id);
  if (!log) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-14 border-[3px] border-foreground bg-paper">
        <h2 className="border-b-[3px] border-foreground bg-accent-2 px-5 py-3 font-structural text-sm font-bold uppercase tracking-[0.2em] text-white">
          Edit log
        </h2>
        <div className="p-5 sm:p-6">
          <EditLogForm log={log} />
        </div>
      </section>
    </main>
  );
}
