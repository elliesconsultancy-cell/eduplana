"use client";

import { AssetImage } from "@/components/asset-image";
import Link from "next/link";
import { useShortlist } from "@/components/shortlist-provider";
import { useSchoolList } from "@/components/use-school-list";
import { boardingLabel, formatFee, locationLabel } from "@/lib/format";
import type { School } from "@/lib/types";

/**
 * Side-by-side comparison on a fixed set of attributes.
 *
 * Every school is measured on the same rows, and a school that has not
 * published a value shows "Not provided" rather than being scored down for it.
 */
const ROWS: Array<{ label: string; get: (s: School) => string | null }> = [
  { label: "Location", get: (s) => locationLabel(s) },
  { label: "Fees per term", get: (s) => formatFee(s) },
  { label: "Day or boarding", get: (s) => boardingLabel(s) },
  { label: "Curriculum", get: (s) => s.curricula.join(", ") || null },
  { label: "Education level", get: (s) => s.scope },
  { label: "Faith", get: (s) => s.faith },
  { label: "Max class size", get: (s) => (s.maxClassSize ? `${s.maxClassSize} students` : null) },
  { label: "Year founded", get: (s) => s.yearFounded?.toString() ?? null },
  { label: "Scholarships", get: (s) => s.scholarship },
  { label: "Siblings’ discount", get: (s) => s.siblingsDiscount },
  { label: "Facilities", get: (s) => s.facilities.join(", ") || null },
  { label: "Activities", get: (s) => s.activities.join(", ") || null },
  { label: "Phone", get: (s) => s.phone },
];

export default function ComparePage() {
  const { compare, toggleCompare, clearCompare, ready } = useShortlist();
  const schools = useSchoolList(compare, ready);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
            Compare schools
          </h1>
          <p className="mt-1 text-ink-600">
            Up to four schools, measured on the same information.
          </p>
        </div>
        {compare.length > 0 ? (
          <button
            type="button"
            onClick={clearCompare}
            className="rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-sm font-medium hover:border-ink-400"
          >
            Clear all
          </button>
        ) : null}
      </header>

      {!ready || schools === null ? (
        <div className="mt-8 h-64 animate-pulse rounded-[--radius-card] bg-white" />
      ) : schools.length === 0 ? (
        <div className="mt-8 rounded-[--radius-card] border border-dashed border-ink-300 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">
            No schools selected yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            Browse the directory and press “Compare” on any school to add it here.
          </p>
          <Link
            href="/schools"
            className="mt-5 inline-block rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Find schools
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-0">
            <caption className="sr-only">School comparison</caption>
            <thead>
              <tr>
                <th scope="col" className="w-36 bg-ink-50 p-3 text-left align-bottom" />
                {schools.map((school) => (
                  <th key={school.id} scope="col" className="p-3 align-bottom">
                    <div className="flex flex-col items-start gap-2 text-left">
                      {school.images.logo ? (
                        <AssetImage
                          path={school.images.logo}
                          alt=""
                          width={48}
                          height={48}
                          className="h-11 w-11 rounded-lg border border-ink-200 bg-white object-contain p-1"
                        />
                      ) : null}
                      <Link
                        href={`/schools/${school.slug}`}
                        className="font-display text-[15px] font-semibold leading-snug text-ink-950 hover:text-brand-700"
                      >
                        {school.name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCompare(school.slug)}
                        className="text-xs font-medium text-ink-500 underline underline-offset-4 hover:text-ink-800"
                      >
                        Remove
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => (
                <tr key={row.label} className={index % 2 ? "bg-white" : "bg-ink-50/60"}>
                  <th
                    scope="row"
                    className="border-t border-ink-200 p-3 text-left align-top text-sm font-semibold text-ink-700"
                  >
                    {row.label}
                  </th>
                  {schools.map((school) => {
                    const value = row.get(school);
                    return (
                      <td
                        key={school.id}
                        className={`border-t border-ink-200 p-3 align-top text-sm ${
                          value ? "text-ink-900" : "italic text-ink-400"
                        }`}
                      >
                        {value || "Not provided"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
