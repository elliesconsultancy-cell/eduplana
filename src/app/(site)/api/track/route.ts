import { NextResponse } from "next/server";
import { record } from "@/lib/track";

/**
 * Records a school profile view.
 *
 * This exists as a beacon rather than a line in the page component because
 * profile pages are cached: the 500 richest are prerendered and the rest are
 * cached after the first visit, so server code runs once and every subsequent
 * reader is invisible to it. A request from the browser is the only way to
 * count the readers rather than the renders.
 *
 * No cookie, no id, no third party — the row records which school was opened
 * and when, and nothing about who opened it.
 */
const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;

export async function POST(request: Request) {
  // Automated traffic would otherwise make a crawl look like an audience.
  const agent = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|headless|preview|monitor|curl|wget/i.test(agent)) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (typeof slug !== "string" || !SLUG.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Awaited on purpose — see the note in lib/track.ts.
  await record({ type: "view", path: `/schools/${slug}`, slug });
  return NextResponse.json({ ok: true, recorded: true });
}
