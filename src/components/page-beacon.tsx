"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Reports each page a visitor reaches, including client-side navigations.
 *
 * Mounted once in the site layout rather than per page, so a route added later
 * is counted without anybody remembering to instrument it. The ref guards
 * against double-firing in development's strict mode, which would otherwise
 * double every figure on the dashboard.
 *
 * Failures are swallowed and nothing on the page waits for the response — a
 * counter must never be the reason a page is slow or broken.
 */
export function PageBeacon() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;

    const slug = pathname.startsWith("/schools/") ? pathname.slice("/schools/".length) : undefined;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, slug, referrer: document.referrer || null }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
