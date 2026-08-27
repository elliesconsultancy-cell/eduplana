import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { SchoolCard } from "@/components/school-card";
import { facetsFor, search } from "@/lib/schools";
import type { Level, SearchFilters, SortKey } from "@/lib/types";

const PAGE_SIZE = 24;

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function toFilters(params: Params): SearchFilters {
  const feeMax = Number(one(params, "feeMax"));
  const boarding = one(params, "boarding");
  return {
    q: one(params, "q"),
    state: one(params, "state"),
    area: one(params, "area"),
    level: one(params, "level") as Level | undefined,
    curriculum: one(params, "curriculum"),
    boarding: boarding === "day" || boarding === "boarding" || boarding === "both" ? boarding : undefined,
    faith: one(params, "faith"),
    facility: one(params, "facility"),
    feeMax: Number.isFinite(feeMax) && feeMax > 0 ? feeMax : undefined,
    hasPhotos: one(params, "hasPhotos") === "1",
    careerReady: one(params, "careerReady") === "1",
    sort: (one(params, "sort") as SortKey) || undefined,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Params>;
}): Promise<Metadata> {
  const params = await searchParams;
  const bits = [one(params, "q"), one(params, "area"), one(params, "state")].filter(Boolean);
  const title = bits.length ? `Schools in ${bits.join(", ")}` : "Find schools";
  return {
    title,
    description: `Search schools across Nigeria. ${title}.`,
    /*
     * Every filter combination is its own URL, which is what makes a search
     * shareable — but it also means thousands of near-identical pages competing
     * with each other. Pointing them all at the bare listing keeps the ranking
     * on one page instead of split across the permutations.
     */
    alternates: { canonical: "/schools" },
  };
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const filters = toFilters(params);
  const page = Math.max(1, Number(one(params, "page")) || 1);

  const results = search(filters);
  const facets = facetsFor(results);
  const start = (page - 1) * PAGE_SIZE;
  const visible = results.slice(start, start + PAGE_SIZE);
  const totalPages = Math.ceil(results.length / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
          {results.length.toLocaleString()} school{results.length === 1 ? "" : "s"}
          {filters.state ? ` in ${filters.area ? `${filters.area}, ` : ""}${filters.state}` : ""}
        </h1>
        {filters.q ? (
          <p className="mt-1 text-ink-600">
            Matching <span className="font-medium text-ink-900">“{filters.q}”</span>
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
        <Suspense fallback={<div className="h-64 rounded-[--radius-card] bg-white" />}>
          <FilterPanel facets={facets} total={results.length} />
        </Suspense>

        <div>
          {visible.length === 0 ? (
            <EmptyState filters={filters} />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((school, index) => (
                  <SchoolCard key={school.id} school={school} priority={index < 3} />
                ))}
              </div>
              {totalPages > 1 ? (
                <Pagination page={page} totalPages={totalPages} params={params} />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The blueprint asks for empty states that broaden one constraint at a time,
 * rather than dumping the user back to an unfiltered list.
 */
function EmptyState({ filters }: { filters: SearchFilters }) {
  const suggestions: Array<{ href: string; label: string }> = [];
  const base = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value == null || value === false || value === "") continue;
    // `hasPhotos` round-trips as "1", not "true" — String(true) would produce a
    // link that silently drops the filter it is meant to preserve.
    base.set(key, value === true ? "1" : String(value));
  }

  const drop = (key: string, label: string) => {
    if (!base.has(key)) return;
    const next = new URLSearchParams(base.toString());
    next.delete(key);
    suggestions.push({ href: `/schools?${next.toString()}`, label });
  };

  drop("feeMax", "Remove the budget limit");
  drop("area", "Search the whole state");
  drop("facility", "Remove the facility filter");
  drop("curriculum", "Any curriculum");
  drop("hasPhotos", "Include schools without photos");
  drop("careerReady", "Include schools without career signals");
  drop("q", "Clear the search text");

  return (
    <div className="rounded-[--radius-card] border border-dashed border-ink-300 bg-white p-8 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">No schools match all of that</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
        Try widening one thing at a time — you will usually find options nearby.
      </p>
      <ul className="mt-5 flex flex-wrap justify-center gap-2">
        {suggestions.slice(0, 4).map((s) => (
          <li key={s.href}>
            <Link
              href={s.href}
              className="inline-block rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium text-brand-800 transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              {s.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            href="/schools"
            className="inline-block rounded-lg bg-brand-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Start over
          </Link>
        </li>
      </ul>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  params,
}: {
  page: number;
  totalPages: number;
  params: Params;
}) {
  const href = (target: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page") continue;
      if (typeof value === "string") next.set(key, value);
    }
    if (target > 1) next.set("page", String(target));
    const qs = next.toString();
    return `/schools${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label="Pagination">
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-ink-400"
        >
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-sm text-ink-500">
        Page {page} of {totalPages}
      </p>
      {page < totalPages ? (
        <Link
          href={href(page + 1)}
          className="rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium hover:border-ink-400"
        >
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
