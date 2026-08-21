"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { COMPARE_LIMIT, useShortlist } from "./shortlist-provider";

/**
 * A persistent bar that appears once schools are selected for comparison.
 *
 * It carries only the count, not the names — the tray is rendered on every
 * page, and shipping 2,990 names to the client to label four of them would be
 * a poor trade. The /compare page resolves the slugs server-side.
 */
export function CompareTray() {
  const { compare, clearCompare, ready } = useShortlist();
  const pathname = usePathname();

  if (!ready || compare.length === 0 || pathname === "/compare") return null;

  return (
    <>
      {/* The bar is fixed, so it would otherwise sit on top of the last few
          lines of every page. This spacer reserves the height in normal flow. */}
      <div aria-hidden className="h-24" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-brand-700/20 bg-brand-900 px-4 py-3 text-white shadow-[--shadow-lift]">
        <div className="flex -space-x-1.5" aria-hidden>
          {Array.from({ length: COMPARE_LIMIT }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ring-2 ring-brand-900 ${
                i < compare.length ? "bg-gold-400" : "bg-white/25"
              }`}
            />
          ))}
        </div>

        <p className="text-sm font-medium">
          {compare.length} school{compare.length === 1 ? "" : "s"} selected
        </p>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={clearCompare}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Clear
          </button>
          <Link
            href="/compare"
            className="rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-brand-900 transition-colors hover:bg-gold-100"
          >
            Compare
          </Link>
        </div>
      </div>
      </div>
    </>
  );
}
