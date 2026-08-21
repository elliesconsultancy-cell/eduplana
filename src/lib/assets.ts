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
