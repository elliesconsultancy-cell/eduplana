import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";

/**
 * Record what a visitor did, without ever delaying them.
 *
 * Every call is fire-and-forget and swallows its own failures. Analytics is
 * the least important thing on the page: if Postgres is slow or unhappy, a
 * parent looking for a school should never see it, and a page must never fail
 * because a counter could not be written.
 */
type Event =
  | { type: "search"; path: string; query: string | null; filters: string | null; results: number }
  | { type: "view"; path: string; slug: string };

export function record(event: Event): void {
  void (async () => {
    try {
      const payload = await getPayload({ config });
      await payload.create({
        collection: "events",
        data: {
          type: event.type,
          path: event.path,
          slug: event.type === "view" ? event.slug : null,
          query: event.type === "search" ? event.query : null,
          filters: event.type === "search" ? event.filters : null,
          results: event.type === "search" ? event.results : null,
        },
        overrideAccess: true,
      });
    } catch {
      // Deliberately silent. See above.
    }
  })();
}

/** A readable one-line summary of the filters applied, or null if none were. */
export function describeFilters(filters: Record<string, unknown>): string | null {
  const parts = Object.entries(filters)
    .filter(([key, value]) => key !== "q" && key !== "sort" && value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${String(value)}`);
  return parts.length ? parts.join(" ") : null;
}
