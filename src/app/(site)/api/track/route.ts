import { NextResponse } from "next/server";
import { record } from "@/lib/track";
import { deviceOf, referrerHost, visitorToken } from "@/lib/visitor";
import { SITE_URL } from "@/lib/site";

/**
 * Records a page view.
 *
 * A beacon rather than server-side logging because pages are cached: the
 * richest 500 profiles are prerendered and the rest are cached after first
 * visit, so server code runs once and every reader after that is invisible to
 * it. A request from the browser counts readers rather than renders.
 *
 * The address and user agent are read here and immediately discarded into a
 * day-scoped hash — see lib/visitor.ts. Nothing that could identify a person is
 * written.
 */
const PATH = /^\/[A-Za-z0-9\-/_]{0,180}$/;

export async function POST(request: Request) {
  // Automated traffic would otherwise make a crawl look like an audience.
  const agent = request.headers.get("user-agent") ?? "";
  if (/bot|crawler|spider|headless|preview|monitor|curl|wget|lighthouse/i.test(agent)) {
    return NextResponse.json({ ok: true, recorded: false });
  }

  let body: { path?: unknown; slug?: unknown; referrer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const path = typeof body.path === "string" && PATH.test(body.path) ? body.path : null;
  if (!path) return NextResponse.json({ ok: false }, { status: 400 });

  const slug =
    typeof body.slug === "string" && /^[a-z0-9][a-z0-9-]{0,120}$/.test(body.slug) ? body.slug : null;

  // Awaited on purpose: work started after a response is sent is not
  // guaranteed to finish on serverless. See the note in lib/track.ts.
  await record({
    type: "view",
    path,
    slug,
    referrer: referrerHost(typeof body.referrer === "string" ? body.referrer : null, new URL(SITE_URL).hostname),
    device: deviceOf(request.headers),
    visitor: visitorToken(request.headers),
  });

  return NextResponse.json({ ok: true, recorded: true });
}
