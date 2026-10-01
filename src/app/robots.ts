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
 *
 * `/schools?` is every search, filter and page number of the listing. Those
 * pages cannot be cached — each combination is rendered fresh — and crawlers
 * following the state, level and pagination links were generating thousands of
 * them, which is what used up the hosting plan's processing allowance. They
 * already declare `/schools` as their canonical, so none of them was meant to
 * rank. The bare `/schools` and every `/schools/<slug>` profile stay open: the
 * rule matches the question mark, not the path.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/payload-api/",
        "/api/",
        "/schools?",
        "/compare",
        "/shortlist",
        "/manage",
        "/unsubscribe",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/").replace(/\/$/, ""),
  };
}
