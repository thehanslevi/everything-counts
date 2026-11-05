import { getLogsByUser, getProfileByHandle } from "@/lib/data/logs";
import { periodPoster } from "@/lib/og";
import { logsIn, parsePeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

// GET /u/<handle>/card/<period>/image — the poster itself, as a PNG.
// <period> is "2026-10" (a month) or "2026" (a year).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ handle: string; period: string }> },
) {
  const { handle, period: raw } = await params;
  const period = parsePeriod(raw);
  const person = period ? await getProfileByHandle(handle) : undefined;
  if (!period || !person) return new Response("Not found", { status: 404 });

  const logs = logsIn(await getLogsByUser(person.id), period);
  return await periodPoster({
    handle: person.handle,
    kind: period.kind,
    title: period.title,
    yearLabel: period.yearLabel,
    logs,
  });
}
