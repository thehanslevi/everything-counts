import { getWork } from "@/lib/data/logs";
import { OG_SIZE, posterCard, workCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A work on Everything Counts";

// Per-work share card: the piece's lead image, the form, and how many people
// logged it, byline in the band. No title: the app showing the preview
// prints that itself, directly underneath.
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

  return workCard({
    form: work.form,
    loggerCount,
    source: work.source,
    author: work.author,
    image: work.image,
  });
}
