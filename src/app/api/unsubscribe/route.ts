import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/data/logs";

export const dynamic = "force-dynamic";

// POST /api/unsubscribe?t=<token> — the one-tap unsubscribe mail clients
// call from their own "Unsubscribe" button (the List-Unsubscribe-Post
// header). Always answers 200: whether a token was real is nobody's
// business but its owner's.
export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  await unsubscribeByToken(token);
  return NextResponse.json({ ok: true });
}

// A person following the link lands on the page, which asks first: mail
// scanners open links, and nobody should be unsubscribed by a robot.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("t") ?? "";
  return NextResponse.redirect(
    new URL(`/unsubscribe?t=${encodeURIComponent(token)}`, request.url),
  );
}
