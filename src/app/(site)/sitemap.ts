import type { MetadataRoute } from "next";
import { allSchools } from "@/lib/schools";
import { allInfographics } from "@/lib/insights";
import { absoluteUrl } from "@/lib/site";

/**
 * The site had no sitemap, which for a directory is the expensive kind of
 * omission: a crawler finding school pages only by following links has to walk
 * paginated results to reach the long tail, and mostly does not bother. Listing
 * them explicitly is how the other 7,000 get discovered.
 *
 * `lastModified` is deliberately absent on school entries. The records carry no
 * edit timestamp, and stamping the build date would tell crawlers all 7,375
 * pages changed on every deploy — which trains them to ignore the signal.
 *
 * `/compare` and `/shortlist` are left out for the same reason robots.txt
 * disallows them: they render per-visitor state, not content.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/schools"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/career-education"), changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/for-schools"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/insights"), changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/insights/infographics"), changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/insights/reports"), changeFrequency: "monthly", priority: 0.5 },
  ];

  const schools: MetadataRoute.Sitemap = allSchools().map((school) => ({
    url: absoluteUrl(`/schools/${school.slug}`),
    changeFrequency: "monthly",
    // Richer profiles are the ones worth crawling first.
    priority: school.images.gallery.length > 0 ? 0.7 : 0.5,
  }));

  const infographics: MetadataRoute.Sitemap = allInfographics().map((item) => ({
    url: absoluteUrl(`/insights/infographics#${item.slug}`),
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...staticPages, ...schools, ...infographics];
}
