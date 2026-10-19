import { NextResponse } from "next/server";
import { suggest } from "@/lib/schools";

/**
 * Type-ahead for the school search box.
 *
 * Kept separate from /api/schools: that one returns whole records for the
 * shortlist, this returns four fields per row and is hit on every keystroke.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // Case and stray spaces do not change the answer, so they should not change
  // the cache entry: "Lekki", "lekki" and "lekki " are one request to the CDN.
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  return NextResponse.json(
    { suggestions: await suggest(q) },
    {
      headers: {
        /*
         * `max-age` is the browser, `s-maxage` is Vercel's CDN: the same prefix
         * typed by anyone is worked out once an hour, not once per keystroke.
         * An hour is the staleness this accepts after an edit — a school that
         * was renamed or unpublished can be suggested for up to that long.
         */
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
