import "server-only";

import { createHash } from "node:crypto";
import { getPayload, type Payload } from "payload";
import config from "@payload-config";

import { allSchools } from "@/lib/schools";
import { toSchool, type SchoolDoc } from "@/lib/school-record";
import { SITE_URL } from "@/lib/site";
import type { School } from "@/lib/types";
import {
  DEFAULT_BODY,
  DEFAULT_GENERAL_BODY,
  DEFAULT_GENERAL_SUBJECT,
  DEFAULT_SUBJECT,
} from "@/globals/OutreachSettings";
import {
  complianceFooter,
  fill,
  oneClickUnsubscribeUrl,
  schoolNames,
  sendBatch,
  sendOne,
  toHtml,
  unsubscribeUrl,
  type Message,
} from "./mail";
import { hashToken, newToken } from "./tokens";

/**
 * Outreach: who to email, the links in those emails, and what happens when a
 * school follows one.
 *
 * Which schools exist comes from the directory's own data layer — the bundled
 * snapshot plus recent edits — rather than from a query, so building a send
 * list costs the database nothing. Only outreach's own small tables are read.
 */

const DAY = 24 * 60 * 60 * 1000;
/** Long enough for a busy head teacher to get round to it. */
const OUTREACH_LINK_DAYS = 30;
/** A link a school asked for is meant to be used now. */
const REQUESTED_LINK_DAYS = 2;
/** Requests for a fresh link per address per day, so the form cannot be used to flood an inbox. */
const REQUESTS_PER_DAY = 3;
/** Reminders go once, a week after the first email, to inboxes that never opened it. */
const REMINDER_AFTER_DAYS = 7;

export const db = () => getPayload({ config });

export interface Settings {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  generalSubject: string;
  generalBody: string;
  dailyLimit: number;
}

export async function settings(payload?: Payload): Promise<Settings> {
  const p = payload ?? (await db());
  const s = (await p.findGlobal({ slug: "outreach-settings", overrideAccess: true })) as Partial<Settings>;
  return {
    fromName: s.fromName || "Eduplana",
    fromEmail: s.fromEmail || "info@eduplana.org",
    subject: s.subject || DEFAULT_SUBJECT,
    body: s.body || DEFAULT_BODY,
    generalSubject: s.generalSubject || DEFAULT_GENERAL_SUBJECT,
    generalBody: s.generalBody || DEFAULT_GENERAL_BODY,
    dailyLimit: Math.min(95, Math.max(1, Number(s.dailyLimit) || 80)),
  };
}

const from = (s: Settings) => `${s.fromName.replace(/["<>]/g, "")} <${s.fromEmail}>`;

/* ----------------------------------------------------------------- links -- */

async function issueLink(
  payload: Payload,
  email: string,
  schools: string[],
  purpose: "outreach" | "requested",
  days: number,
): Promise<{ token: string; id: string | number }> {
  const token = newToken();
  const doc = await payload.create({
    collection: "access-links",
    data: {
      tokenHash: hashToken(token),
      email,
      schools,
      purpose,
      expiresAt: new Date(Date.now() + days * DAY).toISOString(),
    },
    overrideAccess: true,
  });
  return { token, id: doc.id };
}

export const manageUrl = (token: string) => `${SITE_URL}/manage/${token}`;

export interface Access {
  token: string;
  email: string;
  schools: string[];
}

/** The listings a token opens, or null if it is unknown or expired. */
export async function resolveLink(token: string): Promise<Access | null> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const payload = await db();
  const { docs } = await payload.find({
    collection: "access-links",
    where: { tokenHash: { equals: hashToken(token) } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const link = docs[0];
  if (!link || Date.parse(String(link.expiresAt)) < Date.now()) return null;
  const schools = Array.isArray(link.schools) ? (link.schools as unknown[]).map(String) : [];
  return { token, email: String(link.email), schools };
}

/**
 * Notes that a school followed its link. Only the first opening is recorded,
 * and only a forward step — a school that has already sent changes in does not
 * go back to "opened" because it looked again.
 */
export async function markOpened(schools: string[]): Promise<void> {
  if (schools.length === 0) return;
  const payload = await db();
  await payload.update({
    collection: "school-contacts",
    where: { and: [{ school: { in: schools } }, { status: { equals: "sent" } }] },
    data: { status: "opened", openedAt: new Date().toISOString() },
    overrideAccess: true,
  });
}

/** The current record, straight from the database: the school is about to edit it. */
export async function loadSchool(id: string): Promise<School | null> {
  const payload = await db();
  try {
    const doc = await payload.findByID({ collection: "schools", id, depth: 0, overrideAccess: true });
    return doc && (doc as unknown as SchoolDoc)._status === "published" ? toSchool(doc as unknown as SchoolDoc) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ recipients -- */

export interface Inbox {
  email: string;
  schools: Array<Pick<School, "id" | "name" | "area" | "state" | "level">>;
}

export type Audience = "new" | "reminder";

export interface Filters {
  state?: string | null;
  level?: string | null;
  audience: Audience;
}

interface ContactRow {
  school: string;
  email: string;
  status: string;
  optedOut: boolean;
  sends: number;
  lastSentAt: string | null;
}

export async function contacts(payload?: Payload): Promise<ContactRow[]> {
  const p = payload ?? (await db());
  const { docs } = await p.find({
    collection: "school-contacts",
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { school: true, email: true, status: true, optedOut: true, sends: true, lastSentAt: true },
  });
  return docs.map((d) => ({
    school: String(d.school),
    email: String(d.email).toLowerCase(),
    status: String(d.status),
    optedOut: Boolean(d.optedOut),
    sends: Number(d.sends ?? 0),
    lastSentAt: (d.lastSentAt as string | null) ?? null,
  }));
}

/** Inboxes matching the filters, each with every listing that uses it. */
export async function recipients(filters: Filters, known?: ContactRow[]): Promise<Inbox[]> {
  const rows = known ?? (await contacts());
  const optedOut = new Set(rows.filter((r) => r.optedOut).map((r) => r.email));
  const byEmail = new Map<string, ContactRow[]>();
  for (const r of rows) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r]);

  // Grouped over the whole directory first, so an inbox shared by a Lagos and
  // an Ogun campus is one email listing both, not two emails.
  const inboxes = new Map<string, Inbox>();
  for (const s of await allSchools()) {
    if (!s.email) continue;
    const email = s.email.toLowerCase();
    const inbox = inboxes.get(email) ?? { email, schools: [] };
    inbox.schools.push({ id: s.id, name: s.name, area: s.area, state: s.state, level: s.level });
    inboxes.set(email, inbox);
  }

  const cutoff = Date.now() - REMINDER_AFTER_DAYS * DAY;
  return [...inboxes.values()]
    .filter((inbox) => !optedOut.has(inbox.email))
    .filter((inbox) =>
      inbox.schools.some(
        (s) => (!filters.state || s.state === filters.state) && (!filters.level || s.level === filters.level),
      ),
    )
    .filter((inbox) => {
      const seen = byEmail.get(inbox.email) ?? [];
      if (filters.audience === "new") return seen.length === 0;
      return (
        seen.length > 0 &&
        seen.every((r) => r.status === "sent" && r.sends < 2) &&
        seen.every((r) => r.lastSentAt && Date.parse(r.lastSentAt) < cutoff)
      );
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}

/**
 * Contact rows for addresses that belong to no listing are keyed by the
 * address itself under this prefix, so they share the table — and its opt-out
 * and "already emailed" checks — with school rows.
 */
const ADDRESS_KEY = "addr:";

/**
 * Emails sent in the last 24 hours. A listing email always carries a freshly
 * issued link, so links count those; general emails carry none and are counted
 * from their contact rows.
 */
export async function sentInLastDay(payload?: Payload): Promise<number> {
  const p = payload ?? (await db());
  const since = new Date(Date.now() - DAY).toISOString();
  const [links, general] = await Promise.all([
    p.count({ collection: "access-links", where: { createdAt: { greater_than: since } }, overrideAccess: true }),
    p.count({
      collection: "school-contacts",
      where: { and: [{ school: { like: ADDRESS_KEY } }, { lastSentAt: { greater_than: since } }] },
      overrideAccess: true,
    }),
  ]);
  return links.totalDocs + general.totalDocs;
}

/* ------------------------------------------------- specific addresses -- */

export type PlanStatus = "listing" | "general" | "sent-before" | "opted-out" | "invalid" | "duplicate";

export interface PlannedAddress {
  email: string;
  status: PlanStatus;
  /** The listings at this address, when it belongs to any. */
  schools: Inbox["schools"];
  lastSentAt: string | null;
}

const VALID = /^[a-z0-9]([a-z0-9._%+-]*[a-z0-9])?@[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
export const MAX_ADDRESSES = 200;

export function splitAddresses(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase().replace(/^mailto:/, "").replace(/^[<"']+|[>"'.]+$/g, ""))
    .filter(Boolean)
    .slice(0, MAX_ADDRESSES);
}

/**
 * What would happen to each pasted address, decided before anything is sent:
 * which listing it belongs to, or that it belongs to none, or why it will be
 * skipped. The page shows this list, and sending works through it unchanged.
 */
export async function planAddresses(raw: string[], includeSent = false, known?: ContactRow[]): Promise<PlannedAddress[]> {
  const rows = known ?? (await contacts());
  const byEmail = new Map<string, ContactRow[]>();
  for (const r of rows) byEmail.set(r.email, [...(byEmail.get(r.email) ?? []), r]);
  const listings = new Map<string, Inbox["schools"]>();
  for (const s of await allSchools()) {
    if (!s.email) continue;
    const e = s.email.toLowerCase();
    listings.set(e, [...(listings.get(e) ?? []), { id: s.id, name: s.name, area: s.area, state: s.state, level: s.level }]);
  }

  const seen = new Set<string>();
  return raw.map((email) => {
    const schools = listings.get(email) ?? [];
    const prior = byEmail.get(email) ?? [];
    const lastSentAt = prior.map((r) => r.lastSentAt).filter(Boolean).sort().pop() ?? null;
    let status: PlanStatus;
    if (!VALID.test(email)) status = "invalid";
    else if (seen.has(email)) status = "duplicate";
    else if (prior.some((r) => r.optedOut)) status = "opted-out";
    else if (lastSentAt && !includeSent) status = "sent-before";
    else status = schools.length ? "listing" : "general";
    seen.add(email);
    return { email, status, schools, lastSentAt };
  });
}

/** Sends the general email to addresses that belong to no listing, and records them. */
export async function sendGeneral(addresses: string[]): Promise<{ sent: number; error?: string }> {
  const payload = await db();
  const s = await settings(payload);
  const remaining = s.dailyLimit - (await sentInLastDay(payload));
  if (remaining <= 0) throw new LimitError(`Today's limit of ${s.dailyLimit} emails has been reached.`);
  const queue = addresses.slice(0, remaining);
  let sent = 0;
  for (let i = 0; i < queue.length; i += 50) {
    const batch = queue.slice(i, i + 50);
    const messages = batch.map((email) => generalMessage(s, email));
    const key = createHash("sha256").update(batch.join(",")).digest("hex");
    try {
      await sendBatch(messages, `general-${new Date().toISOString().slice(0, 10)}-${key}`);
    } catch (error) {
      return { sent, error: error instanceof Error ? error.message : String(error) };
    }
    const now = new Date().toISOString();
    const { docs } = await payload.find({
      collection: "school-contacts",
      where: { school: { in: batch.map((e) => ADDRESS_KEY + e) } },
      pagination: false,
      depth: 0,
      overrideAccess: true,
    });
    const existing = new Map(docs.map((d) => [String(d.school), d]));
    for (const email of batch) {
      const prior = existing.get(ADDRESS_KEY + email);
      if (prior) {
        await payload.update({
          collection: "school-contacts",
          id: prior.id,
          data: { sends: Number(prior.sends ?? 0) + 1, lastSentAt: now },
          overrideAccess: true,
        });
      } else {
        await payload.create({
          collection: "school-contacts",
          data: { school: ADDRESS_KEY + email, name: `${email} (not on Eduplana)`, email, status: "sent", sends: 1, firstSentAt: now, lastSentAt: now },
          overrideAccess: true,
        });
      }
    }
    sent += batch.length;
  }
  return { sent };
}

/** The listings at each of these addresses, for sending the normal outreach email. */
export async function inboxesFor(addresses: string[]): Promise<Inbox[]> {
  const wanted = new Set(addresses);
  const inboxes = new Map<string, Inbox>();
  for (const s of await allSchools()) {
    const e = s.email?.toLowerCase();
    if (!e || !wanted.has(e)) continue;
    const inbox = inboxes.get(e) ?? { email: e, schools: [] };
    inbox.schools.push({ id: s.id, name: s.name, area: s.area, state: s.state, level: s.level });
    inboxes.set(e, inbox);
  }
  return addresses.map((a) => inboxes.get(a)).filter((i): i is Inbox => Boolean(i));
}

export interface RecentSend {
  name: string;
  email: string;
  status: string;
  lastSentAt: string;
  school: string;
}

/** The latest contacts, newest first, for the "Recently sent" list. */
export async function recentSends(limit = 12, payload?: Payload): Promise<RecentSend[]> {
  const p = payload ?? (await db());
  const { docs } = await p.find({
    collection: "school-contacts",
    where: { lastSentAt: { exists: true } },
    sort: "-lastSentAt",
    limit,
    depth: 0,
    overrideAccess: true,
  });
  return docs.map((d) => ({
    name: String(d.name ?? d.email),
    email: String(d.email),
    status: String(d.status),
    lastSentAt: String(d.lastSentAt),
    school: String(d.school),
  }));
}

/* -------------------------------------------------------------- messages -- */

function placeholders(inbox: Inbox, link: string) {
  const first = inbox.schools[0];
  return {
    school: schoolNames(inbox.schools.map((s) => s.name)),
    location: [first?.area, first?.state].filter(Boolean).join(", "),
    link,
  };
}

export function outreachMessage(s: Settings, inbox: Inbox, link: string, to = inbox.email): Message {
  const values = placeholders(inbox, link);
  const unsubscribe = unsubscribeUrl(inbox.email);
  const body = `${fill(s.body, values)}\n\n${complianceFooter(inbox.email, unsubscribe)}`;
  return {
    from: from(s),
    replyTo: s.fromEmail,
    to,
    subject: fill(s.subject, values),
    text: body,
    html: toHtml(body),
    unsubscribeUrl: oneClickUnsubscribeUrl(inbox.email),
  };
}

export function generalMessage(s: Settings, to: string): Message {
  const unsubscribe = unsubscribeUrl(to);
  const footer = [
    "—",
    `You are receiving this because ${to} was given to us as a contact address for a school. ` +
      "If that is not right, or you would rather not hear from us, use the link below.",
    `To stop receiving emails from us: ${unsubscribe}`,
  ].join("\n");
  const body = `${s.generalBody}\n\n${footer}`;
  return {
    from: from(s),
    replyTo: s.fromEmail,
    to,
    subject: s.generalSubject,
    text: body,
    html: toHtml(body),
    unsubscribeUrl: oneClickUnsubscribeUrl(to),
  };
}

/* --------------------------------------------------------------- sending -- */

export class LimitError extends Error {}

/**
 * Sends to `inboxes`, at most the day's remaining allowance, in batches.
 *
 * Each batch issues its links, sends, and only then records the contacts — so
 * a batch Resend refuses leaves no trace of having been sent, and its links are
 * withdrawn. Returns how many emails went out before any failure.
 */
export async function sendOutreach(inboxes: Inbox[]): Promise<{ sent: number; error?: string }> {
  const payload = await db();
  const s = await settings(payload);
  const remaining = s.dailyLimit - (await sentInLastDay(payload));
  if (remaining <= 0) throw new LimitError(`Today's limit of ${s.dailyLimit} emails has been reached.`);

  const queue = inboxes.slice(0, remaining);
  let sent = 0;

  for (let i = 0; i < queue.length; i += 50) {
    const batch = queue.slice(i, i + 50);
    const links = await Promise.all(
      batch.map((inbox) =>
        issueLink(payload, inbox.email, inbox.schools.map((x) => x.id), "outreach", OUTREACH_LINK_DAYS),
      ),
    );
    const messages = batch.map((inbox, n) => outreachMessage(s, inbox, manageUrl(links[n].token)));
    const key = createHash("sha256").update(batch.map((b) => b.email).join(",")).digest("hex");

    try {
      await sendBatch(messages, `outreach-${new Date().toISOString().slice(0, 10)}-${key}`);
    } catch (error) {
      await payload.delete({
        collection: "access-links",
        where: { id: { in: links.map((l) => l.id) } },
        overrideAccess: true,
      });
      return { sent, error: error instanceof Error ? error.message : String(error) };
    }

    await recordSent(payload, batch);
    sent += batch.length;
  }
  return { sent };
}

async function recordSent(payload: Payload, batch: Inbox[]) {
  const now = new Date().toISOString();
  const ids = batch.flatMap((b) => b.schools.map((x) => x.id));
  const { docs } = await payload.find({
    collection: "school-contacts",
    where: { school: { in: ids } },
    pagination: false,
    depth: 0,
    overrideAccess: true,
  });
  const existing = new Map(docs.map((d) => [String(d.school), d]));

  const work = batch.flatMap((inbox) =>
    inbox.schools.map((school) => () => {
      const prior = existing.get(school.id);
      return prior
        ? payload.update({
            collection: "school-contacts",
            id: prior.id,
            data: { sends: Number(prior.sends ?? 0) + 1, lastSentAt: now, email: inbox.email },
            overrideAccess: true,
          })
        : payload.create({
            collection: "school-contacts",
            data: {
              school: school.id,
              name: school.name,
              email: inbox.email,
              status: "sent",
              sends: 1,
              firstSentAt: now,
              lastSentAt: now,
            },
            overrideAccess: true,
          });
    }),
  );
  for (let i = 0; i < work.length; i += 10) await Promise.all(work.slice(i, i + 10).map((run) => run()));
}

/** A real email to the person signed in, with a working link to a sample listing. */
export async function sendTest(to: string, inbox: Inbox): Promise<void> {
  const payload = await db();
  const s = await settings(payload);
  if ((await sentInLastDay(payload)) >= s.dailyLimit) {
    throw new LimitError(`Today's limit of ${s.dailyLimit} emails has been reached.`);
  }
  const link = await issueLink(payload, to, inbox.schools.map((x) => x.id), "requested", 1);
  const message = outreachMessage(s, inbox, manageUrl(link.token), to);
  try {
    await sendOne({ ...message, subject: `[Test] ${message.subject}` });
  } catch (error) {
    // A link whose email never left would still count against the day's limit.
    await payload.delete({ collection: "access-links", id: link.id, overrideAccess: true });
    throw error;
  }
}

/* ----------------------------------------------------- school-requested -- */

/**
 * Emails a fresh link to an address, if listings use it.
 *
 * Says nothing either way to the person asking — the page shows the same
 * message whether or not the address is on a listing — so the form cannot be
 * used to discover which addresses we hold.
 */
export async function requestLink(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

  const schools = (await allSchools()).filter((s) => s.email?.toLowerCase() === email);
  if (schools.length === 0) return;

  const payload = await db();
  const { totalDocs } = await payload.count({
    collection: "access-links",
    where: {
      and: [
        { email: { equals: email } },
        { purpose: { equals: "requested" } },
        { createdAt: { greater_than: new Date(Date.now() - DAY).toISOString() } },
      ],
    },
    overrideAccess: true,
  });
  if (totalDocs >= REQUESTS_PER_DAY) return;

  const s = await settings(payload);
  // A school asking for its link outranks the day's bulk sending, so this
  // checks Resend's own ceiling rather than the outreach allowance.
  if ((await sentInLastDay(payload)) >= 98) return;

  const link = await issueLink(payload, email, schools.map((x) => x.id), "requested", REQUESTED_LINK_DAYS);
  const names = schoolNames(schools.map((x) => x.name));
  const text = [
    "Hello,",
    `Here is your private link to review and update ${names} on Eduplana:`,
    manageUrl(link.token),
    `The link works for ${REQUESTED_LINK_DAYS * 24} hours. If you did not ask for it, you can ignore this email — nothing changes unless someone uses the link.`,
    "Eduplana",
  ].join("\n\n");
  try {
    await sendOne({
      from: from(s),
      replyTo: s.fromEmail,
      to: email,
      subject: `Your link to update ${names} on Eduplana`,
      text,
      html: toHtml(text),
    });
  } catch (error) {
    await payload.delete({ collection: "access-links", id: link.id, overrideAccess: true });
    throw error;
  }
}

/* ------------------------------------------------------------ opting out -- */

export async function optOut(email: string): Promise<void> {
  const payload = await db();
  const address = email.trim().toLowerCase();
  const { docs } = await payload.update({
    collection: "school-contacts",
    where: { email: { equals: address } },
    data: { optedOut: true },
    overrideAccess: true,
  });

  // An address can opt out before it has ever been emailed — from a forwarded
  // message, or the listing page. Record it against each of its listings, so
  // no future send list can include it.
  if (docs.length === 0) {
    const schools = (await allSchools()).filter((s) => s.email?.toLowerCase() === address);
    for (const s of schools) {
      await payload.create({
        collection: "school-contacts",
        data: { school: s.id, name: s.name, email: address, status: "none", optedOut: true, sends: 0 },
        overrideAccess: true,
      });
    }
    // An address on no listing still has to be remembered, or it could be
    // pasted into "Send to specific addresses" again.
    if (schools.length === 0) {
      await payload.create({
        collection: "school-contacts",
        data: { school: ADDRESS_KEY + address, name: `${address} (not on Eduplana)`, email: address, status: "none", optedOut: true, sends: 0 },
        overrideAccess: true,
      });
    }
  }
}
