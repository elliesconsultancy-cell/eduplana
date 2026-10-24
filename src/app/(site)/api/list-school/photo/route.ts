import { NextResponse } from "next/server";

import { resolveInvite } from "@/lib/outreach/server";
import { storeInvitePhoto } from "@/lib/outreach/submit";

/**
 * One photograph from the "add your school" form.
 *
 * Uploaded as soon as it is chosen, for the same reason as the listing form:
 * a function takes at most 4.5 MB a request, and a school sending a dozen
 * photographs would exceed that in one go. It needs the invitation, and the
 * photo only reaches the public site if the school is approved.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const invite = await resolveInvite(String(form.get("token") ?? ""));
    if (!invite) return NextResponse.json({ error: "This invitation has expired." }, { status: 403 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No image was attached." }, { status: 400 });

    const kind = form.get("kind") === "logo" ? "logo" : "photo";
    return NextResponse.json(await storeInvitePhoto(invite, file, kind));
  } catch (error) {
    console.error("[list-school] photo upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    const readable = /unsupported|corrupt|Input buffer/i.test(message) ? "That image could not be read." : message;
    return NextResponse.json({ error: readable }, { status: 400 });
  }
}
