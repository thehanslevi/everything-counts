import { getWork } from "@/lib/data/logs";
import { OG_SIZE, posterCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A work on Everything Counts";

// Per-work share card: form + logger count, the title big, byline in the band.
export default async function Image({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;
  const work = await getWork(workId);

  if (!work) {
    return posterCard({
      kicker: "Everything Counts",
      title: "A piece worth reading",
      footer: "everything-counts.vercel.app",
    });
  }

  const loggerCount = new Set(work.logs.map((l) => l.userId)).size;
  const byline = [work.author, work.source].filter(Boolean).join(" · ");

  return posterCard({
    kicker: `${work.form} · logged by ${loggerCount} ${loggerCount === 1 ? "person" : "people"}`,
    title: work.title,
    footer: byline || "everything-counts.vercel.app",
  });
}
