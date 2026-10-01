"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";

const noop = () => () => {};
/** Read once on the client; the server renders the Mac hint, which most of us use. */
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Find a school from anywhere in the admin.
 *
 * Schools are what people come in to edit, so the header search goes straight
 * to the schools list filtered by what was typed — the same search Payload's
 * list already runs over name, area and slug. ⌘K / Ctrl+K focuses it.
 */
export function HeaderSearch() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const mac = useSyncExternalStore(noop, isMac, () => true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="ep-search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = input.current?.value.trim() ?? "";
        router.push(q ? `/admin/collections/schools?search=${encodeURIComponent(q)}` : "/admin/collections/schools");
      }}
    >
      <Search size={18} aria-hidden className="ep-search__icon" />
      <label htmlFor="ep-search" className="u-sr-only">
        Find a school
      </label>
      <input ref={input} id="ep-search" type="search" placeholder="Find a school…" autoComplete="off" />
      <kbd className="ep-search__kbd" aria-hidden>
        {mac ? "⌘" : "Ctrl"} K
      </kbd>
    </form>
  );
}
