import { NextResponse } from "next/server";
import { refreshCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
// Fetching every feed takes a while.
export const maxDuration = 60;

// GET /api/cron/catalog — hit by Vercel Cron once a day at 11:00 UTC (see
// vercel.json).
//
// If CRON_SECRET is set, Vercel sends it as a bearer token and nothing else
// gets in. Without one, the route only acts during the scheduled hour. The
// edge function also skips any feed fetched in the last three hours, so a
// stray request inside that hour fetches nothing twice.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (new Date().getUTCHours() !== 11) {
    return NextResponse.json({ error: "not now" }, { status: 403 });
  }

  const result = await refreshCatalog({});
  if (!result || result.ok === false) {
    // A failing status, so the cron log shows the run as failed.
    return NextResponse.json(
      result ?? { ok: false, error: "The catalog function didn't answer." },
      { status: 502 },
    );
  }
  return NextResponse.json(result);
}
