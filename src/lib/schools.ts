import "server-only";

import { cache } from "react";
import snapshot from "@/data/schools.snapshot.json";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import { SCHOOLS_TAG } from "./cache-tags";
import { careerProfile } from "./career";
import { toSchool, type SchoolDoc } from "./school-record";
import type { Facet, School, SearchFilters, SortKey } from "./types";

/**
 * The data layer.
 *
 * Records live in Postgres and are edited in the admin. Everything above this
 * file calls `search()`, `getSchool()`, `facetsFor()` and friends, so the
 * surface is unchanged from when these records were flat JSON — only the
 * bodies below decide where the records come from.
 *
 * Where they come from is shaped by one number: Neon's free plan allows 5 GB of
 * data out of the database a month, and the whole directory is 9.5 MB. Reading
 * it in full wherever a server instance starts — and instances start all the
 * time, for builds, for traffic, after idling — spent that allowance within a
 * day of the switch to Postgres and locked the database for the rest of the
 * month. So the directory is never read in full at runtime:
 *
 *   snapshot   Every published record, as of `syncedAt`, ships inside the
 *              deployment (scripts/snapshot-schools.mts). Starting an instance
 *              costs the database nothing.
 *
 *   changes    What the admin has saved since then: records updated after
 *              `syncedAt`, plus anything unpublished or deleted. Normally a
 *              handful of rows. Held in the shared data cache and only re-read
 *              when an edit invalidates the tag, so one read serves every
 *              instance until the next save.
 *
 * Refreshing the snapshot after bulk edits keeps the change set small; the
 * script's header says how.
 */

/** Re-exported for callers that already import from here. */
export { SCHOOLS_TAG };

const BASE = (snapshot as unknown as { syncedAt: string; schools: School[] }).schools;

/**
 * Changes are records saved strictly after the snapshot's newest timestamp.
 *
 * Strictly, with no overlap: a bulk write stamps thousands of rows with one
 * timestamp, and a window reaching back over it would refetch all of them on
 * every edit — the cost this arrangement exists to avoid. The snapshot script
 * is run deliberately, not while editors are working, so there is no in-flight
 * save for an overlap to catch.
 */
const SINCE = (snapshot as { syncedAt: string }).syncedAt;

interface Changes {
  /** Minted per read, so an instance can tell its copy is out of date. */
  version: string;
  upserts: School[];
  removals: string[];
}

async function fetchChanges(since: string): Promise<Changes> {
  const payload = await getPayload({ config });

  // Every status, not just published: a record unpublished after the snapshot
  // has to be taken down, and its save is what moved its timestamp.
  const { docs } = await payload.find({
    collection: "schools",
    where: { updatedAt: { greater_than: since } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });

  const upserts: School[] = [];
  const removals: string[] = [];
  for (const doc of docs as unknown as SchoolDoc[]) {
    if (doc._status === "published") upserts.push(toSchool(doc));
    else removals.push(String(doc.id));
  }

  /*
   * A deleted row leaves no timestamp behind, so deletions cannot be found by
   * the query above. A count can: if the database holds a different number of
   * published records than snapshot + changes would, something was deleted (or
   * published without a save, by hand). Only then is the id list fetched — a
   * few hundred KB — to work out which.
   */
  const expected = new Set(BASE.map((s) => s.id));
  for (const s of upserts) expected.add(s.id);
  for (const id of removals) expected.delete(id);

  const { totalDocs } = await payload.count({
    collection: "schools",
    where: { _status: { equals: "published" } },
    overrideAccess: true,
  });

  if (totalDocs !== expected.size) {
    const { docs: live } = await payload.find({
      collection: "schools",
      where: { _status: { equals: "published" } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
      select: { slug: true },
    });
    const liveIds = new Set(live.map((d) => String(d.id)));
    for (const id of expected) if (!liveIds.has(id)) removals.push(id);

    const unknown = [...liveIds].filter((id) => !expected.has(id));
    if (unknown.length > 0) {
      const { docs: extra } = await payload.find({
        collection: "schools",
        where: { id: { in: unknown } },
        pagination: false,
        depth: 0,
        overrideAccess: true,
      });
      for (const doc of extra) upserts.push(toSchool(doc as unknown as SchoolDoc));
    }
  }

  if (upserts.length > 1000) {
    // The data cache refuses entries over 2 MB, and past that every instance
    // reads the change set from Postgres itself — correct, but it is the cost
    // this whole arrangement exists to avoid.
    console.warn(
      `[schools] ${upserts.length} records changed since the snapshot — run scripts/snapshot-schools.mts and redeploy`,
    );
  }

  return { version: crypto.randomUUID(), upserts, removals };
}

/**
 * The change set, shared across every instance through the data cache.
 *
 * No `revalidate`: a timer re-reading the database is precisely what exhausted
 * the quota the first time. The tag is invalidated by the schools collection's
 * afterChange and afterDelete hooks, so the set is re-read exactly when the
 * data changes and at no other time.
 */
const readChanges = unstable_cache(fetchChanges, ["schools:changes"], { tags: [SCHOOLS_TAG] });

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

function apply(changes: Changes): School[] {
  const byId = new Map(BASE.map((s) => [s.id, s]));
  for (const id of changes.removals) byId.delete(id);
  for (const s of changes.upserts) byId.set(s.id, s);
  return [...byId.values()];
}

/**
 * The dataset and the change-set version it was built from, held for the life
 * of the process. Instances are reused between requests, so this is read far
 * more often than it is built.
 */
let held: { version: string; data: Dataset } | null = null;
let inFlight: Promise<Changes> | null = null;
let snapshotOnly: Dataset | null = null;

/** After a failed read, the database is left alone for a minute. */
let quietUntil = 0;

/**
 * The site does not go dark because the database is unavailable.
 *
 * A failed read falls back to whatever this instance last built, or the
 * snapshot itself on a fresh one — stale by the edits since, which is a far
 * better failure than every school page returning 500. The pause stops every
 * request in the meantime from waiting on a connection that is not coming.
 */
async function currentChanges(): Promise<Changes | null> {
  if (Date.now() < quietUntil) return null;
  inFlight ??= readChanges(SINCE).finally(() => {
    inFlight = null;
  });
  try {
    return await inFlight;
  } catch (error) {
    console.error("[schools] database unavailable, serving the snapshot", error);
    quietUntil = Date.now() + 60_000;
    return null;
  }
}

/** Deduplicated per request by React's cache. */
const dataset = cache(async (): Promise<Dataset> => {
  const changes = await currentChanges();
  if (!changes) return held?.data ?? (snapshotOnly ??= index(BASE));
  if (held?.version === changes.version) return held.data;
  const data = index(apply(changes));
  held = { version: changes.version, data };
  return data;
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
    if (filters.verified && !school.verified) continue;

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
      // Default browse order: schools confirmed with Eduplana first, then
      // richer profiles, so an empty query lands on the most trustworthy
      // listings rather than whichever sorts first alphabetically.
      scored.sort(
        (a, b) =>
          Number(b.school.verified) - Number(a.school.verified) ||
          b.school.images.gallery.length - a.school.images.gallery.length ||
          profileDepth(b.school) - profileDepth(a.school) ||
          a.school.name.localeCompare(b.school.name),
      );
      break;
    default:
      // Relevance decides; between equally good matches, a verified school wins.
      scored.sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.school.verified) - Number(a.school.verified) ||
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

  // Verified schools lead within each group: a parent comparing should see the
  // listings whose details were confirmed before the ones that were not.
  const byPreference = (a: School, b: School) =>
    Number(b.verified) - Number(a.verified) || feeGap(a) - feeGap(b) || profileDepth(b) - profileDepth(a);
  return [...sameArea.sort(byPreference), ...sameState.sort(byPreference)].slice(0, limit);
}

export const FEE_STEPS = [50_000, 150_000, 300_000, 500_000, 750_000, 1_000_000];
