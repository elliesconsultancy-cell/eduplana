import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

/**
 * School photography and the research archive are served from Cloudflare R2
 * (see `src/lib/assets.ts`), so next/image needs to be told that host is
 * trusted. The pattern is derived from the same environment variable the URLs
 * are built from, which keeps the two from drifting apart.
 */
function remoteImageHosts(): NonNullable<NextConfig["images"]>["remotePatterns"] {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    // Cloudflare's development subdomain, used until a custom domain is set up.
    { protocol: "https", hostname: "*.r2.dev" },
  ];

  const base = process.env.NEXT_PUBLIC_ASSET_BASE_URL;
  if (base) {
    try {
      patterns.push({ protocol: "https", hostname: new URL(base).hostname });
    } catch {
      // A malformed value should not take the build down; the r2.dev pattern
      // above still covers the default setup.
    }
  }
  return patterns;
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: remoteImageHosts(),
  },
};

// withPayload injects the admin panel's webpack/turbopack needs and its
// server-side externals. It must wrap the final config object.
export default withPayload(nextConfig);
