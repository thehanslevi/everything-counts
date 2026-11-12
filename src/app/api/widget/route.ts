import { NextResponse } from "next/server";
import { getWidgetData } from "@/lib/data/logs";
import { FALLBACK_ZONE, isTimeZone } from "@/lib/dates";

// GET /api/widget?handle=<handle>&tz=<IANA zone>
// What the iPhone app's home screen widget draws: the reader's count for
// their current month and the newest piece from someone they follow. Only
// public data (anyone can see both on the profile), so no sign-in; the
// widget runs outside the app and has no session to send.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const handle = (params.get("handle") ?? "").trim().toLowerCase();
  const tz = params.get("tz") ?? "";
  if (!/^[a-z0-9_]{2,24}$/.test(handle)) {
    return NextResponse.json({ error: "Unknown handle." }, { status: 404 });
  }
  const timeZone = isTimeZone(tz) ? tz : FALLBACK_ZONE;

  try {
    const data = await getWidgetData(handle, timeZone);
    if (!data) {
      return NextResponse.json({ error: "Unknown handle." }, { status: 404 });
    }
    // Never cached: the app asks the widget to refetch right after a save,
    // and a cached answer would show the count from before it.
    return NextResponse.json(data, {
      headers: { "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Try again." }, { status: 500 });
  }
}
