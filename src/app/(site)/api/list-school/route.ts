import { NextResponse } from "next/server";

import { resolveInvite } from "@/lib/outreach/server";
import { submitNewSchool } from "@/lib/outreach/submit";

/** A school invited to be added sending its details in. See lib/outreach/submit.ts. */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "The form could not be read." }, { status: 400 });
  }

  const invite = await resolveInvite(String(body.token ?? ""));
  if (!invite) {
    return NextResponse.json(
      { ok: false, error: "This invitation has expired or is not valid. Email info@eduplana.org and we will send a new one." },
      { status: 403 },
    );
  }

  // Bots fill the hidden field or submit within a second of loading the page.
  // They are told it worked so they have nothing to adapt to.
  const started = Number(body.t);
  if (String(body.website ?? "").trim() || (started && Date.now() - started < 3000)) {
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await submitNewSchool(
      invite,
      (body.values ?? {}) as Record<string, unknown>,
      (body.contact ?? {}) as Record<string, unknown>,
      body.message,
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("[list-school] submission failed", error);
    return NextResponse.json(
      { ok: false, error: "Something went wrong sending your school. Please try again in a minute." },
      { status: 500 },
    );
  }
}
