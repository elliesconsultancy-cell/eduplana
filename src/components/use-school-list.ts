"use client";

import { useEffect, useState } from "react";
import type { School } from "@/lib/types";

/** The endpoint bounds a single request; longer lists are fetched in batches. */
const BATCH_SIZE = 50;

/** Stable identity so an empty result does not re-render every consumer. */
const EMPTY: School[] = [];

function batches(slugs: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < slugs.length; i += BATCH_SIZE) {
    out.push(slugs.slice(i, i + BATCH_SIZE));
  }
  return out;
}

/**
 * Resolve a list of slugs to full records via the schools endpoint.
 *
 * Returns `null` while the answer for the *current* slugs is unknown, so a
 * caller never renders a stale list from the previous set under new headings.
 */
export function useSchoolList(slugs: string[], ready: boolean): School[] | null {
  // Primitive dependency: the array identity changes on every render, the
  // joined string only changes when the contents actually do.
  const key = slugs.join(",");
  const [loaded, setLoaded] = useState<{ key: string; schools: School[] } | null>(null);

  useEffect(() => {
    if (!ready || !key) return;

    const controller = new AbortController();

    // A saved list can outgrow one request. Fetching in batches keeps the
    // endpoint bounded without silently dropping everything past the 50th.
    Promise.all(
      batches(key.split(",")).map((batch) =>
        fetch(`/api/schools?slugs=${encodeURIComponent(batch.join(","))}`, {
          signal: controller.signal,
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
          .then((data: { schools: School[] }) => data.schools),
      ),
    )
      .then((results) => setLoaded({ key, schools: results.flat() }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoaded({ key, schools: [] });
      });

    return () => controller.abort();
  }, [key, ready]);

  if (!ready) return null;
  // Derived, not stored: an empty list needs no fetch and no state write.
  if (!key) return EMPTY;
  return loaded?.key === key ? loaded.schools : null;
}
