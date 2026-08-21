import { NextResponse } from "next/server";
import { getSchools } from "@/lib/schools";

/**
 * Resolve slugs to full school records.
 *
 * Saved and compared schools live in localStorage, so those pages only know
 * slugs at render time. Rather than ship the whole dataset to the client to
 * label a handful of them, they ask for exactly what they need.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugs = (searchParams.get("slugs") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50); // bound the response; the UI never needs more

  if (slugs.length === 0) return NextResponse.json({ schools: [] });

  return NextResponse.json(
    { schools: getSchools(slugs) },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
