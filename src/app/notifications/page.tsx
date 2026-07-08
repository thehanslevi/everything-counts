import Link from "next/link";
import { redirect } from "next/navigation";
import {
  getNotifications,
  getSessionProfile,
  markNotificationsRead,
} from "@/lib/data/logs";
import { SiteHeader } from "@/components/SiteHeader";
import { EmptyState } from "@/components/EmptyState";
import { Avatar } from "@/components/Avatar";
import type { AppNotification } from "@/lib/data/types";

export const dynamic = "force-dynamic";

// Relative time, terse: 5m, 3h, 2d, 1w.
function ago(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}w`;
}

// The activity that happened to you: new followers and pieces logged by the
// people you follow. Fed by database triggers off the real actions.
export default async function NotificationsPage() {
  const { profile, hasSession } = await getSessionProfile();
  if (!profile) redirect(hasSession ? "/welcome" : "/signin");

  const items = await getNotifications(profile.id);
  // Clear the unread badge now that they're looking; the fetched rows keep
  // their original read flags so this visit still highlights what's new.
  await markNotificationsRead();

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
      <SiteHeader />

      <section className="mt-16">
        <div className="flex items-end justify-between border-b-[3px] border-foreground pb-3">
          <h2 className="font-structural text-3xl font-black uppercase tracking-[-0.01em] text-foreground">
            Notifications
          </h2>
        </div>

        {items.length === 0 ? (
          <EmptyState title="Nothing yet">
            When someone follows you or logs a piece, it shows up here.
          </EmptyState>
        ) : (
          <ol className="mt-8 flex flex-col gap-3">
            {items.map((n) => (
              <li key={n.id}>
                <NotificationRow n={n} />
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const actorName = n.actor ? `@${n.actor.handle}` : "Someone";
  const isWork = (n.type === "log" || n.type === "coread") && n.workId;
  const href = isWork
    ? `/work/${n.workId}`
    : n.actor
      ? `/u/${n.actor.handle}`
      : "/";

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 border-[3px] border-foreground px-4 py-3 transition-transform hover:-translate-y-0.5 ${
        n.read ? "bg-paper" : "bg-paper shadow-[5px_5px_0_0_var(--accent-3)]"
      }`}
    >
      {n.actor ? (
        <Avatar profile={n.actor} className="size-10" />
      ) : (
        <span className="size-10 shrink-0 border-2 border-foreground bg-foreground/10" />
      )}
      <span className="min-w-0 flex-1 font-serif text-[14px] leading-[1.45] text-foreground/85">
        <span className="font-structural text-sm font-bold uppercase tracking-[0.02em] text-foreground">
          {actorName}
        </span>{" "}
        {n.type === "follow" && "started following you."}
        {n.type === "log" && (
          <>
            logged{" "}
            <span className="font-structural font-bold uppercase tracking-[0.02em] text-foreground">
              {n.logTitle ?? "a piece"}
            </span>
            .
          </>
        )}
        {n.type === "coread" && (
          <>
            also read{" "}
            <span className="font-structural font-bold uppercase tracking-[0.02em] text-foreground">
              {n.logTitle ?? "a piece"}
            </span>
            .
          </>
        )}
      </span>
      <time className="shrink-0 self-start font-structural text-[0.65rem] font-bold uppercase tracking-[0.12em] text-foreground/40">
        {ago(n.createdAt)}
      </time>
    </Link>
  );
}
