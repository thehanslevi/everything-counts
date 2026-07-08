import type { MetadataRoute } from "next";

const SITE = "https://everything-counts.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal / transient routes that shouldn't be indexed.
      disallow: ["/reset", "/welcome", "/notifications"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
