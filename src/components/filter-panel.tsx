"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Compass } from "lucide-react";
import { SchoolSearchBox } from "./school-search-box";
import type { Facet } from "@/lib/types";

interface Facets {
  states: Facet[];
  areas: Facet[];
  curricula: Facet[];
  faiths: Facet[];
  facilities: Facet[];
}

const FEE_OPTIONS = [
  { value: "50000", label: "Under ₦50,000" },
  { value: "150000", label: "Under ₦150,000" },
  { value: "300000", label: "Under ₦300,000" },
  { value: "500000", label: "Under ₦500,000" },
  { value: "1000000", label: "Under ₦1,000,000" },
];

const BOARDING_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "boarding", label: "Boarding" },
  { value: "both", label: "Day & boarding" },
];

/** Human-readable labels for the active-filter chips. */
const CHIP_LABELS: Record<string, (value: string) => string> = {
  q: (v) => `“${v}”`,
  state: (v) => v,
  area: (v) => v,
  level: (v) => (v === "primary" ? "Primary" : "Secondary"),
  curriculum: (v) => `${v} curriculum`,
  boarding: (v) => BOARDING_OPTIONS.find((b) => b.value === v)?.label ?? v,
  faith: (v) => v,
  facility: (v) => v,
  feeMax: (v) => FEE_OPTIONS.find((f) => f.value === v)?.label ?? `Under ₦${v}`,
  hasPhotos: () => "Has photos",
  careerReady: () => "Strong career signals",
};

export function FilterPanel({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Changing a filter should always return to the first page of results.
      next.delete("page");
      // Narrowing by state invalidates any area chosen under the old state.
      if (key === "state") next.delete("area");
      router.push(`/schools?${next.toString()}`, { scroll: false });
    },
    [params, router],
  );

  const activeChips = [...params.entries()].filter(
    ([key, value]) => key in CHIP_LABELS && value,
  );

  return (
    <>
      {/* Mobile trigger — the blueprint asks for a sticky filter button. */}
      {/* top matches the site header's height exactly; any less and results
          show through the gap as the page scrolls under it. */}
      <div className="col-span-full sticky top-[68px] z-30 -mx-4 mb-4 border-b border-ink-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium"
          >
            <FilterIcon />
            Filters
            {activeChips.length > 0 ? (
              <span className="rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                {activeChips.length}
              </span>
            ) : null}
          </button>
          <SortSelect value={params.get("sort") ?? ""} onChange={(v) => setParam("sort", v || null)} />
        </div>
      </div>

      {activeChips.length > 0 ? (
        <ul className="col-span-full mb-1 flex flex-wrap gap-2">
          {activeChips.map(([key, value]) => (
            <li key={`${key}-${value}`}>
              <button
                type="button"
                onClick={() => setParam(key, null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pl-3 pr-2 text-sm text-brand-800 transition-colors hover:bg-brand-100"
              >
                {CHIP_LABELS[key](value)}
                <span aria-hidden className="text-brand-600">×</span>
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => router.push("/schools")}
              className="rounded-full px-3 py-1 text-sm font-medium text-ink-500 underline underline-offset-4 hover:text-ink-800"
            >
              Clear all
            </button>
          </li>
        </ul>
      ) : null}

      <aside
        className={`${open ? "block" : "hidden"} lg:col-start-1 lg:block`}
        aria-label="Filter schools"
      >
        <div className="space-y-6 rounded-[--radius-card] border border-ink-200 bg-white p-4">
          {/* A results page with no search box forces a trip back to the
              homepage to look up a different school. */}
          <div>
            <p className="mb-2 text-sm font-semibold text-ink-800">Search</p>
            <SchoolSearchBox
              defaultValue={params.get("q") ?? ""}
              placeholder="School name, town or area"
              onSubmitQuery={(next) => setParam("q", next || null)}
            />
          </div>

          <div className="hidden lg:block">
            <SortSelect
              value={params.get("sort") ?? ""}
              onChange={(v) => setParam("sort", v || null)}
              label="Sort results"
            />
          </div>

          <Group title="Education level">
            <Choices
              value={params.get("level") ?? ""}
              options={[
                { value: "primary", label: "Primary" },
                { value: "secondary", label: "Secondary" },
              ]}
              onChange={(v) => setParam("level", v)}
            />
          </Group>

          <Group title="Career education">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-career-200 bg-career-50 p-3 text-sm">
              <input
                type="checkbox"
                checked={params.get("careerReady") === "1"}
                onChange={(e) => setParam("careerReady", e.target.checked ? "1" : null)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-career-200 accent-career-600"
              />
              <span>
                <span className="flex items-center gap-1.5 font-semibold text-career-900">
                  <Compass size={14} strokeWidth={2.5} aria-hidden />
                  Strong career signals
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-600">
                  Schools publishing four or more career indicators.
                </span>
              </span>
            </label>
          </Group>

          <Group title="Budget per term">
            <Choices
              value={params.get("feeMax") ?? ""}
              options={FEE_OPTIONS}
              onChange={(v) => setParam("feeMax", v)}
            />
          </Group>

          <Group title="State">
            <SelectList
              value={params.get("state") ?? ""}
              facets={facets.states}
              placeholder="Any state"
              onChange={(v) => setParam("state", v)}
            />
          </Group>

          {facets.areas.length > 1 ? (
            <Group title="Area">
              <SelectList
                value={params.get("area") ?? ""}
                facets={facets.areas}
                placeholder="Any area"
                onChange={(v) => setParam("area", v)}
              />
            </Group>
          ) : null}

          <Group title="Day or boarding">
            <Choices
              value={params.get("boarding") ?? ""}
              options={BOARDING_OPTIONS}
              onChange={(v) => setParam("boarding", v)}
            />
          </Group>

          {facets.curricula.length > 1 ? (
            <Group title="Curriculum">
              <Choices
                value={params.get("curriculum") ?? ""}
                options={facets.curricula.slice(0, 8).map((c) => ({
                  value: c.value,
                  label: `${c.value} (${c.count})`,
                }))}
                onChange={(v) => setParam("curriculum", v)}
              />
            </Group>
          ) : null}

          {facets.faiths.length > 1 ? (
            <Group title="Faith">
              <Choices
                value={params.get("faith") ?? ""}
                options={facets.faiths.map((f) => ({ value: f.value, label: f.value }))}
                onChange={(v) => setParam("faith", v)}
              />
            </Group>
          ) : null}

          {facets.facilities.length > 0 ? (
            <Group title="Facilities">
              <SelectList
                value={params.get("facility") ?? ""}
                facets={facets.facilities}
                placeholder="Any facility"
                onChange={(v) => setParam("facility", v)}
              />
            </Group>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2.5 border-t border-ink-100 pt-4 text-sm text-ink-700">
            <input
              type="checkbox"
              checked={params.get("hasPhotos") === "1"}
              onChange={(e) => setParam("hasPhotos", e.target.checked ? "1" : null)}
              className="h-4 w-4 rounded border-ink-300 accent-brand-600"
            />
            Only schools with photos
          </label>

          <p className="text-xs text-ink-400">
            {total.toLocaleString()} school{total === 1 ? "" : "s"} match these filters.
          </p>
        </div>
      </aside>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-800">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Toggle buttons: clicking the active option clears it. */
function Choices({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option.value)}
            className={`rounded-lg border px-2.5 py-1.5 text-sm transition-colors ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SelectList({
  value,
  facets,
  placeholder,
  onChange,
}: {
  value: string;
  facets: Facet[];
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value || null)}
      className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
    >
      <option value="">{placeholder}</option>
      {facets.map((f) => (
        <option key={f.value} value={f.value}>
          {f.value} ({f.count})
        </option>
      ))}
    </select>
  );
}

function SortSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  return (
    <label className={label ? "block" : "ml-auto block"}>
      {label ? (
        <span className="mb-2 block text-sm font-semibold text-ink-800">{label}</span>
      ) : (
        <span className="sr-only">Sort results</span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
      >
        <option value="">Most complete profiles</option>
        <option value="career">Strongest career signals</option>
        <option value="relevance">Best match</option>
        <option value="fee-asc">Lowest fees first</option>
        <option value="fee-desc">Highest fees first</option>
        <option value="name">School name (A–Z)</option>
      </select>
    </label>
  );
}

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
