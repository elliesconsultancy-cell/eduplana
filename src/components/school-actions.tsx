"use client";

import { ArrowLeftRight, Heart } from "lucide-react";
import { COMPARE_LIMIT, useShortlist } from "./shortlist-provider";

/** Shared pill geometry so Save and Compare always sit level with each other. */
function pill(compact: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${
    compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
  }`;
}

export function SaveButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { isSaved, toggleSaved, ready } = useShortlist();
  const saved = ready && isSaved(slug);

  return (
    <button
      type="button"
      onClick={() => toggleSaved(slug)}
      aria-pressed={saved}
      className={`${pill(compact)} ${
        saved
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50"
      }`}
    >
      <Heart
        size={compact ? 13 : 15}
        strokeWidth={2.3}
        aria-hidden
        className={`shrink-0 ${saved ? "fill-current" : ""}`}
      />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function CompareButton({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const { isComparing, toggleCompare, compareFull, ready } = useShortlist();
  const active = ready && isComparing(slug);
  const disabled = !active && compareFull;

  return (
    <button
      type="button"
      onClick={() => toggleCompare(slug)}
      disabled={disabled}
      aria-pressed={active}
      title={disabled ? `You can compare up to ${COMPARE_LIMIT} schools` : undefined}
      className={`${pill(compact)} ${
        active
          ? "border-brand-200 bg-brand-50 text-brand-800"
          : disabled
            ? "cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400"
            : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50"
      }`}
    >
      <ArrowLeftRight size={compact ? 13 : 15} strokeWidth={2.3} aria-hidden className="shrink-0" />
      {active ? "Comparing" : "Compare"}
    </button>
  );
}
