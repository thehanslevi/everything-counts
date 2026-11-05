import { NextResponse } from "next/server";
import { sendWeekly } from "@/lib/weekly";

export const dynamic = "force-dynamic";
// Sending is one request per recipient with a short pause between them.
export const maxDuration = 60;

// GET /api/cron/weekly — hit by Vercel Cron on Sundays (see vercel.json).
//
// If CRON_SECRET is set, Vercel sends it as a bearer token and nothing else
// gets in. Without one, the route only acts on the scheduled day. Either
// way the edge function will not email the same person twice inside six
// days, so the worst a stray request can do is start Sunday's send early.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  } else if (new Date().getUTCDay() !== 0) {
    return NextResponse.json({ error: "not today" }, { status: 403 });
  }

  const result = await sendWeekly({});
  return NextResponse.json(
    result ?? { ok: false, error: "The email function didn't answer." },
  );
}
