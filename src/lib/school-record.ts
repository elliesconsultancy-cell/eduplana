import type { FeeItem, GalleryImage, School } from "./types";

/**
 * Turn a Payload document into the domain record the site renders.
 *
 * Shared by the data layer and the snapshot script, so the bundled snapshot and
 * a live read can never disagree about shape. Deliberately free of
 * `server-only` and Next imports for that reason: the script runs outside Next.
 *
 * Payload returns array rows with an extra `id`, and `_status` alongside the
 * document. Narrowing here rather than casting keeps the domain type honest
 * about what the rest of the app is allowed to assume.
 */
export type SchoolDoc = Record<string, unknown>;

export function toSchool(doc: SchoolDoc): School {
  const images = (doc.images ?? {}) as { logo?: string | null; gallery?: unknown[] };
  const fee = (doc.fee ?? {}) as { label?: string | null; min?: number | null; max?: number | null };
  const list = (value: unknown): string[] => (Array.isArray(value) ? (value as string[]) : []);

  return {
    id: String(doc.id),
    slug: String(doc.slug),
    name: String(doc.name),
    level: doc.level as School["level"],
    tagline: (doc.tagline as string | null) ?? null,
    summary: (doc.summary as string | null) ?? null,
    state: (doc.state as string | null) ?? null,
    area: (doc.area as string | null) ?? null,
    address: (doc.address as string | null) ?? null,
    busStop: (doc.busStop as string | null) ?? null,
    phone: (doc.phone as string | null) ?? null,
    email: (doc.email as string | null) ?? null,
    admissionsOfficer: (doc.admissionsOfficer as string | null) ?? null,
    admissionsRole: (doc.admissionsRole as string | null) ?? null,
    website: (doc.website as string | null) ?? null,
    yearFounded: (doc.yearFounded as number | null) ?? null,
    curricula: list(doc.curricula),
    scope: (doc.scope as string | null) ?? null,
    fee: { label: fee.label ?? null, min: fee.min ?? null, max: fee.max ?? null },
    feeItems: (Array.isArray(doc.feeItems) ? doc.feeItems : []).map((row) => {
      const r = row as { label?: string; amount?: number };
      return { label: String(r.label ?? ""), amount: Number(r.amount ?? 0) } satisfies FeeItem;
    }),
    admissionForm: (doc.admissionForm as string | null) ?? null,
    day: Boolean(doc.day),
    boarding: Boolean(doc.boarding),
    faith: (doc.faith as string) ?? "Secular",
    maxClassSize: (doc.maxClassSize as number | null) ?? null,
    scholarship: (doc.scholarship as string | null) ?? null,
    siblingsDiscount: (doc.siblingsDiscount as string | null) ?? null,
    facilities: list(doc.facilities),
    activities: list(doc.activities),
    clubs: list(doc.clubs),
    images: {
      logo: images.logo ?? null,
      gallery: (images.gallery ?? []).map((row) => {
        const g = row as { full?: string; thumb?: string };
        return { full: String(g.full ?? ""), thumb: String(g.thumb ?? "") } satisfies GalleryImage;
      }),
    },
    verified: Boolean(doc.verified),
    featured: Boolean(doc.featured),
  };
}
