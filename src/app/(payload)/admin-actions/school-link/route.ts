import { NextResponse } from "next/server";

import { createSchoolLink, db } from "@/lib/outreach/server";

/**
 * Makes a private update link for one school, for an admin to copy and send.
 *
 * Only admins: the link opens the school's edit page, and what is sent through
 * it still waits for review, but handing out links is the same decision as
 * sending the outreach email. Cross-site posts are refused, as on the outreach
 * screen, so another page cannot make links on behalf of a signed-in admin.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) {
    return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  }

  const payload = await db();
  const { user } = await payload.auth({ headers: request.headers });
  const role = (user as { role?: string } | null)?.role;
  if (!user || (role !== "admin" && role !== "super-admin")) {
    return NextResponse.json({ error: "Only admins can make update links." }, { status: 403 });
  }

  let body: { school?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "The request could not be read." }, { status: 400 });
  }
  const school = typeof body.school === "string" ? body.school : "";
  if (!school) return NextResponse.json({ error: "No school was given." }, { status: 400 });

  try {
    const link = await createSchoolLink(school, payload);
    if (!link) return NextResponse.json({ error: "That school could not be found." }, { status: 404 });
    return NextResponse.json(link);
  } catch (error) {
    console.error("[outreach] could not make a school link", error);
    return NextResponse.json({ error: "The link could not be made. Try again." }, { status: 500 });
  }
}
