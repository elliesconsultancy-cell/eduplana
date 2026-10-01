import { NextResponse } from "next/server";

import { resolveLink } from "@/lib/outreach/server";
import { submitListing, type Kind } from "@/lib/outreach/submit";

/** A school sending its listing back for review. See lib/outreach/submit.ts. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "The form could not be read." }, { status: 400 });
  }

  const access = await resolveLink(String(body.token ?? ""));
  if (!access) {
    return NextResponse.json(
      { ok: false, error: "This link has expired. Request a new one at eduplana.org/manage — your changes are still on this page." },
      { status: 403 },
    );
  }

  const kind: Kind = body.kind === "confirm" || body.kind === "removal" ? body.kind : "update";
  try {
    const result = await submitListing(
      access,
      String(body.school ?? ""),
      kind,
      (body.values ?? {}) as Record<string, unknown>,
      (body.contact ?? {}) as Record<string, unknown>,
      body.message,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[manage] submission failed", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong saving your changes. Please try again in a minute." },
      { status: 500 },
    );
  }
}
