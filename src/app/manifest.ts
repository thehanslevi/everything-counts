import type { MetadataRoute } from "next";

// Web app manifest: makes the site installable, and share_target puts
// "Everything Counts" in the share sheet on Android/ChromeOS — share a page
// from any app (browser, Substack, ...) and land on /log with the URL ready.
// Apps disagree on which field carries the link, so /log accepts url or text.
// (iOS ignores share_target; the native app's share extension covers it.)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Everything Counts",
    short_name: "Everything Counts",
    description: "For reading that goes beyond books.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2c400",
    theme_color: "#f2c400",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    share_target: {
      action: "/log",
      method: "GET",
      params: { url: "url", text: "text", title: "title" },
    },
  };
}
