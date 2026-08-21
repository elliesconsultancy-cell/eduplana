import "server-only";

import primary from "@/data/schools.primary.json";
import { careerProfile } from "./career";
import type { Facet, School, SearchFilters, SortKey } from "./types";

/**
 * The data layer.
 *
 * The two JSON files under `src/data` are the source of truth, and they hold
 * exactly what the app renders — no cleanup, parsing or repair happens at
 * request time. Everything lives in memory: 7,375 records is small enough that
 * a linear scan per request costs under a millisecond, which keeps the app
 * free of a database until the schema has settled.
 *
 * The exported functions are the exact surface a real query layer will need to
 * satisfy, so moving these records into a database should not touch a single
 * component — only the bodies below.
 */

import secondary from "@/data/schools.secondary.json";

// TypeScript infers a literal shape from each JSON file (e.g. `level: string`
// rather than the `Level` union), so both need asserting to the domain type.
const ALL: School[] = [
  ...(primary as unknown as School[]),
  ...(secondary as unknown as School[]),
];

const bySlug = new Map(ALL.map((s) => [s.slug, s]));

/** Precomputed lowercase haystack per school — built once, reused per query. */
const HAYSTACK = new Map(
  ALL.map((s) => [
    s.id,
    [s.name, s.area, s.state, s.address, s.tagline, ...s.curricula]
      .filter(Boolean)
      .join(" ")
      .toLowerCase(),
  ]),
);

export function allSchools(): School[] {
  return ALL;
}

export function getSchool(slug: string): School | undefined {
  return bySlug.get(slug);
}

export function getSchools(slugs: string[]): School[] {
  return slugs.map((s) => bySlug.get(s)).filter((s): s is School => Boolean(s));
}

export function totalCount(): number {
  return ALL.length;
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
function score(school: School, query: Query): number {
  const { tokens, prefixOnly } = query;
  if (tokens.length === 0) return 0;
  const name = school.name.toLowerCase();
  const place = `${school.area ?? ""} ${school.state ?? ""}`.toLowerCase();
  const haystack = HAYSTACK.get(school.id) ?? "";
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

export function search(filters: SearchFilters): School[] {
  const query = parseQuery(filters.q ?? "");
  const scored: Array<{ school: School; score: number }> = [];

  for (const school of ALL) {
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

    const relevance = score(school, query);
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
export function suggest(query: string, limit = 8): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const hits: Array<{ school: School; rank: number }> = [];
  for (const school of ALL) {
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

export function topStates(limit = 8): Facet[] {
  return tally(ALL.map((s) => s.state)).slice(0, limit);
}

export function topAreas(state: string, limit = 12): Facet[] {
  return tally(ALL.filter((s) => s.state === state).map((s) => s.area)).slice(0, limit);
}

/** Similar schools for the profile page: same area first, then same state. */
export function relatedSchools(school: School, limit = 4): School[] {
  const pool = ALL.filter((s) => s.id !== school.id);
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
