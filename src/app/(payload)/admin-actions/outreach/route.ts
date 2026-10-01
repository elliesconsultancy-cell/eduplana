import { NextResponse } from "next/server";

import { LimitError, db, recipients, sendOutreach, sendTest, type Audience } from "@/lib/outreach/server";

/**
 * The outreach screen's two buttons: send, and send me a test.
 *
 * A plain form post rather than client code, so the screen works without
 * JavaScript and there is one obvious place where sending happens. The session
 * cookie identifies the person; only admins may send. Posts from any other
 * origin are refused, so a page elsewhere cannot trigger a send on behalf of a
 * signed-in admin who happens to visit it.
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
    return NextResponse.json({ error: "Only admins can send outreach email." }, { status: 403 });
  }

  const form = await request.formData();
  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const audience: Audience = field("audience") === "reminder" ? "reminder" : "new";
  const filters = { audience, state: field("state"), level: field("level") };

  const back = new URL("/admin/outreach", url.origin);
  for (const [k, v] of Object.entries(filters)) if (v) back.searchParams.set(k, v);

  try {
    if (field("action") === "test") {
      const inbox = (await recipients(filters))[0] ?? (await recipients({ audience: "new" }))[0];
      if (!inbox) throw new Error("There is no school to use as a sample.");
      await sendTest(String(user.email), inbox);
      back.searchParams.set("tested", "1");
    } else {
      if (field("confirm") !== "yes") throw new Error("Tick the box to confirm you have checked a test email.");
      const count = Math.max(1, Math.min(95, Number(field("count")) || 0));
      const inboxes = (await recipients(filters)).slice(0, count);
      if (inboxes.length === 0) throw new Error("No inbox matches these filters.");
      const result = await sendOutreach(inboxes);
      back.searchParams.set("sent", String(result.sent));
      if (result.error) back.searchParams.set("error", result.error);
    }
  } catch (error) {
    const message =
      error instanceof LimitError || error instanceof Error ? error.message : "Something went wrong sending.";
    back.searchParams.set("error", message);
  }

  return NextResponse.redirect(back, 303);
}
