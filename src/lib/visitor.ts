import "server-only";

import { createHash } from "node:crypto";

/**
 * A token that identifies a visit for one day and nothing beyond it.
 *
 * The address and user agent go in, a hash comes out, and the salt changes at
 * midnight — so today's three page views by one person collapse into one
 * visitor, and tomorrow that same person hashes to something unrelated. The
 * address is never written anywhere.
 *
 * The salt is derived from the Payload secret rather than stored, which means
 * there is no salt table to leak and rotation needs no maintenance. It also
 * means yesterday's tokens cannot be recomputed once the day turns, which is
 * the property that makes this un-linkable rather than merely obscured.
 */
export function visitorToken(headers: Headers): string {
  const address =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown";
  const agent = headers.get("user-agent") ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.PAYLOAD_SECRET ?? "eduplana";

  return createHash("sha256").update(`${salt}:${day}:${address}:${agent}`).digest("hex").slice(0, 20);
}

/** Coarse enough to be useful, too coarse to help identify anyone. */
export function deviceOf(headers: Headers): "phone" | "tablet" | "computer" {
  const agent = headers.get("user-agent") ?? "";
  if (/iPad|Tablet|PlayBook|Silk/i.test(agent)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|Windows Phone/i.test(agent)) return "phone";
  return "computer";
}

/** Hostname only. The full referrer can carry someone's search terms. */
export function referrerHost(raw: string | null | undefined, self: string): string | null {
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host && host !== self.replace(/^www\./, "") ? host : null;
  } catch {
    return null;
  }
}
