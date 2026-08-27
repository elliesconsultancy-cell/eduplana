import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Lives at the app root, not in the `(site)` route group beside sitemap.ts.
 * That asymmetry is not a preference: `sitemap.ts` is picked up from inside a
 * route group, `robots.ts` is silently ignored there — it simply never appears
 * in the build manifest and the URL 404s. Moving it back will break it without
 * any error to explain why.
 *
 * There was no robots.txt at all, so crawlers had no pointer to the sitemap
 * and nothing telling them to leave the admin alone.
 *
 * The disallowed paths are not secrets — `/admin` is protected by auth — but a
 * crawler spending its budget on a login form is budget not spent on the 7,375
 * school pages that should be indexed. `/compare` and `/shortlist` are
 * per-visitor state with nothing stable to rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/payload-api/", "/compare", "/shortlist"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
