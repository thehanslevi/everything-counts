import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const SITE = "https://everything-counts.vercel.app";

// Regenerated per request so new profiles and work pages appear as they're
// created. Lists the public surfaces: the landing, people, and every profile
// and logged work.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: logs }] = await Promise.all([
    supabase.from("profiles").select("handle").limit(1000),
    supabase
      .from("logs")
      .select("work_id, created_at")
      .eq("shared", true)
      .order("created_at", { ascending: false })
      .limit(2000),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/people",
    "/signin",
    "/privacy",
    "/support",
  ].map((path) => ({ url: `${SITE}${path}`, changeFrequency: "daily" }));

  const profileRoutes: MetadataRoute.Sitemap = (profiles ?? []).map((p) => ({
    url: `${SITE}/u/${p.handle}`,
    changeFrequency: "daily",
  }));

  // One entry per distinct work, dated by its most recent log.
  const works = new Map<string, string>();
  for (const l of logs ?? []) {
    if (!works.has(l.work_id)) works.set(l.work_id, l.created_at);
  }
  const workRoutes: MetadataRoute.Sitemap = [...works].map(([id, date]) => ({
    url: `${SITE}/work/${id}`,
    lastModified: new Date(date),
  }));

  return [...staticRoutes, ...profileRoutes, ...workRoutes];
}
