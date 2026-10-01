import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";

import { SITE_URL } from "@/lib/site";
import { toListing } from "./listing";
import { sendOne, toHtml } from "./mail";
import { diff, normalize, type Problems } from "./normalize";
import { db, loadSchool, settings, type Access } from "./server";
import { putImage } from "./storage";

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
      contactEmail: contact.email ?? access.email,
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
        data: { school: schoolId, name: school.name, email: access.email, status: "submitted", sends: 0, submittedAt: now },
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
export async function storePhoto(
  access: Access,
  schoolId: string,
  file: File,
  kind: "photo" | "logo",
): Promise<{ full: string; thumb: string } | { logo: string }> {
  if (!access.schools.includes(schoolId)) throw new Error("This link does not cover that school.");
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is too large. Use one under 4 MB.");

  const input = Buffer.from(await file.arrayBuffer());
  const base = `/schools/uploads/${schoolId}/${randomUUID()}`;

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
