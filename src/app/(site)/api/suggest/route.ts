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
  const q = searchParams.get("q") ?? "";

  return NextResponse.json(
    { suggestions: suggest(q) },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
