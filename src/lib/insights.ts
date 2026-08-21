import "server-only";

import manifest from "@/data/insights.json";

/**
 * The research archive — nine years of education-data work that predates the
 * directory. It is the evidence base behind Eduplana's editorial positions, so
 * it sits in the product rather than on a separate marketing site.
 *
 * `src/data/insights.json` is generated from the source artwork and PDFs and,
 * like the school records, is display-ready: titles are read off the artwork
 * itself because the source filenames ("info12.jpg") carry no meaning.
 */

export type Topic = "Budget" | "Universities" | "States" | "Accountability" | "Access";

export interface Infographic {
  slug: string;
  title: string;
  year: number | null;
  width: number;
  height: number;
  full: string;
  thumb: string;
  topic: Topic;
}

export interface Document {
  slug: string;
  title: string;
  year: number | null;
  bytes: number;
  file: string;
  topic: Topic;
}

const INFOGRAPHICS = manifest.infographics as Infographic[];
const DOCUMENTS = manifest.documents as Document[];

/** Newest first, then alphabetical — undated items sort last. */
function byRecency<T extends { year: number | null; title: string }>(a: T, b: T): number {
  if (a.year !== b.year) return (b.year ?? 0) - (a.year ?? 0);
  return a.title.localeCompare(b.title);
}

export function allInfographics(): Infographic[] {
  return [...INFOGRAPHICS].sort(byRecency);
}

export function allDocuments(): Document[] {
  return [...DOCUMENTS].sort(byRecency);
}

export function infographic(slug: string): Infographic | undefined {
  return INFOGRAPHICS.find((i) => i.slug === slug);
}

export function topics(): Array<{ topic: Topic; count: number }> {
  const counts = new Map<Topic, number>();
  for (const item of [...INFOGRAPHICS, ...DOCUMENTS]) {
    counts.set(item.topic, (counts.get(item.topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * `year` is scraped from the title, so it is the year the *data* refers to and
 * not always a publication date — "Populous nations by 2050" yields 2050. Any
 * span shown to a reader is therefore clamped to years that can actually have
 * been published, and described as coverage rather than as a publishing run.
 */
const FIRST_YEAR = 2006;

export function archiveStats() {
  const thisYear = 2026;
  const years = [...INFOGRAPHICS, ...DOCUMENTS]
    .map((i) => i.year)
    .filter((y): y is number => y != null && y >= FIRST_YEAR && y <= thisYear);
  return {
    infographics: INFOGRAPHICS.length,
    documents: DOCUMENTS.length,
    total: INFOGRAPHICS.length + DOCUMENTS.length,
    topics: topics().length,
    coversFrom: Math.min(...years),
    coversTo: Math.max(...years),
  };
}

export function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
