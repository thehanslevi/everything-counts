import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The poster renderer (src/lib/og.tsx) reads its two font files at request
  // time. Name them so they ship inside the card routes' functions instead
  // of relying on the tracer to infer it.
  outputFileTracingIncludes: {
    "/u/**": ["./assets/fonts/*.woff"],
  },
};

export default nextConfig;
