export type Level = "primary" | "secondary";

export interface FeeBand {
  label: string | null;
  min: number | null;
  max: number | null;
}

/**
 * One exact tuition line a school published, e.g. "Tuition (Primary)" at
 * ₦1,150,000. Far more useful than the coarse band when present — but only
 * about 2.5% of schools publish it.
 */
export interface FeeItem {
  label: string;
  amount: number;
}

export interface GalleryImage {
  full: string;
  thumb: string;
}

export interface School {
  id: string;
  slug: string;
  name: string;
  level: Level;
  tagline: string | null;
  summary: string | null;
  state: string | null;
  area: string | null;
  address: string | null;
  busStop: string | null;
  phone: string | null;
  website: string | null;
  yearFounded: number | null;
  curricula: string[];
  scope: string | null;
  fee: FeeBand;
  /** Exact published tuition lines. Empty for most schools. */
  feeItems: FeeItem[];
  /** Locally stored admission form, when the school offers one. */
  admissionForm: string | null;
  day: boolean;
  boarding: boolean;
  faith: string;
  maxClassSize: number | null;
  scholarship: string | null;
  siblingsDiscount: string | null;
  facilities: string[];
  activities: string[];
  clubs: string[];
  images: { logo: string | null; gallery: GalleryImage[] };
  /**
   * Set by the backend once a human has actually confirmed this school's
   * details. Distinct from the derived career signals in `lib/career.ts`:
   * those say "the school published this", this says "we checked".
   */
  verified: boolean;
}

export interface SearchFilters {
  q?: string;
  state?: string;
  area?: string;
  level?: Level;
  curriculum?: string;
  boarding?: "day" | "boarding" | "both";
  faith?: string;
  feeMax?: number;
  feeMin?: number;
  facility?: string;
  hasPhotos?: boolean;
  /** Only schools clearing the career-signal bar. */
  careerReady?: boolean;
  sort?: SortKey;
}

export type SortKey = "relevance" | "fee-asc" | "fee-desc" | "name" | "photos" | "career";

export interface Facet {
  value: string;
  count: number;
}
