import { getLogsByUser, getProfileByHandle } from "@/lib/data/logs";
import { rssFeed } from "@/lib/rss";

export const dynamic = "force-dynamic";

// A person's reading record as an RSS feed — subscribe to what they read.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);
  if (!person) return new Response("Not found", { status: 404 });

  const logs = (await getLogsByUser(person.id)).filter((l) => l.shared);
  return rssFeed({
    title: `${person.name} — Everything Counts`,
    description: `What @${person.handle} reads.`,
    path: `/u/${person.handle}`,
    items: logs.slice(0, 50).map((log) => ({ log })),
  });
}
