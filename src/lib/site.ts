/**
 * Who and where the site is, in one place.
 *
 * The canonical host matters more than it looks. The apex redirects to `www`,
 * so every canonical URL, Open Graph tag and sitemap entry has to agree on
 * `www.eduplana.org` — otherwise search engines see two addresses for the same
 * page and split the ranking between them.
 *
 * Note what is *not* in the fallback chain: `VERCEL_PROJECT_PRODUCTION_URL`.
 * On Vercel that resolves to the eduplana.vercel.app deployment name, which is
 * how the live site ended up declaring the wrong domain to crawlers.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.eduplana.org").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "Eduplana";

export const SITE_DESCRIPTION =
  "Find and compare private schools across Nigeria — 7,375 primary and secondary listings, side by side on fees, curriculum, class sizes and facilities.";

/**
 * Profiles Google can use to tie the site, the organisation and the social
 * accounts together as one entity. Only accounts confirmed to be ours belong
 * here — an unverified guess links the brand to something we do not control.
 */
export const SITE_PROFILES = ["https://www.instagram.com/eduplanafound/"];

export const FOUNDERS = [{ name: "Babatunde Adegbite", jobTitle: "Co-founder" }];

/** Absolute URL for a site-relative path, with no double slashes. */
export const absoluteUrl = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
