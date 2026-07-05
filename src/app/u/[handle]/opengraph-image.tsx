import { getLogsByUser, getProfileByHandle } from "@/lib/data/logs";
import { computeStats, formatEstTime } from "@/lib/data/stats";
import { OG_SIZE, posterCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "A reading record on Everything Counts";

// Per-profile share card: the person, their year so far in the band.
export default async function Image({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const person = await getProfileByHandle(handle);

  if (!person) {
    return posterCard({
      kicker: "Everything Counts",
      title: "A reading record",
      footer: "everything-counts.vercel.app",
    });
  }

  const logs = await getLogsByUser(person.id);
  const stats = computeStats(logs);
  const y = stats.thisYear;
  const footer =
    y.pieces > 0
      ? `${stats.year}: ${y.pieces} ${y.pieces === 1 ? "thing" : "things"} read, ${formatEstTime(y.estMinutes)}`
      : "everything-counts.vercel.app";

  return posterCard({
    kicker: `@${person.handle} · reading record`,
    title: person.name,
    footer,
  });
}
