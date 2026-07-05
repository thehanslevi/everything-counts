import { toggleFollow } from "@/app/actions";

// Follow / unfollow, as a server-action form. Rendered only for signed-in
// viewers looking at someone else's profile or the People page.
export function FollowButton({
  followeeId,
  following,
}: {
  followeeId: string;
  following: boolean;
}) {
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="followeeId" value={followeeId} />
      <input type="hidden" name="following" value={String(following)} />
      <button
        type="submit"
        className={
          following
            ? "border-2 border-foreground px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-foreground transition-colors hover:border-accent hover:text-accent"
            : "bg-accent px-4 py-1.5 font-structural text-xs font-bold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
        }
      >
        {following ? "Following" : "Follow"}
      </button>
    </form>
  );
}
