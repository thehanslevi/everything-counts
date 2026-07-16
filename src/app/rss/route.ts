import { getRecentActivity } from "@/lib/data/logs";
import { rssFeed } from "@/lib/rss";

export const dynamic = "force-dynamic";

// The whole network's recent logging as one feed.
export async function GET() {
  const recent = await getRecentActivity(30);
  return rssFeed({
    title: "Everything Counts",
    description: "Recently logged across the network.",
    path: "/",
    items: recent.map(({ log, user }) => ({ log, by: `@${user.handle}` })),
  });
}
