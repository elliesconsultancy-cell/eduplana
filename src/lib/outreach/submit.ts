import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { SITE_URL } from "@/lib/site";
import { EMPTY_LISTING, toListing } from "./listing";
import { allSchools } from "@/lib/schools";
import { sendOne, toHtml } from "./mail";
import { diff, normalize, type Problems } from "./normalize";
import { db, loadSchool, settings, type Access, type Invite } from "./server";
import { putImage } from "./storage";
import { hashToken } from "./tokens";

/**
 * What happens when a school sends its listing back.
 *
 * The access check is repeated here rather than trusted from the page: the
 * school id arrives in the request body, and a link for one school must not be
 * usable to submit against another by editing that id.
 */

export type Kind = "update" | "confirm" | "removal";

export interface Contact {
  name: string;
  role: string;
  email: string | null;
}

export type SubmitResult =
  | { ok: true; kind: Kind; changed: number }
  | { ok: false; problems?: Problems & { contact?: string; message?: string }; error?: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function submitListing(
  access: Access,
  schoolId: string,
  kind: Kind,
  values: Record<string, unknown>,
  rawContact: Record<string, unknown>,
  rawMessage: unknown,
): Promise<SubmitResult> {
  if (!access.schools.includes(schoolId)) return { ok: false, error: "This link does not cover that school." };

  const school = await loadSchool(schoolId);
  if (!school) return { ok: false, error: "That listing is no longer available." };

  const contact: Contact = {
    name: clean(rawContact.name, 120),
    role: clean(rawContact.role, 120),
    email: clean(rawContact.email, 160).toLowerCase() || null,
  };
  const message = clean(rawMessage, 2000) || null;
  if (!contact.name || !contact.role) {
    return { ok: false, problems: { contact: "Tell us your name and your role at the school." } };
  }
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    return { ok: false, problems: { contact: "That email address does not look right." } };
  }
  if (kind === "removal" && !message) {
    return { ok: false, problems: { message: "Tell us briefly why the listing should be removed." } };
  }

  const current = toListing(school);
  let changes = {};
  let before = {};
  let finalKind: Kind = kind;
  if (kind === "update") {
    const { listing, problems } = normalize(values, schoolId, current);
    if (Object.keys(problems).length > 0) return { ok: false, problems };
    ({ changes, before } = diff(current, listing));
    // Saving without changing anything is a confirmation, and reads as one.
    if (Object.keys(changes).length === 0) finalKind = "confirm";
  }

  const payload = await db();

  // One open submission per school: a newer one replaces the older, so the
  // reviewer never approves an outdated set of changes on top of a newer one.
  await payload.update({
    collection: "school-submissions",
    where: { and: [{ school: { equals: schoolId } }, { status: { equals: "pending" } }] },
    data: { status: "superseded" },
    overrideAccess: true,
  });

  const submission = await payload.create({
    collection: "school-submissions",
    data: {
      school: schoolId,
      schoolName: school.name,
      schoolSlug: school.slug,
      kind: finalKind,
      status: "pending",
      contactName: contact.name,
      contactRole: contact.role,
      contactEmail: contact.email ?? (access.email || null),
      message,
      changes,
      before,
    },
    overrideAccess: true,
  });

  const now = new Date().toISOString();
  const { docs: updated } = await payload.update({
    collection: "school-contacts",
    where: {
      and: [{ school: { equals: schoolId } }, { status: { in: ["none", "sent", "opened"] } }],
    },
    data: { status: "submitted", submittedAt: now },
    overrideAccess: true,
  });
  if (updated.length === 0) {
    const { totalDocs } = await payload.count({
      collection: "school-contacts",
      where: { school: { equals: schoolId } },
      overrideAccess: true,
    });
    // A school that found us through "email me a link" has no row yet.
    if (totalDocs === 0) {
      await payload.create({
        collection: "school-contacts",
        data: { school: schoolId, name: school.name, email: access.email || contact.email || school.email || "(not given)", status: "submitted", sends: 0, submittedAt: now },
        overrideAccess: true,
      });
    }
  }

  // Tell the team. A failure here must not fail the school's submission — it
  // is saved, and it shows in the admin regardless.
  try {
    const s = await settings(payload);
    const what =
      finalKind === "removal"
        ? "asked to be removed"
        : finalKind === "confirm"
          ? "confirmed its listing is correct"
          : `sent in ${Object.keys(changes).length} change${Object.keys(changes).length === 1 ? "" : "s"}`;
    const text = [
      `${school.name} ${what}.`,
      `From: ${contact.name}, ${contact.role}${contact.email ? ` (${contact.email})` : ""}`,
      ...(message ? [`Their note: ${message}`] : []),
      `Review it: ${SITE_URL}/admin/collections/school-submissions/${submission.id}`,
    ].join("\n\n");
    await sendOne({
      from: `Eduplana <${s.fromEmail}>`,
      to: s.fromEmail,
      subject: `Listing update: ${school.name}`,
      text,
      html: toHtml(text),
    });
  } catch (error) {
    console.error("[outreach] could not send the review notification", error);
  }

  return { ok: true, kind: finalKind, changed: Object.keys(changes).length };
}

/* ---------------------------------------------------------------- photos -- */

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Re-encodes an upload before storing it.
 *
 * Every photograph is decoded and written out again as WebP, which strips
 * whatever else the file carried — camera location in its metadata, or a file
 * that only claims to be an image. Sizes match the existing pipeline: 1600px
 * for the gallery, 480x320 thumbnails, and a 400px logo.
 */
async function encodeAndStore(
  folder: string,
  file: File,
  kind: "photo" | "logo",
): Promise<{ full: string; thumb: string } | { logo: string }> {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is too large. Use one under 4 MB.");

  const input = Buffer.from(await file.arrayBuffer());
  const base = `/schools/uploads/${folder}/${randomUUID()}`;

  if (kind === "logo") {
    const logo = await sharp(input)
      .rotate()
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    return { logo: await putImage(`${base}.webp`, logo) };
  }

  const image = sharp(input).rotate();
  const [full, thumb] = await Promise.all([
    image.clone().resize(1600, 1600, { fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize(480, 320, { fit: "cover" }).webp({ quality: 75 }).toBuffer(),
  ]);
  const [fullPath, thumbPath] = await Promise.all([
    putImage(`${base}.webp`, full),
    putImage(`${base}-thumb.webp`, thumb),
  ]);
  return { full: fullPath, thumb: thumbPath };
}

export async function storePhoto(
  access: Access,
  schoolId: string,
  file: File,
  kind: "photo" | "logo",
): Promise<{ full: string; thumb: string } | { logo: string }> {
  if (!access.schools.includes(schoolId)) throw new Error("This link does not cover that school.");
  return encodeAndStore(schoolId, file, kind);
}

/**
 * The folder a school's photographs go in before it has an id of its own.
 * Derived from the invitation, so only that invitation's uploads can be
 * attached to the submission it makes.
 */
export const inviteFolder = (invite: Invite) => `invite-${hashToken(invite.token).slice(0, 16)}`;

/** A photograph from the "add your school" form, stored against the invitation. */
export async function storeInvitePhoto(
  invite: Invite,
  file: File,
  kind: "photo" | "logo",
): Promise<{ full: string; thumb: string } | { logo: string }> {
  return encodeAndStore(inviteFolder(invite), file, kind);
}

/* ------------------------------------------------------- a school not listed -- */

export type NewSchoolResult =
  | { ok: true }
  | { ok: false; problems?: Problems & { name?: string; level?: string; contact?: string }; error?: string };

/** Submissions a single contact address may send in a day, so the form cannot be used to flood the queue. */
const NEW_PER_DAY = 3;
/** Photographs a new school may send with its first submission. */
const MAX_NEW_PHOTOS = 12;

const simplify = (name: string) =>
  name
    .toLowerCase()
    .replace(/\((primary|secondary)\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * A school that is not in the directory, invited to be added.
 *
 * Only reachable with an invitation link (see the route), so a stranger cannot
 * send schools in. Nothing here publishes anything. The submission waits in the same review
 * queue as corrections, and approving it is what creates the listing, so a
 * stranger filling in a public form cannot put a page on the site. The listing
 * it creates is not verified: nobody has yet shown that the sender speaks for
 * the school.
 */
export async function submitNewSchool(
  invite: Invite,
  values: Record<string, unknown>,
  rawContact: Record<string, unknown>,
  rawMessage: unknown,
): Promise<NewSchoolResult> {
  const contact: Contact = {
    name: clean(rawContact.name, 120),
    role: clean(rawContact.role, 120),
    email: clean(rawContact.email, 160).toLowerCase() || null,
  };
  if (!contact.name || !contact.role) {
    return { ok: false, problems: { contact: "Tell us your name and your role at the school." } };
  }
  if (!contact.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    return { ok: false, problems: { contact: "Enter an email address we can reach you on." } };
  }

  const name = clean(values.name, 160);
  const level = values.level === "primary" || values.level === "secondary" ? values.level : null;
  const problems: NonNullable<Extract<NewSchoolResult, { ok: false }>["problems"]> = {};
  if (name.length < 3) problems.name = "Enter the school's full name.";
  if (!level) problems.level = "Choose primary or secondary. A school with both can be added once for each.";

  const { listing, problems: listingProblems } = normalize(values, inviteFolder(invite), EMPTY_LISTING);
  listing.images.gallery = listing.images.gallery.slice(0, MAX_NEW_PHOTOS);
  Object.assign(problems, listingProblems);
  if (!listing.state && !problems.state) problems.state = "Choose the school's state.";
  if (!listing.area && !problems.area) problems.area = "Enter the town or district.";
  if (!listing.address && !problems.address) problems.address = "Enter the school's address.";
  if (Object.keys(problems).length > 0) return { ok: false, problems };

  // Already in the directory? Then the right route is the private link, which
  // proves the sender is the school. Asking again here would make a duplicate.
  const key = simplify(name);
  const existing = (await allSchools()).find(
    (s) => simplify(s.name) === key && (s.state ?? "").toLowerCase() === (listing.state ?? "").toLowerCase(),
  );
  if (existing) {
    return {
      ok: false,
      problems: {
        name: `${existing.name} is already on Eduplana. To update it, request your private link at eduplana.org/manage.`,
      },
    };
  }

  const payload = await db();
  const { totalDocs } = await payload.count({
    collection: "school-submissions",
    where: {
      and: [
        { kind: { equals: "new" } },
        { contactEmail: { equals: contact.email } },
        { createdAt: { greater_than: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() } },
      ],
    },
    overrideAccess: true,
  });
  if (totalDocs >= NEW_PER_DAY) {
    return { ok: false, error: "You have sent several schools today. We will review them, and you can send more tomorrow." };
  }

  const message = clean(rawMessage, 2000) || null;
  await payload.update({
    collection: "access-links",
    where: { tokenHash: { equals: hashToken(invite.token) } },
    data: { lastUsedAt: new Date().toISOString() },
    overrideAccess: true,
  });
  const submission = await payload.create({
    collection: "school-submissions",
    data: {
      school: `new-${randomUUID()}`,
      schoolName: name,
      kind: "new",
      status: "pending",
      contactName: contact.name,
      contactRole: contact.role,
      contactEmail: contact.email,
      message,
      changes: { name, level, ...listing },
      before: {},
    },
    overrideAccess: true,
  });

  try {
    const s = await settings(payload);
    const text = [
      `${name} (${level}) asked to be added to Eduplana.`,
      `From: ${contact.name}, ${contact.role} (${contact.email})`,
      ...(message ? [`Their note: ${message}`] : []),
      `Review it: ${SITE_URL}/admin/collections/school-submissions/${submission.id}`,
    ].join("\n\n");
    await sendOne({
      from: `Eduplana <${s.fromEmail}>`,
      to: s.fromEmail,
      subject: `New school to review: ${name}`,
      text,
      html: toHtml(text),
    });
  } catch (error) {
    console.error("[outreach] could not send the review notification", error);
  }

  return { ok: true };
}
