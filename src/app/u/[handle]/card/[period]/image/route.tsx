import { getLogsByUser, getProfileByHandle } from "@/lib/data/logs";
import { periodPoster } from "@/lib/og";
import { logsIn, parsePeriod } from "@/lib/period";
import { FALLBACK_ZONE, isTimeZone } from "@/lib/dates";
import { getDeviceTimeZone } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// GET /u/<handle>/card/<period>/image — the poster itself, as a PNG.
// <period> is "2026-10" (a month) or "2026" (a year). Which pieces fall in it
// goes by a time zone: the one the card page asks for (?tz=), else the one
// this device reported, else UTC. A link preview has neither, so it gets
// the same picture every time.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ handle: string; period: string }> },
) {
  const { handle, period: raw } = await params;
  const period = parsePeriod(raw);
  const person = period ? await getProfileByHandle(handle) : undefined;
  if (!period || !person) return new Response("Not found", { status: 404 });

  const asked = new URL(request.url).searchParams.get("tz");
  const timeZone = isTimeZone(asked)
    ? asked
    : ((await getDeviceTimeZone()) ?? FALLBACK_ZONE);
  const logs = logsIn(await getLogsByUser(person.id), period, timeZone);
  return await periodPoster({
    handle: person.handle,
    kind: period.kind,
    title: period.title,
    yearLabel: period.yearLabel,
    logs,
  });
}
