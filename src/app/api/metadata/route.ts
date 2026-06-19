import { NextResponse } from "next/server";
import { fetchLinkMetadata } from "@/lib/metadata";

// GET /api/metadata?url=<encoded url>
// Fetches OpenGraph metadata for a pasted URL so the logging form can pre-fill
// title, author, source, and lead image. Runs on the server because browsers
// cannot fetch other sites' HTML directly.
export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "Provide a url query parameter." },
      { status: 400 },
    );
  }

  try {
    const metadata = await fetchLinkMetadata(url);
    return NextResponse.json(metadata);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not read that page.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
