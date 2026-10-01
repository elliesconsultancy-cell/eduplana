"use server";

import { redirect } from "next/navigation";

import { optOut, requestLink } from "@/lib/outreach/server";
import { verifyUnsubscribe } from "@/lib/outreach/tokens";

/** "Email me a link." The reply is the same whether or not the address is known. */
export async function requestLinkAction(form: FormData) {
  const email = form.get("email");
  if (typeof email === "string" && email.length <= 160) {
    try {
      await requestLink(email);
    } catch (error) {
      console.error("[manage] could not send a requested link", error);
    }
  }
  redirect("/manage?sent=1");
}

/** The button on the unsubscribe page. */
export async function unsubscribeAction(form: FormData) {
  const email = String(form.get("e") ?? "");
  const signature = String(form.get("s") ?? "");
  if (!email || !verifyUnsubscribe(email, signature)) redirect("/unsubscribe?invalid=1");
  await optOut(email);
  redirect("/unsubscribe?done=1");
}
