/**
 * Move the school records from JSON into Postgres.
 *
 *   npx tsx scripts/migrate-schools.mts [--limit N] [--dry-run]
 *
 * Idempotent: records are matched on their existing `id`, so a re-run updates
 * rather than duplicates and an interrupted run can simply be repeated.
 *
 * Uses Payload's Local API rather than raw SQL so field validation, array
 * tables and draft status are all handled the way the admin panel expects.
 * The JSON files are left untouched — they remain the rollback until the
 * database has been running long enough to trust.
 */
import { getPayload } from "payload";
import { readFileSync } from "node:fs";
import config from "../src/payload.config.ts";
import type { FeeItem, GalleryImage, School } from "../src/lib/types.ts";
import { NIGERIAN_STATE_NAMES } from "../src/collections/Schools.ts";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitArg = args.indexOf("--limit");
const limit = limitArg !== -1 ? Number(args[limitArg + 1]) : Infinity;
/** Neon's pooled connection allows plenty, but politeness costs nothing. */
const CONCURRENCY = 8;

/**
 * The collection constrains faith to three values; the JSON type is a plain
 * string. Narrow with a check rather than a cast, so an unexpected value falls
 * back to the schema's own default instead of failing the whole record.
 */
type StateName = (typeof NIGERIAN_STATE_NAMES)[number];
/** The collection accepts only the 37 official names; anything else is dropped
 *  rather than guessed at, and shows up as a blank state in the admin. */
const toState = (value: string | null | undefined): StateName | null =>
  (NIGERIAN_STATE_NAMES as readonly string[]).includes(value ?? "")
    ? (value as StateName)
    : null;

const FAITHS = ["Secular", "Christian", "Islamic"] as const;
type Faith = (typeof FAITHS)[number];
const toFaith = (value: string | null | undefined): Faith =>
  (FAITHS as readonly string[]).includes(value ?? "") ? (value as Faith) : "Secular";

function toPayload(r: School) {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    level: r.level,
    tagline: r.tagline ?? null,
    summary: r.summary ?? null,
    scope: r.scope ?? null,
    yearFounded: r.yearFounded ?? null,
    curricula: r.curricula ?? [],
    faith: toFaith(r.faith),
    state: toState(r.state),
    area: r.area ?? null,
    address: r.address ?? null,
    busStop: r.busStop ?? null,
    phone: r.phone ?? null,
    website: r.website ?? null,
    fee: {
      label: r.fee?.label ?? null,
      min: r.fee?.min ?? null,
      max: r.fee?.max ?? null,
    },
    feeItems: (r.feeItems ?? []).map((f: FeeItem) => ({ label: f.label, amount: f.amount })),
    scholarship: r.scholarship ?? null,
    siblingsDiscount: r.siblingsDiscount ?? null,
    admissionForm: r.admissionForm ?? null,
    day: Boolean(r.day),
    boarding: Boolean(r.boarding),
    maxClassSize: r.maxClassSize ?? null,
    facilities: r.facilities ?? [],
    activities: r.activities ?? [],
    clubs: r.clubs ?? [],
    images: {
      logo: r.images?.logo ?? null,
      gallery: (r.images?.gallery ?? []).map((g: GalleryImage) => ({ full: g.full, thumb: g.thumb })),
    },
    verified: Boolean(r.verified),
    // Drafts are on, so records must be published to be publicly readable.
    _status: "published" as const,
  };
}

const records: School[] = [
  ...JSON.parse(readFileSync("src/data/schools.primary.json", "utf8")),
  ...JSON.parse(readFileSync("src/data/schools.secondary.json", "utf8")),
].slice(0, limit);

console.log(`source records: ${records.length}`);
if (dryRun) {
  console.log("dry run — sample payload:");
  console.log(JSON.stringify(toPayload(records[0]), null, 1).slice(0, 900));
  process.exit(0);
}

const payload = await getPayload({ config });

// One query to learn what already exists, rather than a lookup per record.
const existing = new Set<string>();
{
  let page = 1;
  for (;;) {
    const res = await payload.find({
      collection: "schools", limit: 1000, page, depth: 0,
      draft: true, pagination: true, select: { id: true },
    });
    res.docs.forEach((d) => existing.add(String(d.id)));
    if (!res.hasNextPage) break;
    page += 1;
  }
}
console.log(`already in database: ${existing.size}`);

let created = 0, updated = 0, failed = 0;
const failures: Array<{ id: string; error: string }> = [];
const started = Date.now();

async function handle(r: School) {
  const data = toPayload(r);
  try {
    if (existing.has(r.id)) {
      await payload.update({ collection: "schools", id: r.id, data, draft: false, overrideAccess: true });
      updated += 1;
    } else {
      await payload.create({ collection: "schools", data, draft: false, overrideAccess: true });
      created += 1;
    }
  } catch (e) {
    failed += 1;
    if (failures.length < 10) failures.push({ id: r.id, error: (e as Error).message.slice(0, 160) });
  }
}

for (let i = 0; i < records.length; i += CONCURRENCY) {
  await Promise.all(records.slice(i, i + CONCURRENCY).map(handle));
  const done = created + updated + failed;
  if (done % 200 < CONCURRENCY || done === records.length) {
    const rate = done / ((Date.now() - started) / 1000);
    const eta = Math.round((records.length - done) / rate);
    process.stdout.write(
      `  ${done}/${records.length}  created:${created} updated:${updated} failed:${failed}` +
      `  ${rate.toFixed(1)}/s  eta ${Math.floor(eta / 60)}m${eta % 60}s\n`,
    );
  }
}

console.log(`\ndone in ${Math.round((Date.now() - started) / 1000)}s — created ${created}, updated ${updated}, failed ${failed}`);
if (failures.length) {
  console.log("first failures:");
  failures.forEach((f) => console.log(`  ${f.id}: ${f.error}`));
}
process.exit(failed > 0 ? 1 : 0);
