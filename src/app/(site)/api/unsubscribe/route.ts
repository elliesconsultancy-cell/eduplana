import { NextResponse } from "next/server";

import { optOut } from "@/lib/outreach/server";
import { verifyUnsubscribe } from "@/lib/outreach/tokens";

/**
 * One-click unsubscribe (RFC 8058).
 *
 * Gmail and Yahoo show their own "Unsubscribe" button for bulk mail and post
 * here when it is pressed; they require this to work without a page in
 * between. A plain GET — a person or a scanner following the address — goes
 * to the page with a button instead, so nothing is changed by merely visiting.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("e") ?? "";
  const signature = url.searchParams.get("s") ?? "";
  if (!email || !verifyUnsubscribe(email, signature)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await optOut(email);
  return NextResponse.json({ ok: true });
}

export function GET(request: Request) {
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(`/unsubscribe${url.search}`, url.origin), 303);
}
