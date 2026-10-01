/**
 * Write the published directory to src/data/schools.snapshot.json.
 *
 *   NODE_ENV=production npx tsx scripts/snapshot-schools.mts
 *
 * The snapshot ships inside the deployment, so the site starts from it and asks
 * the database only for what changed after `syncedAt`. Run this after a bulk
 * import, or whenever the admin shows a large backlog of edits, then commit and
 * deploy — the change set the site has to fetch goes back to empty.
 *
 * NODE_ENV=production stops Payload's dev-mode schema push from running against
 * the live database as a side effect of a read.
 */
import { getPayload } from "payload";
import { writeFileSync } from "node:fs";
import config from "../src/payload.config.ts";
import { toSchool, type SchoolDoc } from "../src/lib/school-record.ts";

const payload = await getPayload({ config });

// Unfiltered on status: drafts are left out of the snapshot below, but their
// timestamps still count towards `syncedAt` so nothing saved before this run is
// fetched again as a change.
const { docs } = await payload.find({
  collection: "schools",
  pagination: false,
  depth: 0,
  overrideAccess: true,
});

const published = docs.filter((doc) => (doc as unknown as SchoolDoc)._status === "published");
const syncedAt = docs.reduce(
  (latest, doc) => (String(doc.updatedAt) > latest ? String(doc.updatedAt) : latest),
  "",
);

const schools = published
  .map((doc) => toSchool(doc as unknown as SchoolDoc))
  .sort((a, b) => a.id.localeCompare(b.id));

const body = JSON.stringify({ syncedAt, schools });
writeFileSync("src/data/schools.snapshot.json", body);

console.log(
  `snapshot: ${schools.length} published of ${docs.length}, synced to ${syncedAt}, ` +
    `${(body.length / 1024 / 1024).toFixed(1)} MB`,
);
process.exit(0);
