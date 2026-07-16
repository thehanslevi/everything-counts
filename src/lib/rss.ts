import type { Log } from "@/lib/data/types";

// RSS 2.0 for reading records. Item links point at the piece itself (that is
// what a feed reader wants to open); the guid points back at our work page.
const SITE = "https://everything-counts.vercel.app";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function rssFeed({
  title,
  description,
  path,
  items,
}: {
  title: string;
  description: string;
  path: string;
  items: { log: Log; by?: string }[];
}): Response {
  const xmlItems = items
    .map(({ log, by }) => {
      const byline = [log.author, log.source].filter(Boolean).join(" · ");
      const parts = [
        by ? `Logged by ${by}.` : null,
        byline || null,
        log.take || null,
      ].filter(Boolean);
      return `    <item>
      <title>${esc(log.title)}</title>
      <link>${esc(log.url ?? `${SITE}/work/${log.workId}`)}</link>
      <guid isPermaLink="true">${esc(`${SITE}/work/${log.workId}`)}</guid>
      <pubDate>${new Date(log.createdAt).toUTCString()}</pubDate>
      <description>${esc(parts.join(" "))}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(`${SITE}${path}`)}</link>
    <description>${esc(description)}</description>
    <language>en-us</language>
${xmlItems}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
