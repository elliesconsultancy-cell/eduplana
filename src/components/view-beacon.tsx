"use client";

import { useEffect } from "react";

/**
 * Tells the server this profile was opened.
 *
 * Fires once per mount and ignores its own failures — a page must never break,
 * or wait, because a counter did not save. `keepalive` lets the request finish
 * even if the reader navigates away immediately, which is exactly when a bounce
 * would otherwise go unrecorded.
 */
export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [slug]);

  return null;
}
