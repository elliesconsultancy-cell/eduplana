/**
 * Where the heavy assets live.
 *
 * School photography and the research archive are ~26,000 files totalling 1.2 GB.
 * They are hosted on Cloudflare R2 rather than committed, because that much
 * binary has no business in git history or in a deployment bundle.
 *
 * The data files keep repo-relative paths ("/schools/x/photo-01.webp"). This
 * prefixes them with the CDN at render time, which means the data never has to
 * know where the bytes are served from, and moving CDN — r2.dev today, a custom
 * domain at launch — is one environment variable rather than a data migration.
 *
 * With `NEXT_PUBLIC_ASSET_BASE_URL` unset, paths are returned untouched and
 * Next serves them from `public/`. That is what keeps local development working
 * for anyone who has the files on disk.
 */
const BASE = (process.env.NEXT_PUBLIC_ASSET_BASE_URL ?? "").replace(/\/+$/, "");

/** Only these trees moved to R2 — `/brand` and `/images` are small and stay put. */
const REMOTE_TREES = ["/schools/", "/insights/"];

export function asset(path: string): string {
  if (!BASE) return path;
  if (/^https?:\/\//.test(path)) return path;
  return REMOTE_TREES.some((tree) => path.startsWith(tree)) ? `${BASE}${path}` : path;
}

/** Nullable variant, for metadata fields that may legitimately have no image. */
export function assetOrUndefined(path: string | null | undefined): string | undefined {
  return path ? asset(path) : undefined;
}

/**
 * True when a path is served from the CDN rather than from `public/`.
 *
 * Callers use this to skip Next's image optimizer. Everything on R2 was already
 * generated at the right size and format when the asset pipeline ran — gallery
 * thumbnails are 480x320 WebP at ~16 KB, logos are 200px at ~2 KB — so the
 * optimizer spends a billed transformation to shave a few kilobytes off an
 * image that is already correct. There are 16,406 such images against an
 * allowance of 5,000 transformations a month, and R2 egress is free, so serving
 * them straight from Cloudflare is both cheaper and one hop shorter.
 *
 * Local assets (`/brand`, `/images`) are deliberately still optimized: there
 * are a couple of dozen, they are full-resolution originals rather than
 * pre-sized derivatives, and the hero photograph genuinely benefits from being
 * resized for a phone.
 */
export function isRemoteAsset(path: string): boolean {
  if (!BASE) return false;
  if (/^https?:\/\//.test(path)) return true;
  return REMOTE_TREES.some((tree) => path.startsWith(tree));
}
