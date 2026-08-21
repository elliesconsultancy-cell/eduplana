"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { ChevronDown, GraduationCap, Globe, Search, Wallet } from "lucide-react";
import type { Facet } from "@/lib/types";

/**
 * The homepage search. Four inputs only — text, state, level, budget — because
 * the blueprint's core recommendation is to keep the first experience simple
 * and add richer guidance after the family has found relevant schools.
 */
export function SearchForm({
  states,
  size = "large",
}: {
  states: Facet[];
  size?: "large" | "compact";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [state, setState] = useState("");
  const [level, setLevel] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const queryId = useId();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (state) params.set("state", state);
    if (level) params.set("level", level);
    if (feeMax) params.set("feeMax", feeMax);
    router.push(`/schools?${params.toString()}`);
  }

  const large = size === "large";

  return (
    <form onSubmit={submit} className="grid gap-2.5 sm:grid-cols-3">
      <div className="sm:col-span-2">
        <label htmlFor={queryId} className="sr-only">
          School name, town or area
        </label>
        <div className="relative">
          <Search
            size={18}
            strokeWidth={2.2}
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            id={queryId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="School name, town or area"
            className="h-[52px] w-full rounded-2xl border border-ink-200 bg-ink-50 pl-11 pr-4 text-[15px] outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 focus:bg-white"
          />
        </div>
      </div>

      <Select
        label="State"
        icon={Globe}
        value={state}
        onChange={setState}
        options={[
          { value: "", label: "Any state" },
          ...states.map((s) => ({ value: s.value, label: `${s.value} (${s.count})` })),
        ]}
      />

      {large ? (
        <>
          <Select
            label="Education level"
            icon={GraduationCap}
            value={level}
            onChange={setLevel}
            options={[
              { value: "", label: "Primary and secondary" },
              { value: "primary", label: "Primary only" },
              { value: "secondary", label: "Secondary only" },
            ]}
          />
          <Select
            label="Budget per term"
            icon={Wallet}
            value={feeMax}
            onChange={setFeeMax}
            options={[
              { value: "", label: "Any budget" },
              { value: "50000", label: "Under ₦50,000" },
              { value: "150000", label: "Under ₦150,000" },
              { value: "300000", label: "Under ₦300,000" },
              { value: "500000", label: "Under ₦500,000" },
              { value: "1000000", label: "Under ₦1,000,000" },
            ]}
          />
        </>
      ) : null}

      <button
        type="submit"
        className="inline-flex h-[52px] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgb(29_115_85_/_0.7)] transition-colors hover:bg-brand-700"
      >
        <Search size={17} strokeWidth={2.6} aria-hidden />
        Search
      </button>
    </form>
  );
}

function Select({
  label,
  icon: Icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ComponentType<{
    size?: number;
    strokeWidth?: number;
    className?: string;
    "aria-hidden"?: boolean;
  }>;
  value: string;
  onChange: (next: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <Icon
          size={17}
          strokeWidth={2.2}
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"
        />
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-[52px] w-full appearance-none truncate rounded-2xl border border-ink-200 bg-ink-50 pl-11 pr-9 text-[15px] outline-none transition-colors focus:border-brand-500 focus:bg-white"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={17}
          strokeWidth={2.2}
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400"
        />
      </div>
    </div>
  );
}
