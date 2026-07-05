import type { CapacitorConfig } from "@capacitor/cli";

// iOS shell for Everything Counts. The webview loads the live product (the
// Next.js app is server-rendered, so the app points at production rather than
// bundling a static export). The share extension and URL scheme are the native
// surface area; AppDelegate routes everythingcounts://log?url=... into the
// webview as /?logurl=...
const config: CapacitorConfig = {
  appId: "com.everythingcounts.app",
  appName: "Everything Counts",
  webDir: "public",
  server: {
    url: "https://everything-counts.vercel.app",
    allowNavigation: ["everything-counts.vercel.app", "*.supabase.co"],
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#f2c400",
  },
};

export default config;
