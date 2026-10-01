import type { FeeItem, GalleryImage, School } from "@/lib/types";

/**
 * What a school may change about its own listing.
 *
 * Everything a parent reads, except the three things that identify the record:
 * the name (renaming a listing is how one school would impersonate another),
 * the slug (changing it breaks every link to the page) and the level. The keys
 * are the Payload field names, so an approved change applies as-is.
 *
 * Shared by the public form, the server that checks a submission, and the
 * admin screen that reviews one — no server-only imports here for that reason.
 */
export interface Listing {
  tagline: string | null;
  summary: string | null;
  scope: string | null;
  yearFounded: number | null;
  curricula: string[];
  faith: string;
  state: string | null;
  area: string | null;
  address: string | null;
  busStop: string | null;
  phone: string | null;
  email: string | null;
  admissionsOfficer: string | null;
  admissionsRole: string | null;
  website: string | null;
  fee: { label: string | null; min: number | null; max: number | null };
  feeItems: FeeItem[];
  scholarship: string | null;
  siblingsDiscount: string | null;
  day: boolean;
  boarding: boolean;
  maxClassSize: number | null;
  facilities: string[];
  activities: string[];
  clubs: string[];
  images: { logo: string | null; gallery: GalleryImage[] };
}

export type ListingKey = keyof Listing;

/** In the order the review screen lists them. */
export const LISTING_LABELS: Record<ListingKey, string> = {
  phone: "Phone",
  email: "Email",
  website: "Website",
  admissionsOfficer: "Admissions contact",
  admissionsRole: "Their role",
  state: "State",
  area: "Town or district",
  address: "Address",
  busStop: "Nearest bus stop or landmark",
  tagline: "Strapline",
  summary: "About the school",
  scope: "Stages offered",
  yearFounded: "Year founded",
  curricula: "Curriculum",
  faith: "Faith",
  fee: "Fees per term",
  feeItems: "Itemised fees",
  scholarship: "Scholarships",
  siblingsDiscount: "Sibling discount",
  day: "Day school",
  boarding: "Boarding",
  maxClassSize: "Largest class size",
  facilities: "Facilities",
  activities: "Activities",
  clubs: "Clubs",
  images: "Logo and photographs",
};

export const LISTING_KEYS = Object.keys(LISTING_LABELS) as ListingKey[];

export function toListing(s: School): Listing {
  return {
    tagline: s.tagline,
    summary: s.summary,
    scope: s.scope,
    yearFounded: s.yearFounded,
    curricula: s.curricula,
    faith: s.faith,
    state: s.state,
    area: s.area,
    address: s.address,
    busStop: s.busStop,
    phone: s.phone,
    email: s.email,
    admissionsOfficer: s.admissionsOfficer,
    admissionsRole: s.admissionsRole,
    website: s.website,
    fee: { label: s.fee.label, min: s.fee.min, max: s.fee.max },
    feeItems: s.feeItems,
    scholarship: s.scholarship,
    siblingsDiscount: s.siblingsDiscount,
    day: s.day,
    boarding: s.boarding,
    maxClassSize: s.maxClassSize,
    facilities: s.facilities,
    activities: s.activities,
    clubs: s.clubs,
    images: { logo: s.images.logo, gallery: s.images.gallery },
  };
}

const naira = new Intl.NumberFormat("en-NG");

/** One field's value as a person would read it, for the review screen. */
export function describe(key: ListingKey, value: unknown): string {
  if (value == null || value === "") return "—";
  if (key === "day" || key === "boarding") return value ? "Yes" : "No";
  if (key === "fee") {
    const f = value as Listing["fee"];
    if (f.min == null) return "—";
    return f.max == null ? `₦${naira.format(f.min)}+` : `₦${naira.format(f.min)} – ₦${naira.format(f.max)}`;
  }
  if (key === "feeItems") {
    const items = value as FeeItem[];
    return items.length ? items.map((i) => `${i.label}: ₦${naira.format(i.amount)}`).join("\n") : "—";
  }
  if (key === "images") {
    const i = value as Listing["images"];
    return `${i.logo ? "Logo" : "No logo"}, ${i.gallery.length} photograph${i.gallery.length === 1 ? "" : "s"}`;
  }
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  return String(value);
}
