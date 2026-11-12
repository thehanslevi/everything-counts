import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { suggestFromRecord } from "@/lib/data/logs";
import { suggestElsewhere } from "@/lib/suggest";
import { cleanQuery } from "@/lib/suggest-core";

// GET /api/suggest?q=<what was typed>&scope=record|elsewhere
// Title suggestions for the log form. "record" is pieces people here have
// logged (fast, from our own database); "elsewhere" asks outside catalogs
// (slower; the form shows the record first and adds these when they come).
// Signed-in only: the form is, and the outside catalogs shouldn't be
// reachable through us by anyone who finds the address.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = cleanQuery(params.get("q"));
  const scope = params.get("scope") === "elsewhere" ? "elsewhere" : "record";
  if (!q) return NextResponse.json({ items: [] });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  try {
    const items =
      scope === "elsewhere" ? await suggestElsewhere(q) : await suggestFromRecord(q);
    return NextResponse.json(
      { items },
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ items: [] });
  }
}
