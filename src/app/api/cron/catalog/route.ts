import { NextResponse } from "next/server";
import { refreshCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";
// Fetching every feed takes a while.
export const maxDuration = 60;

// GET /api/cron/catalog — hit by Vercel Cron once a day (see vercel.json).
//
// If CRON_SECRET is set, Vercel sends it as a bearer token and nothing else
// gets in. Without one, anyone can call it, and that's harmless: the edge
// function skips any feed fetched in the last three hours, so a stray
// request costs at most one extra round of fetching a few times a day.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await refreshCatalog({});
  return NextResponse.json(
    result ?? { ok: false, error: "The catalog function didn't answer." },
  );
}
