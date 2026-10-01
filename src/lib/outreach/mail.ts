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

/* ---------------------------------------------------------------- layout -- */

/**
 * What an email is made of, before it is rendered twice: once as designed HTML
 * and once as plain text for clients that block images or HTML.
 */
export type Block =
  | { kind: "p"; text: string }
  | { kind: "button"; href: string; label: string }
  | { kind: "listing"; schools: Array<{ name: string; place: string; url: string }> };

export interface Footer {
  /** Why the recipient has this email. */
  reason: string;
  unsubscribe: string;
  /** Anything else the footer must say, as plain sentences. */
  extra?: string[];
}

const BRAND = "#2260b7";
const INK = "#101828";
const MUTED = "#667085";
const QUIET = "#8a94a6";
const LINE = "#e9ecf2";
const CANVAS = "#f4f6fa";
const FONT = "Arial, Helvetica, sans-serif";

const linkify = (escaped: string) =>
  escaped.replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${BRAND};text-decoration:underline;">$1</a>`);

function blockHtml(b: Block): string {
  if (b.kind === "button") {
    return (
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;">` +
      `<tr><td style="border-radius:10px;background:${BRAND};">` +
      `<a href="${escape(b.href)}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:bold;line-height:1.2;color:#ffffff;text-decoration:none;border-radius:10px;">${escape(b.label)}</a>` +
      `</td></tr></table>` +
      `<p style="margin:0 0 24px;font-family:${FONT};font-size:12px;line-height:1.6;color:${QUIET};">` +
      `If the button does not work, copy this link into your browser:<br>` +
      `<a href="${escape(b.href)}" style="color:${BRAND};word-break:break-all;">${escape(b.href)}</a></p>`
    );
  }
  if (b.kind === "listing") {
    const rows = b.schools
      .map(
        (s, i) =>
          `<tr><td style="padding:${i ? "14px" : "0"} 0 ${i === b.schools.length - 1 ? "0" : "14px"};${i ? `border-top:1px solid ${LINE};` : ""}">` +
          `<p style="margin:0 0 2px;font-family:${FONT};font-size:15px;font-weight:bold;color:${INK};">${escape(s.name)}</p>` +
          (s.place ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:13px;color:${MUTED};">${escape(s.place)}</p>` : "") +
          `<a href="${escape(s.url)}" style="font-family:${FONT};font-size:13px;font-weight:bold;color:${BRAND};text-decoration:none;">See it as parents do &rarr;</a>` +
          `</td></tr>`,
      )
      .join("");
    return (
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;background:#f7f8fb;border:1px solid ${LINE};border-radius:12px;">` +
      `<tr><td style="padding:18px 20px;">` +
      `<p style="margin:0 0 12px;font-family:${FONT};font-size:12px;font-weight:bold;color:${MUTED};">${
        b.schools.length > 1 ? "Your listings on Eduplana" : "Your listing on Eduplana"
      }</p>` +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>` +
      `</td></tr></table>`
    );
  }
  return `<p style="margin:0 0 18px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">${linkify(
    escape(b.text),
  ).replace(/\n/g, "<br>")}</p>`;
}

function blockText(b: Block): string {
  if (b.kind === "button") return `${b.label}:\n${b.href}`;
  if (b.kind === "listing") {
    const head = b.schools.length > 1 ? "Your listings on Eduplana:" : "Your listing on Eduplana:";
    return [head, ...b.schools.map((s) => `- ${s.name}${s.place ? ` (${s.place})` : ""}: ${s.url}`)].join("\n");
  }
  return b.text;
}

/**
 * The designed email: logo, one white card, a footer. Tables and inline styles
 * because that is what Gmail, Outlook and phone mail apps render consistently;
 * one small image, so the message still reads correctly with images blocked.
 */
export function renderEmail(blocks: Block[], footer: Footer, preheader = ""): { html: string; text: string } {
  const footerHtml = [
    escape(footer.reason),
    ...(footer.extra ?? []).map(escape),
    `<a href="${escape(footer.unsubscribe)}" style="color:${QUIET};text-decoration:underline;">Unsubscribe</a> from Eduplana emails.`,
  ]
    .map((line) => `<p style="margin:0 0 8px;">${line}</p>`)
    .join("");

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only">` +
    `<title>Eduplana</title></head>` +
    `<body style="margin:0;padding:0;background:${CANVAS};">` +
    (preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${CANVAS};">${escape(preheader)}</div>`
      : "") +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};">` +
    `<tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">` +
    `<tr><td style="padding:0 4px 20px;">` +
    `<a href="${SITE_URL}" style="text-decoration:none;"><img src="${SITE_URL}/brand/eduplana-email-logo.png" width="160" height="36" alt="Eduplana" style="display:block;border:0;height:auto;width:160px;font-family:${FONT};font-size:22px;font-weight:bold;color:${BRAND};"></a>` +
    `</td></tr>` +
    `<tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:16px;padding:32px 32px 14px;">` +
    blocks.map(blockHtml).join("") +
    `</td></tr>` +
    `<tr><td style="padding:22px 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${QUIET};">` +
    footerHtml +
    `<p style="margin:12px 0 0;"><a href="${SITE_URL}" style="color:${QUIET};text-decoration:none;font-weight:bold;">Eduplana</a> &middot; Find and compare private schools in Nigeria</p>` +
    `</td></tr></table></td></tr></table></body></html>`;

  const text = [
    ...blocks.map(blockText),
    "—",
    footer.reason,
    ...(footer.extra ?? []),
    `To stop receiving emails from us: ${footer.unsubscribe}`,
  ].join("\n\n");

  return { html, text };
}

/**
 * The footer every outreach email carries, not editable, because what it says
 * is required rather than chosen: why the recipient has this, where the data
 * came from, and how to make it stop.
 */
export function listingFooter(email: string): Footer {
  return {
    reason:
      `You are receiving this because ${email} is listed as the contact address for this school on Eduplana. ` +
      "Our listings are compiled from information schools publish about themselves.",
    extra: ["To have a listing removed, open your private link and choose “Request removal”, or reply to this email."],
    unsubscribe: unsubscribeUrl(email),
  };
}

/**
 * The editor writes plain text with placeholders. Paragraphs become blocks;
 * a paragraph that is only {link} becomes the button and one that is only
 * {listing} becomes the listing panel. If the editor removes {listing}, the
 * panel still goes in just before the button: every school is shown its page.
 */
export function blocksFrom(
  template: string,
  values: Record<string, string>,
  extras: { link?: { href: string; label: string }; listing?: Extract<Block, { kind: "listing" }> } = {},
): Block[] {
  const blocks: Block[] = [];
  let listed = false;
  for (const raw of template.trim().split(/\n{2,}/)) {
    const para = raw.trim();
    if (para === "{listing}" && extras.listing) {
      blocks.push(extras.listing);
      listed = true;
    } else if (para === "{link}" && extras.link) {
      if (!listed && extras.listing) {
        blocks.push(extras.listing);
        listed = true;
      }
      blocks.push({ kind: "button", ...extras.link });
    } else if (para !== "{listing}") {
      blocks.push({ kind: "p", text: fill(para, values) });
    }
  }
  return blocks;
}

/** "Goldenline Schools" for a campus pair, "A and B", or "A, B and 2 more". */
export function schoolNames(names: string[]): string {
  const unique = [
    ...new Set(names.map((n) => n.replace(/\s*\((primary|secondary)\)\s*$/i, "").trim())),
  ];
  if (unique.length <= 2) return unique.join(" and ");
  return `${unique.slice(0, 2).join(", ")} and ${unique.length - 2} more`;
}
