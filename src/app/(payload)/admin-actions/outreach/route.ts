import { NextResponse } from "next/server";

import {
  LimitError,
  db,
  generalMessage,
  inboxesFor,
  planAddresses,
  recipients,
  sendGeneral,
  sendOutreach,
  sendTest,
  settings,
  splitAddresses,
  type Audience,
} from "@/lib/outreach/server";
import { sendOne } from "@/lib/outreach/mail";

/**
 * Every button on the outreach screen: send to the previewed schools, send to
 * pasted addresses, and the two test sends.
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

  const action = field("action");
  try {
    if (action === "test") {
      const inbox = (await recipients(filters))[0] ?? (await recipients({ audience: "new" }))[0];
      if (!inbox) throw new Error("There is no school to use as a sample.");
      await sendTest(String(user.email), inbox);
      back.searchParams.set("tested", "1");
    } else if (action === "test-general") {
      const s = await settings(payload);
      const m = generalMessage(s, String(user.email));
      await sendOne({ ...m, subject: `[Test] ${m.subject}` });
      back.searchParams.set("tested", "general");
      back.searchParams.set("tab", "addresses");
    } else if (action === "send") {
      if (field("confirm") !== "yes") throw new Error("Tick the box to confirm you have checked a test email.");
      // Exactly the inboxes the preview listed — re-checked against the
      // filters now, so one emailed in another tab since is not emailed twice.
      const listed = splitAddresses(field("emails") ?? "");
      const eligible = new Map((await recipients(filters)).map((i) => [i.email, i]));
      const inboxes = listed.map((e) => eligible.get(e)).filter((i): i is NonNullable<typeof i> => Boolean(i));
      if (inboxes.length === 0) throw new Error("None of the previewed schools can be emailed any more. Preview again.");
      const result = await sendOutreach(inboxes);
      back.searchParams.set("sent", String(result.sent));
      back.searchParams.set("of", String(inboxes.length));
      if (result.error) back.searchParams.set("error", result.error);
    } else if (action === "send-addresses") {
      back.searchParams.set("tab", "addresses");
      if (field("confirm") !== "yes") throw new Error("Tick the box to confirm you have checked the list.");
      const plan = await planAddresses(splitAddresses(field("addresses") ?? ""), field("includeSent") === "yes");
      const listings = await inboxesFor(plan.filter((p) => p.status === "listing").map((p) => p.email));
      const general = plan.filter((p) => p.status === "general").map((p) => p.email);
      if (listings.length + general.length === 0) throw new Error("No address on the list can be emailed.");
      let sent = 0;
      let error: string | undefined;
      if (listings.length) {
        const r = await sendOutreach(listings);
        sent += r.sent;
        error = r.error;
      }
      if (general.length && !error) {
        try {
          const r = await sendGeneral(general);
          sent += r.sent;
          error = r.error;
        } catch (e) {
          error = e instanceof Error ? e.message : String(e);
        }
      }
      back.searchParams.set("sent", String(sent));
      back.searchParams.set("of", String(listings.length + general.length));
      if (error) back.searchParams.set("error", error);
    } else {
      throw new Error("Unknown action.");
    }
  } catch (error) {
    const message =
      error instanceof LimitError || error instanceof Error ? error.message : "Something went wrong sending.";
    back.searchParams.set("error", message);
  }

  return NextResponse.redirect(back, 303);
}
