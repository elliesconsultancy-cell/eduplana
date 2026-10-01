import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * The secrets in an outreach email.
 *
 * A listing link is a random token, and only its SHA-256 is stored. Someone who
 * reads the database — a backup, a leaked dump — learns which schools were
 * emailed, but holds nothing that opens a listing.
 *
 * Unsubscribing is deliberately different: it must keep working long after the
 * listing link has expired, from an email somebody finds in a folder a year
 * later. So it is not a stored token but a signature over the address, which
 * never expires and cannot be forged for an address it was not issued to.
 */

/** 24 random bytes: 192 bits, written as 32 URL-safe characters. */
export function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function key(): string {
  const secret = process.env.PAYLOAD_SECRET;
  if (!secret) throw new Error("PAYLOAD_SECRET is not set");
  return secret;
}

export function unsubscribeSignature(email: string): string {
  return createHmac("sha256", key())
    .update(`unsubscribe:${email.trim().toLowerCase()}`)
    .digest("base64url");
}

export function verifyUnsubscribe(email: string, signature: string): boolean {
  const expected = Buffer.from(unsubscribeSignature(email));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
