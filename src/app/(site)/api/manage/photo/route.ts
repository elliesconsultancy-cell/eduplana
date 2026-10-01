import { NextResponse } from "next/server";

import { resolveLink } from "@/lib/outreach/server";
import { storePhoto } from "@/lib/outreach/submit";

/**
 * One photograph from a school's edit form.
 *
 * Uploaded on its own, as soon as it is chosen, rather than with the form: a
 * function accepts at most 4.5 MB per request, and a school adding a dozen
 * photographs would blow through that in one submission. The browser shrinks
 * each image first (components/manage-form.tsx), and the photo only reaches the
 * public page if the submission that includes it is approved.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const access = await resolveLink(String(form.get("token") ?? ""));
    if (!access) return NextResponse.json({ error: "This link has expired." }, { status: 403 });

    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No image was attached." }, { status: 400 });

    const kind = form.get("kind") === "logo" ? "logo" : "photo";
    const stored = await storePhoto(access, String(form.get("school") ?? ""), file, kind);
    return NextResponse.json(stored);
  } catch (error) {
    console.error("[manage] photo upload failed", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    // sharp's own errors describe internals; a school needs to know what to do.
    const readable = /unsupported|corrupt|Input buffer/i.test(message) ? "That image could not be read." : message;
    return NextResponse.json({ error: readable }, { status: 400 });
  }
}
