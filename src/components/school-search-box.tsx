"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Compass, Loader2, MapPin, Search, X } from "lucide-react";

interface Suggestion {
  slug: string;
  name: string;
  place: string;
  level: string;
  careerReady: boolean;
}

/** Stable identity so an empty list does not re-render the dropdown. */
const EMPTY: Suggestion[] = [];

/**
 * Search with type-ahead.
 *
 * Two ways out, because people arrive with two different intents: they either
 * know the school (pick it from the list, go straight to the profile) or they
 * are browsing (press enter, run a normal filtered search). The dropdown shows
 * the town next to every name because Nigerian school names repeat constantly
 * — there are several "Meadow Hall" and a dozen "Grace Academy".
 */
export function SchoolSearchBox({
  defaultValue = "",
  placeholder = "Search by school name, town or area",
  onSubmitQuery,
  autoFocus = false,
}: {
  defaultValue?: string;
  placeholder?: string;
  /** Called on plain submit. Falls back to navigating to /schools?q=… */
  onSubmitQuery?: (query: string) => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  // Results are stored against the query that produced them, so the list can
  // never show suggestions for text the user has already typed past.
  const [result, setResult] = useState<{ key: string; items: Suggestion[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const trimmed = query.trim();
  const items = result?.key === trimmed ? result.items : EMPTY;
  // Clamped rather than reset in an effect: if the list shrank under the
  // cursor, fall back to "nothing highlighted".
  const activeIndex = active < items.length ? active : -1;

  useEffect(() => {
    if (trimmed.length < 2) return;

    const controller = new AbortController();
    // Debounced: a fetch per keystroke would fire ten times for one word.
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/suggest?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((data: { suggestions: Suggestion[] }) => {
          setResult({ key: trimmed, items: data.suggestions });
          setLoading(false);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setResult({ key: trimmed, items: EMPTY });
          setLoading(false);
        });
    }, 160);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  // Clicking anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function submit(value: string) {
    const trimmed = value.trim();
    setOpen(false);
    if (onSubmitQuery) onSubmitQuery(trimmed);
    else router.push(trimmed ? `/schools?q=${encodeURIComponent(trimmed)}` : "/schools");
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || items.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        submit(query);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const picked = items[activeIndex];
      if (picked) {
        setOpen(false);
        router.push(`/schools/${picked.slug}`);
      } else {
        submit(query);
      }
    }
  }

  const showList = open && trimmed.length >= 2;

  return (
    <div ref={rootRef} className="relative">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
      >
        <div className="relative">
          <Search
            size={17}
            strokeWidth={2.2}
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded={showList && items.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-16 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
          />
          <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {loading ? (
              <Loader2 size={15} className="animate-spin text-ink-400" aria-hidden />
            ) : null}
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  submit("");
                }}
                aria-label="Clear search"
                className="grid size-6 place-items-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X size={14} strokeWidth={2.5} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </form>

      {showList ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-float">
          {items.length > 0 ? (
            <ul id={listId} role="listbox" aria-label="School suggestions" className="max-h-80 overflow-y-auto py-1">
              {items.map((item, index) => (
                <li key={item.slug} id={`${listId}-${index}`} role="option" aria-selected={index === activeIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/schools/${item.slug}`);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      index === activeIndex ? "bg-brand-50" : "hover:bg-ink-50"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {item.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-xs text-ink-500">
                        <MapPin size={11} strokeWidth={2.4} aria-hidden className="shrink-0" />
                        <span className="truncate">{item.place || "Location not provided"}</span>
                      </span>
                    </span>
                    {item.careerReady ? (
                      <Compass
                        size={14}
                        strokeWidth={2.5}
                        aria-label="Strong career signals"
                        className="shrink-0 text-career-600"
                      />
                    ) : null}
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                      {item.level}
                    </span>
                  </button>
                </li>
              ))}
              <li className="border-t border-ink-100">
                <button
                  type="button"
                  onClick={() => submit(query)}
                  className="w-full px-3 py-2.5 text-left text-xs font-semibold text-brand-700 hover:bg-ink-50"
                >
                  Search all schools for “{trimmed}”
                </button>
              </li>
            </ul>
          ) : loading ? null : (
            <p className="px-3 py-3 text-sm text-ink-500">
              No school matches “{trimmed}”.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
