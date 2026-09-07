import "server-only";

import { cache } from "react";
import primary from "@/data/schools.primary.json";
import secondary from "@/data/schools.secondary.json";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { SCHOOLS_TAG } from "./cache-tags";
import { careerProfile } from "./career";
import type { Facet, FeeItem, GalleryImage, School, SearchFilters, SortKey } from "./types";

/**
 * The data layer.
 *
 * Records live in Postgres and are edited in the admin. Everything above this
 * file calls `search()`, `getSchool()`, `facetsFor()` and friends, so the
 * surface is unchanged from when these records were flat JSON — only the
 * bodies below read from the database instead of an import.
 *
 * Two layers of caching, doing different jobs:
 *
 *   unstable_cache  spares the database. One read of all published records is
 *                   shared across every visitor until an edit invalidates it,
 *                   so Neon sees a handful of queries a day rather than one
 *                   per page view.
 *
 *   react cache     spares the CPU. The slug index and the search haystack are
 *                   Maps, which cannot be serialised into the data cache, so
 *                   they are rebuilt once per request and reused within it.
 *
 * An edit in the admin invalidates the tag (see the schools collection's
 * afterChange hook) and the next request rebuilds — no redeploy.
 */

/** Re-exported for callers that already import from here. */
export { SCHOOLS_TAG };

/**
 * Payload returns array rows with an extra `id`, and `_status` alongside the
 * document. Narrowing here rather than casting keeps the domain type honest
 * about what the rest of the app is allowed to assume.
 */
type SchoolDoc = Record<string, unknown>;

function toSchool(doc: SchoolDoc): School {
  const images = (doc.images ?? {}) as { logo?: string | null; gallery?: unknown[] };
  const fee = (doc.fee ?? {}) as { label?: string | null; min?: number | null; max?: number | null };
  const list = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

  return {
    id: String(doc.id),
    slug: String(doc.slug),
    name: String(doc.name),
    level: doc.level as School["level"],
    tagline: (doc.tagline as string | null) ?? null,
    summary: (doc.summary as string | null) ?? null,
    state: (doc.state as string | null) ?? null,
    area: (doc.area as string | null) ?? null,
    address: (doc.address as string | null) ?? null,
    busStop: (doc.busStop as string | null) ?? null,
    phone: (doc.phone as string | null) ?? null,
    admissionsOfficer: (doc.admissionsOfficer as string | null) ?? null,
    admissionsRole: (doc.admissionsRole as string | null) ?? null,
    website: (doc.website as string | null) ?? null,
    yearFounded: (doc.yearFounded as number | null) ?? null,
    curricula: list(doc.curricula),
    scope: (doc.scope as string | null) ?? null,
    fee: { label: fee.label ?? null, min: fee.min ?? null, max: fee.max ?? null },
    feeItems: (Array.isArray(doc.feeItems) ? doc.feeItems : []).map((row) => {
      const r = row as { label?: string; amount?: number };
      return { label: String(r.label ?? ""), amount: Number(r.amount ?? 0) } satisfies FeeItem;
    }),
    admissionForm: (doc.admissionForm as string | null) ?? null,
    day: Boolean(doc.day),
    boarding: Boolean(doc.boarding),
    faith: (doc.faith as string) ?? "Secular",
    maxClassSize: (doc.maxClassSize as number | null) ?? null,
    scholarship: (doc.scholarship as string | null) ?? null,
    siblingsDiscount: (doc.siblingsDiscount as string | null) ?? null,
    facilities: list(doc.facilities),
    activities: list(doc.activities),
    clubs: list(doc.clubs),
    images: {
      logo: images.logo ?? null,
      gallery: (images.gallery ?? []).map((row) => {
        const g = row as { full?: string; thumb?: string };
        return { full: String(g.full ?? ""), thumb: String(g.thumb ?? "") } satisfies GalleryImage;
      }),
    },
    verified: Boolean(doc.verified),
  };
}

/**
 * Every published record, in one query.
 *
 * `pagination: false` rather than a large `limit`: a limit that quietly sat
 * below the row count would drop schools off the site with nothing to show for
 * it. `depth: 0` because nothing here is a relationship — gallery rows and fee
 * lines are array fields and come back regardless.
 */
async function fetchPublished(): Promise<School[]> {
  try {
    const payload = await getPayload({ config });
    const { docs } = await payload.find({
      collection: "schools",
      where: { _status: { equals: "published" } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    return docs.map((doc) => toSchool(doc as unknown as SchoolDoc));
  } catch (error) {
    /*
     * The site does not go dark because the database is unavailable.
     *
     * The JSON files were kept as the migration's rollback; this makes them a
     * live fallback as well. Visitors get the last committed snapshot — stale
     * by whatever has been edited since, which is a far better failure than
     * every school page returning 500. The admin still needs the database and
     * will still fail, which is correct: an editor should know.
     */
    console.error("[schools] database unavailable, serving the committed snapshot", error);
    return [
      ...(primary as unknown as School[]),
      ...(secondary as unknown as School[]),
    ];
  }
}

/**
 * A token that changes exactly when the data does.
 *
 * The obvious approach — wrapping the whole dataset in `unstable_cache` — does
 * not work: entries are capped at 2 MB and the dataset is 9.5 MB, so every
 * write was silently rejected and every render fell through to Postgres. Even
 * a trimmed projection is 6.3 MB, so there is no version of that idea that fits.
 *
 * What does fit is a token. The cached value is a random string, so it is a few
 * bytes; when the admin invalidates the tag the entry is dropped and the next
 * read mints a different one. Comparing it against the token held alongside the
 * in-process copy below tells us whether that copy is stale, without asking the
 * database anything.
 *
 * `revalidate` is a safety net rather than the mechanism: if an invalidation is
 * ever missed, the site heals itself within five minutes instead of serving a
 * stale directory until the next deploy.
 */
const readVersion = unstable_cache(
  async () => crypto.randomUUID(),
  ["schools:version"],
  /*
   * Invalidated by tag only — deliberately no `revalidate`.
   *
   * A five-minute refresh looked like a cheap safety net and was not: it
   * re-read all 7,375 records, 9.5 MB, every five minutes in every running
   * instance. That is 2.7 GB a day per instance against a 5 GB monthly
   * allowance, and it exhausted the quota in about two days, taking the whole
   * site down with it.
   *
   * The tag is invalidated by the schools collection's afterChange hook, which
   * runs on every save, so the cache is refreshed exactly when the data
   * changes and at no other time. If an invalidation is ever missed, saving
   * any record clears it.
   */
  { tags: [SCHOOLS_TAG] },
);

interface Dataset {
  all: School[];
  bySlug: Map<string, School>;
  haystack: Map<string, string>;
}

function index(all: School[]): Dataset {
  return {
    all,
    bySlug: new Map(all.map((s) => [s.slug, s])),
    haystack: new Map(
      all.map((s) => [
        s.id,
        [s.name, s.area, s.state, s.address, s.tagline, ...s.curricula]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      ]),
    ),
  };
}

/**
 * The dataset and the token it was built from, held for the life of the
 * process. Serverless instances are reused between requests, so in practice
 * this is read far more often than it is filled.
 */
let held: { version: string; data: Dataset } | null = null;
let inFlight: Promise<Dataset> | null = null;

/**
 * Deduplicated per request by React's cache, and shared across requests by the
 * token check. A burst of concurrent requests on a cold instance waits on one
 * query rather than starting several.
 */
const dataset = cache(async (): Promise<Dataset> => {
  const version = await readVersion();
  if (held && held.version === version) return held.data;
  if (!inFlight) {
    inFlight = fetchPublished()
      .then((all) => {
        const data = index(all);
        held = { version, data };
        return data;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
});

export async function allSchools(): Promise<School[]> {
  return (await dataset()).all;
}

export async function getSchool(slug: string): Promise<School | undefined> {
  return (await dataset()).bySlug.get(slug);
}

export async function getSchools(slugs: string[]): Promise<School[]> {
  const { bySlug } = await dataset();
  return slugs.map((s) => bySlug.get(s)).filter((s): s is School => Boolean(s));
}

export async function totalCount(): Promise<number> {
  return (await dataset()).all.length;
}

interface Query {
  tokens: string[];
  /** Match only at the start of a word, not anywhere inside one. */
  prefixOnly: boolean;
}

function parseQuery(query: string): Query {
  const parts = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  // Single characters are noise inside a longer query ("st mary's a"), but a
  // query made only of them still has to filter something — with no tokens at
  // all every school scores 0 and the whole directory comes back under a
  // heading claiming to match. Matched as a prefix, "a" does what a parent
  // expects: schools whose name or town begins with that letter.
  const useful = parts.filter((t) => t.length > 1);
  return useful.length > 0
    ? { tokens: useful, prefixOnly: false }
    : { tokens: parts, prefixOnly: true };
}

/** True when `token` begins a word inside `text`. */
function startsWord(text: string, token: string): boolean {
  let at = text.indexOf(token);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(text[at - 1])) return true;
    at = text.indexOf(token, at + 1);
  }
  return false;
}

/**
 * Score a school against the free-text query.
 *
 * Weighted so a name match outranks an incidental mention in the address —
 * searching "Lekki" should surface schools *in* Lekki above one whose name
 * merely contains the word.
 */
function score(school: School, query: Query, haystacks: Map<string, string>): number {
  const { tokens, prefixOnly } = query;
  if (tokens.length === 0) return 0;
  const name = school.name.toLowerCase();
  const place = `${school.area ?? ""} ${school.state ?? ""}`.toLowerCase();
  const haystack = haystacks.get(school.id) ?? "";
  const has = prefixOnly
    ? (text: string, token: string) => startsWord(text, token)
    : (text: string, token: string) => text.includes(token);
  // A one-letter query searched across the address as well would still match
  // most of the directory ("Avenue", "Ajah"). Narrowing it to the name and the
  // town is what makes it a usable filter rather than a near-no-op.
  const required = prefixOnly ? `${name} ${place}` : haystack;

  let total = 0;
  for (const token of tokens) {
    if (name.startsWith(token)) total += 10;
    else if (has(name, token)) total += 6;
    if (has(place, token)) total += 4;
    if (has(required, token)) total += 1;
    else return -1; // every token must appear somewhere
  }
  return total;
}

export async function search(filters: SearchFilters): Promise<School[]> {
  const { all, haystack } = await dataset();
  const query = parseQuery(filters.q ?? "");
  const scored: Array<{ school: School; score: number }> = [];

  for (const school of all) {
    if (filters.level && school.level !== filters.level) continue;
    if (filters.state && school.state !== filters.state) continue;
    if (filters.area && school.area !== filters.area) continue;
    if (filters.faith && school.faith !== filters.faith) continue;
    if (filters.hasPhotos && school.images.gallery.length === 0) continue;
    if (filters.careerReady && careerProfile(school).tier !== "strong") continue;

    if (filters.curriculum && !school.curricula.includes(filters.curriculum)) continue;

    if (filters.boarding === "boarding" && !school.boarding) continue;
    if (filters.boarding === "day" && !school.day) continue;
    if (filters.boarding === "both" && !(school.day && school.boarding)) continue;

    if (filters.facility) {
      const wanted = filters.facility.toLowerCase();
      const has = [...school.facilities, ...school.activities, ...school.clubs].some((f) =>
        f.toLowerCase().includes(wanted),
      );
      if (!has) continue;
    }

    // A school with no fee data is kept unless the user set a budget — the
    // blueprint is explicit that missing data must not read as a negative.
    if (filters.feeMax != null) {
      if (school.fee.min == null) continue;
      // An open-ended band ("₦1,000,000+") means "this much AND ABOVE", so it
      // does not belong under a budget equal to its floor. A closed band does:
      // ₦50,000–₦150,000 is a legitimate answer to "under ₦150,000".
      const openEnded = school.fee.max == null;
      if (openEnded ? school.fee.min >= filters.feeMax : school.fee.min > filters.feeMax) {
        continue;
      }
    }
    if (filters.feeMin != null) {
      const ceiling = school.fee.max ?? school.fee.min;
      if (ceiling == null || ceiling < filters.feeMin) continue;
    }

    const relevance = score(school, query, haystack);
    if (relevance < 0) continue;
    scored.push({ school, score: relevance });
  }

  return sortResults(scored, filters.sort ?? (query.tokens.length ? "relevance" : "photos"));
}

function sortResults(
  scored: Array<{ school: School; score: number }>,
  sort: SortKey,
): School[] {
  const fee = (s: School) => s.fee.min ?? Number.MAX_SAFE_INTEGER;

  switch (sort) {
    case "fee-asc":
      scored.sort((a, b) => fee(a.school) - fee(b.school) || a.school.name.localeCompare(b.school.name));
      break;
    case "fee-desc":
      scored.sort((a, b) => fee(b.school) - fee(a.school) || a.school.name.localeCompare(b.school.name));
      break;
    case "name":
      scored.sort((a, b) => a.school.name.localeCompare(b.school.name));
      break;
    case "career":
      // Most career signals first, then the usual profile-depth tiebreak.
      scored.sort(
        (a, b) =>
          careerProfile(b.school).count - careerProfile(a.school).count ||
          profileDepth(b.school) - profileDepth(a.school) ||
          a.school.name.localeCompare(b.school.name),
      );
      break;
    case "photos":
      // Default browse order: richer profiles first, so an empty query still
      // lands on something worth looking at.
      scored.sort(
        (a, b) =>
          b.school.images.gallery.length - a.school.images.gallery.length ||
          profileDepth(b.school) - profileDepth(a.school) ||
          a.school.name.localeCompare(b.school.name),
      );
      break;
    default:
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          b.school.images.gallery.length - a.school.images.gallery.length ||
          a.school.name.localeCompare(b.school.name),
      );
  }
  return scored.map((s) => s.school);
}

/** How much a profile actually tells you — used to break ties sensibly. */
export function profileDepth(school: School): number {
  return (
    school.facilities.length +
    school.activities.length +
    school.clubs.length +
    (school.website ? 3 : 0) +
    (school.yearFounded ? 2 : 0) +
    (school.maxClassSize ? 2 : 0) +
    (school.summary ? 1 : 0)
  );
}

function tally(values: Iterable<string | null | undefined>): Facet[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

/** Facets computed over the *current* result set, so counts never mislead. */
export function facetsFor(results: School[]) {
  return {
    states: tally(results.map((s) => s.state)),
    areas: tally(results.map((s) => s.area)).slice(0, 40),
    curricula: tally(results.flatMap((s) => s.curricula)),
    faiths: tally(results.map((s) => s.faith)),
    facilities: tally(results.flatMap((s) => s.facilities)).slice(0, 24),
    levels: tally(results.map((s) => s.level)),
  };
}

export interface Suggestion {
  slug: string;
  name: string;
  /** "Lekki, Lagos" — what tells two similarly named schools apart. */
  place: string;
  level: string;
  careerReady: boolean;
}

/**
 * Type-ahead for the search box.
 *
 * Ranked so a prefix match on the name wins, then a match anywhere in the
 * name, then the town — typing "lek" should offer Lekki schools, and typing
 * "meadow" should put Meadow Hall first rather than a school on Meadow Road.
 */
export async function suggest(query: string, limit = 8): Promise<Suggestion[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const { all } = await dataset();
  const hits: Array<{ school: School; rank: number }> = [];
  for (const school of all) {
    const name = school.name.toLowerCase();
    const place = `${school.area ?? ""} ${school.state ?? ""}`.toLowerCase();

    let rank = -1;
    if (name.startsWith(q)) rank = 0;
    else if (startsWord(name, q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (startsWord(place, q)) rank = 3;
    if (rank < 0) continue;

    hits.push({ school, rank });
  }

  hits.sort(
    (a, b) =>
      a.rank - b.rank ||
      profileDepth(b.school) - profileDepth(a.school) ||
      a.school.name.localeCompare(b.school.name),
  );

  return hits.slice(0, limit).map(({ school }) => ({
    slug: school.slug,
    name: school.name,
    place: locationOf(school),
    level: school.level === "primary" ? "Primary" : "Secondary",
    careerReady: careerProfile(school).tier === "strong",
  }));
}

function locationOf(school: School): string {
  return [school.area, school.state].filter(Boolean).join(", ");
}

export async function topStates(limit = 8): Promise<Facet[]> {
  const { all } = await dataset();
  return tally(all.map((s) => s.state)).slice(0, limit);
}

export async function topAreas(state: string, limit = 12): Promise<Facet[]> {
  const { all } = await dataset();
  return tally(all.filter((s) => s.state === state).map((s) => s.area)).slice(0, limit);
}

/** Similar schools for the profile page: same area first, then same state. */
export async function relatedSchools(school: School, limit = 4): Promise<School[]> {
  const { all } = await dataset();
  const pool = all.filter((s) => s.id !== school.id);
  const sameArea = pool.filter((s) => s.state === school.state && s.area === school.area);
  const sameState = pool.filter((s) => s.state === school.state && s.area !== school.area);

  const feeGap = (s: School) =>
    school.fee.min != null && s.fee.min != null
      ? Math.abs(s.fee.min - school.fee.min)
      : Number.MAX_SAFE_INTEGER;

  return [...sameArea, ...sameState]
    .sort((a, b) => feeGap(a) - feeGap(b) || profileDepth(b) - profileDepth(a))
    .slice(0, limit);
}

export const FEE_STEPS = [50_000, 150_000, 300_000, 500_000, 750_000, 1_000_000];
