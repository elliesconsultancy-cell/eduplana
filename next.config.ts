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

  // Advertising the exact stack in a response header only helps someone
  // choosing which exploits to try.
  poweredByHeader: false,

  async redirects() {
    return [
      // Password resets are handled by a super-admin from the Users screen,
      // and no email adapter is configured, so this page could only ever
      // promise a message that never arrives. The link is hidden in
      // custom.css; this closes the route to anyone typing it in.
      { source: "/admin/forgot", destination: "/admin/login", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stop the browser second-guessing declared content types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Leak the origin but never the full path to third-party sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // No reason for any page here to be framed by another site.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // The admin holds the write surface, so it is worth being stricter:
        // never framed, and never cached by an intermediary.
        source: "/admin/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

// withPayload injects the admin panel's webpack/turbopack needs and its
// server-side externals. It must wrap the final config object.
export default withPayload(nextConfig);
