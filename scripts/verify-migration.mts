/**
 * Confirm the database faithfully reproduces the JSON records.
 *
 *   npx tsx scripts/verify-migration.mts
 *
 * Counts alone would hide a truncated array or a dropped nested field, so this
 * also re-reads specific records that exercise the awkward parts of the schema:
 * itemised fees, a downloadable form, a full gallery and a long facilities list.
 */
import { getPayload } from "payload";
import { readFileSync } from "node:fs";
import config from "../src/payload.config.ts";
import type { School } from "../src/lib/types.ts";

const source: School[] = [
  ...JSON.parse(readFileSync("src/data/schools.primary.json", "utf8")),
  ...JSON.parse(readFileSync("src/data/schools.secondary.json", "utf8")),
];

const payload = await getPayload({ config });
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

const total = await payload.count({ collection: "schools" });
check("row count matches source", total.totalDocs === source.length,
  `${total.totalDocs} in db vs ${source.length} in json`);

const published = await payload.count({ collection: "schools", where: { _status: { equals: "published" } } });
check("all rows published", published.totalDocs === source.length,
  `${published.totalDocs} published`);

// Records chosen to exercise the parts most likely to break. Each trait must
// resolve to a *different* school: an earlier version of this list picked the
// same record three times over, because one school happened to be the first
// match for fee lines, admission forms and a full gallery at once — which
// looked like four probes but only ever tested two.
const seen = new Set<string>();
const pick = (label: string, fn: (r: School) => boolean) => {
  const hit = source.find((r) => !seen.has(r.id) && fn(r));
  if (hit) seen.add(hit.id);
  else console.log(`  (no unseen record for: ${label})`);
  return hit;
};
const probes = [
  pick("itemised fees", (r) => r.feeItems?.length >= 2),
  pick("downloadable admission form", (r) => Boolean(r.admissionForm)),
  pick("full gallery", (r) => r.images?.gallery?.length === 3),
  pick("boarding + fee band", (r) => r.boarding && r.fee?.min != null),
  pick("no fee data", (r) => r.fee?.min == null && r.fee?.max == null),
  pick("secondary level", (r) => r.level === "secondary" && r.facilities.length > 5),
  // Widest arrays in the set — the most likely place for a truncation bug.
  source.reduce((a, b) => (b.facilities.length > a.facilities.length ? b : a)),
].filter((r): r is School => Boolean(r));

for (const want of probes) {
  const got = (await payload.findByID({ collection: "schools", id: want.id, depth: 0 })) as unknown as School;
  const label = want.name.slice(0, 34).padEnd(34);
  check(`${label} scalars`,
    got.name === want.name && got.slug === want.slug && got.state === want.state && got.level === want.level);
  check(`${label} fee band`,
    (got.fee?.min ?? null) === (want.fee?.min ?? null) && (got.fee?.max ?? null) === (want.fee?.max ?? null));
  check(`${label} feeItems (${want.feeItems?.length ?? 0})`,
    (got.feeItems?.length ?? 0) === (want.feeItems?.length ?? 0));
  check(`${label} gallery (${want.images?.gallery?.length ?? 0})`,
    (got.images?.gallery?.length ?? 0) === (want.images?.gallery?.length ?? 0));
  check(`${label} facilities (${want.facilities.length})`,
    (got.facilities?.length ?? 0) === want.facilities.length);
  check(`${label} admissionForm`, (got.admissionForm ?? null) === (want.admissionForm ?? null));
}

// Every slug must survive, or public URLs break.
const slugs = new Set<string>();
let page = 1;
for (;;) {
  const res = await payload.find({ collection: "schools", limit: 1000, page, depth: 0, select: { slug: true } });
  res.docs.forEach((d) => slugs.add(String(d.slug)));
  if (!res.hasNextPage) break;
  page += 1;
}
const missing = source.filter((r) => !slugs.has(r.slug));
check("every source slug present", missing.length === 0,
  missing.length ? `missing ${missing.length}, e.g. ${missing[0].slug}` : `${slugs.size} distinct slugs`);

console.log(failures ? `\n${failures} CHECK(S) FAILED` : "\nall checks passed");
process.exit(failures ? 1 : 0);
