import { Compass, ShieldCheck } from "lucide-react";
import { careerProfile, isVerified, STRONG_THRESHOLD, SIGNALS } from "@/lib/career";
import type { School } from "@/lib/types";

/**
 * Two badges that must never be confused:
 *
 *  - Career signals — derived from what the school published. Shown with its
 *    workings, and captioned as such.
 *  - Verified — a human checked. Owned by the backend, deliberately a
 *    different shape and colour so it cannot be mistaken for the derived one.
 */

export function CareerBadge({
  school,
  size = "md",
}: {
  school: School;
  size?: "sm" | "md";
}) {
  const { tier, count } = careerProfile(school);
  if (tier !== "strong") return null;
  const small = size === "sm";

  return (
    <span
      title={`${count} of ${SIGNALS.length} career-education signals published by this school`}
      className={`inline-flex items-center gap-1.5 rounded-full bg-career-100 font-bold text-career-700 ring-1 ring-inset ring-career-600/20 ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <Compass size={small ? 11 : 13} strokeWidth={2.6} aria-hidden />
      Career signals
      <span className="tabular-nums opacity-70">{count}</span>
    </span>
  );
}

export function VerifiedBadge({ school, size = "md" }: { school: School; size?: "sm" | "md" }) {
  if (!isVerified(school)) return null;
  const small = size === "sm";

  return (
    <span
      title="Details confirmed with the school by Eduplana"
      className={`inline-flex items-center gap-1.5 rounded-full bg-brand-600 font-bold text-white ${
        small ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      }`}
    >
      <ShieldCheck size={small ? 11 : 13} strokeWidth={2.6} aria-hidden />
      Verified
    </span>
  );
}

/** The full breakdown, with the school's own words as the evidence. */
export function CareerBreakdown({ school }: { school: School }) {
  const { matched, count, tier } = careerProfile(school);

  return (
    <div className="overflow-hidden rounded-card border border-career-200 bg-career-50">
      <div className="flex flex-wrap items-center gap-3 border-b border-career-200 px-5 py-4">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-career-600 text-white"
        >
          <Compass size={19} strokeWidth={2.3} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] text-career-900">
            {tier === "strong"
              ? "Strong career-education signals"
              : tier === "some"
                ? "Some career-education signals"
                : "No career-education signals published"}
          </p>
          <p className="text-[13px] text-career-700">
            {count} of {SIGNALS.length} indicators
            {tier === "strong" ? ` — clears our bar of ${STRONG_THRESHOLD}` : ""}
          </p>
        </div>
      </div>

      {matched.length > 0 ? (
        <ul className="divide-y divide-career-200/70">
          {matched.map(({ signal, evidence }) => (
            <li key={signal.key} className="px-5 py-3.5">
              <p className="text-sm font-semibold text-ink-900">{signal.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                {evidence.join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-4 text-[13px] leading-relaxed text-ink-600">
          This school has not published facilities, activities or clubs that point to career
          education. That does not mean it does none — only that we have nothing to go on.
        </p>
      )}

      <p className="border-t border-career-200 bg-white/60 px-5 py-3 text-xs leading-relaxed text-ink-600">
        Worked out from the facilities, activities and clubs this school published — not an
        independent assessment. We show the exact items so you can judge them yourself.
      </p>
    </div>
  );
}
