import "server-only";

import { ABSENCE_MARKERS, NIGERIAN_STATE_NAMES, validateEmail } from "@/collections/Schools";
import type { FeeItem, GalleryImage } from "@/lib/types";
import { LISTING_KEYS, type Listing, type ListingKey } from "./listing";

/**
 * Turns what a school typed into a listing the directory will accept.
 *
 * Everything from the form is untrusted: it arrives over a public URL, and the
 * only thing standing behind it is a link that may have been forwarded. So each
 * field is rebuilt from scratch here rather than passed through — a key not on
 * the list is dropped, a wrong type is refused, and a photograph path is
 * accepted only if it already belongs to this school or was uploaded for it.
 *
 * Absence markers ("N/A", "not available") become empty rather than errors: a
 * school writing them means "we do not have one", and an empty field already
 * says that honestly on the page.
 */

export type Problems = Partial<Record<ListingKey, string>>;

const MAX_TEXT = 300;
const MAX_LONG = 4000;
const MAX_LIST = 60;
const MAX_ITEM = 80;

const naira = new Intl.NumberFormat("en-NG");

function text(value: unknown, max = MAX_TEXT): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(/\s+/g, (ws) => (ws.includes("\n") ? ws : " ")).trim();
  if (!v || ABSENCE_MARKERS.test(v)) return null;
  return v.slice(0, max);
}

function count(value: unknown): number | null | "bad" {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/[₦,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : "bad";
}

function list(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(/\n|,/) : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const v = text(item, MAX_ITEM);
    if (!v || seen.has(v.toLowerCase())) continue;
    seen.add(v.toLowerCase());
    out.push(v);
  }
  return out.slice(0, MAX_LIST);
}

/** Paths a school may put on its listing: its own existing images, or its uploads. */
function imageAllowed(path: string, schoolId: string, current: Listing["images"]): boolean {
  const existing = new Set([
    current.logo,
    ...current.gallery.flatMap((g) => [g.full, g.thumb]),
  ]);
  if (existing.has(path)) return true;
  const own = `/schools/uploads/${schoolId}/`;
  return path.startsWith(own) && /^[a-z0-9-]+\.webp$/.test(path.slice(own.length));
}

export function normalize(
  raw: Record<string, unknown>,
  schoolId: string,
  current: Listing,
): { listing: Listing; problems: Problems } {
  const problems: Problems = {};

  const phone = text(raw.phone, 40);
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 14) problems.phone = "Enter a full phone number, e.g. 0803 123 4567.";
  }

  const email = text(raw.email, 120)?.toLowerCase() ?? null;
  if (email) {
    const verdict = validateEmail(email);
    if (verdict !== true) problems.email = verdict;
  }

  let website = text(raw.website, 300);
  if (website) {
    if (!/^https?:\/\//i.test(website)) website = `https://${website}`;
    try {
      new URL(website);
    } catch {
      problems.website = "That does not look like a web address.";
    }
  }

  const state = text(raw.state, 40);
  if (state && !(NIGERIAN_STATE_NAMES as readonly string[]).includes(state)) {
    problems.state = "Choose a state from the list.";
  }

  const faith = ["Secular", "Christian", "Islamic"].includes(String(raw.faith)) ? String(raw.faith) : current.faith;

  const year = count(raw.yearFounded);
  if (year === "bad" || (typeof year === "number" && (year < 1800 || year > new Date().getFullYear()))) {
    problems.yearFounded = "Enter the year the school opened, e.g. 1998.";
  }

  const classSize = count(raw.maxClassSize);
  if (classSize === "bad" || (typeof classSize === "number" && classSize > 200)) {
    problems.maxClassSize = "Enter the number of pupils in your largest class.";
  }

  const rawFee = (raw.fee ?? {}) as { min?: unknown; max?: unknown };
  const feeMin = count(rawFee.min);
  const feeMax = count(rawFee.max);
  if (feeMin === "bad" || feeMax === "bad") {
    problems.fee = "Enter fees as numbers in naira, e.g. 450000.";
  } else if (feeMin != null && feeMax != null && feeMax < feeMin) {
    problems.fee = "The upper figure is lower than the starting figure.";
  } else if (feeMin == null && feeMax != null) {
    problems.fee = "Enter a starting figure as well.";
  }
  const min = typeof feeMin === "number" ? feeMin : null;
  const max = typeof feeMax === "number" ? feeMax : null;
  // The band label is written from the numbers when they change, so it can
  // never disagree with them. Unchanged numbers keep the label as published.
  const feeLabel =
    min === current.fee.min && max === current.fee.max
      ? current.fee.label
      : min == null
        ? null
        : max == null
          ? `₦${naira.format(min)}+`
          : `₦${naira.format(min)} – ₦${naira.format(max)}`;

  const feeItems: FeeItem[] = [];
  for (const row of Array.isArray(raw.feeItems) ? raw.feeItems.slice(0, 30) : []) {
    const r = row as { label?: unknown; amount?: unknown };
    const label = text(r.label, 120);
    const amount = count(r.amount);
    if (!label && (amount == null || amount === "bad")) continue;
    if (!label || typeof amount !== "number") {
      problems.feeItems = "Each fee line needs a description and an amount.";
      continue;
    }
    feeItems.push({ label, amount });
  }

  const rawImages = (raw.images ?? {}) as { logo?: unknown; gallery?: unknown };
  const logo = typeof rawImages.logo === "string" && rawImages.logo ? rawImages.logo : null;
  const gallery: GalleryImage[] = [];
  for (const row of Array.isArray(rawImages.gallery) ? rawImages.gallery.slice(0, 24) : []) {
    const g = row as { full?: unknown; thumb?: unknown };
    if (typeof g.full === "string" && typeof g.thumb === "string") gallery.push({ full: g.full, thumb: g.thumb });
  }
  const images = { logo, gallery };
  if (
    (logo && !imageAllowed(logo, schoolId, current.images)) ||
    gallery.some((g) => !imageAllowed(g.full, schoolId, current.images) || !imageAllowed(g.thumb, schoolId, current.images))
  ) {
    problems.images = "One of the photographs could not be verified. Remove it and upload it again.";
  }

  const listing: Listing = {
    tagline: text(raw.tagline, 160),
    summary: text(raw.summary, MAX_LONG),
    scope: text(raw.scope, 160),
    yearFounded: typeof year === "number" ? year : null,
    curricula: list(raw.curricula),
    faith,
    state: problems.state ? null : state,
    area: text(raw.area, 80),
    address: text(raw.address, 400),
    busStop: text(raw.busStop, 160),
    phone,
    email,
    admissionsOfficer: text(raw.admissionsOfficer, 120),
    admissionsRole: text(raw.admissionsRole, 120),
    website,
    fee: { label: feeLabel, min, max },
    feeItems,
    scholarship: text(raw.scholarship, 160),
    siblingsDiscount: text(raw.siblingsDiscount, 160),
    day: Boolean(raw.day),
    boarding: Boolean(raw.boarding),
    maxClassSize: typeof classSize === "number" ? classSize : null,
    facilities: list(raw.facilities),
    activities: list(raw.activities),
    clubs: list(raw.clubs),
    images,
  };

  // A field the request did not mention is unchanged, not cleared. The form
  // always sends every field, but a request that omits one must not be able to
  // wipe it by omission.
  for (const key of LISTING_KEYS) {
    if (!(key in raw)) (listing as unknown as Record<string, unknown>)[key] = current[key];
  }

  return { listing, problems };
}

/** The fields that differ, as `{ changes, before }` keyed by field name. */
export function diff(before: Listing, after: Listing) {
  const changes: Partial<Listing> = {};
  const was: Partial<Listing> = {};
  for (const key of LISTING_KEYS) {
    if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
      (changes as Record<string, unknown>)[key] = after[key];
      (was as Record<string, unknown>)[key] = before[key];
    }
  }
  return { changes, before: was };
}
