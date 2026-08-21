/**
 * Descriptions are stored ready to display, so the app only needs to shorten
 * them — never repair them. Anything that normalises a description belongs in
 * whatever writes the data, not here.
 */

const TERMINALS = /[.!?][")'’”]*(?=\s|$)/g;

/**
 * A short version for meta descriptions and social cards.
 *
 * Cuts on a sentence boundary where one falls in range, so the teaser reads as
 * a finished thought rather than a severed one. Card layouts should pass the
 * full description and clamp it in CSS instead: a visual fade says "there is
 * more", where a cut sentence just looks like broken data.
 */
export function summaryTeaser(
  summary: string | null | undefined,
  maxLength = 160,
): string | null {
  if (!summary) return null;

  const flat = summary.replace(/\s+/g, " ").trim();
  if (!flat) return null;
  if (flat.length <= maxLength) return flat;

  const window = flat.slice(0, maxLength + 40);
  let end: number | null = null;
  for (const match of window.matchAll(TERMINALS)) {
    end = match.index + match[0].length;
  }
  if (end != null && end >= maxLength * 0.5) return window.slice(0, end).trim();

  // No usable sentence break — cut on a word and signal the elision.
  const cut = flat.slice(0, maxLength);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[\s,;:]+$/, "")}…`;
}
