import "server-only";

import { SITE_URL } from "@/lib/site";
import { unsubscribeSignature } from "./tokens";

/**
 * Sending, through Resend's HTTP API.
 *
 * Plain `fetch` rather than the SDK: two endpoints are not worth a dependency.
 * The domain is verified in Resend with DKIM on `resend._domainkey` and a
 * bounce subdomain, so mail from any `@eduplana.org` address is authenticated.
 * Inbound mail is a separate system (ImprovMX) and is untouched by this.
 */

export interface Message {
  to: string;
  subject: string;
  text: string;
  html: string;
  from: string;
  replyTo?: string;
  /** For bulk mail: the one-click unsubscribe Gmail and Yahoo now require. */
  unsubscribeUrl?: string;
}

export class MailError extends Error {}

function apiKey(): string {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new MailError("RESEND_API_KEY is not set, so email cannot be sent.");
  return key;
}

function toResend(m: Message) {
  return {
    from: m.from,
    to: [m.to],
    subject: m.subject,
    text: m.text,
    html: m.html,
    ...(m.replyTo ? { reply_to: m.replyTo } : {}),
    ...(m.unsubscribeUrl
      ? {
          headers: {
            "List-Unsubscribe": `<${m.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }
      : {}),
  };
}

async function post(path: string, body: unknown, idempotencyKey?: string) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new MailError(`Resend refused the message (${res.status}): ${detail.slice(0, 300)}`);
  }
}

export async function sendOne(message: Message): Promise<void> {
  await post("/emails", toResend(message));
}

/**
 * Up to 100 messages in one request. The idempotency key means a retried
 * request — a double click, a timeout that actually succeeded — cannot send
 * the same batch twice.
 */
export async function sendBatch(messages: Message[], idempotencyKey: string): Promise<void> {
  if (messages.length === 0) return;
  if (messages.length > 100) throw new MailError("A batch holds at most 100 messages.");
  await post("/emails/batch", messages.map(toResend), idempotencyKey);
}

/* ------------------------------------------------------------- templates -- */

const unsubscribeQuery = (email: string) =>
  `e=${encodeURIComponent(email.trim().toLowerCase())}&s=${unsubscribeSignature(email)}`;

/**
 * Two addresses for one action. The link in the footer opens a page with a
 * button, because mail scanners follow links on their own and must not be able
 * to unsubscribe anyone. The header address is the one-click endpoint Gmail and
 * Yahoo post to from their own "Unsubscribe" button.
 */
export const unsubscribeUrl = (email: string) => `${SITE_URL}/unsubscribe?${unsubscribeQuery(email)}`;
export const oneClickUnsubscribeUrl = (email: string) =>
  `${SITE_URL}/api/unsubscribe?${unsubscribeQuery(email)}`;

/**
 * Fill `{school}`, `{location}` and `{link}` in an editor-written template.
 * Unknown placeholders are left as typed, so a typo shows up in the test send
 * rather than vanishing.
 */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Plain text in, simple HTML out: blank lines become paragraphs, single line
 * breaks stay line breaks, and URLs become links. Deliberately no styling
 * beyond that — a cold email that looks like a newsletter reads as marketing,
 * and plain mail is what lands in the primary inbox.
 */
export function toHtml(text: string): string {
  const paragraphs = text
    .trim()
    .split(/\n{2,}/)
    .map((block) =>
      escape(block)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
        .replace(/\n/g, "<br>"),
    )
    .map((p) => `<p style="margin:0 0 16px">${p}</p>`)
    .join("");
  return (
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#121d2b;max-width:600px">` +
    `${paragraphs}</div>`
  );
}

/**
 * Appended to every outreach email and not editable, because what it says is
 * required rather than chosen: why the recipient has this, where the data came
 * from, and how to make it stop.
 */
export function complianceFooter(email: string, unsubscribe: string): string {
  return [
    "—",
    `You are receiving this because ${email} is listed as the contact address for this school on Eduplana. ` +
      "Our listings are compiled from information schools publish about themselves.",
    `To stop receiving emails from us: ${unsubscribe}`,
    "To have a listing removed, open your private link above and choose “Request removal”, or reply to this email.",
  ].join("\n");
}

/** "Goldenline Schools" for a campus pair, "A and B", or "A, B and 2 more". */
export function schoolNames(names: string[]): string {
  const unique = [
    ...new Set(names.map((n) => n.replace(/\s*\((primary|secondary)\)\s*$/i, "").trim())),
  ];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique.slice(0, 2).join(", ")} and ${unique.length - 2} more`;
}
