/**
 * Clear the scholarship placeholder from records already in Postgres.
 *
 *   npx tsx --env-file=.env.local scripts/clear-scholarship-placeholder.mts
 *
 * 4,380 records held "Not available" — a value indistinguishable from an
 * untouched default in the source, which told a parent the school offers no
 * scholarship. Only the affected rows are touched, so this is minutes rather
 * than the half hour a full re-migration costs. Idempotent: a second run finds
 * nothing to do.
 */
import { getPayload } from "payload";
import config from "../src/payload.config.ts";

const payload = await getPayload({ config });
const CONCURRENCY = 8;

const { docs } = await payload.find({
  collection: "schools",
  where: { scholarship: { equals: "Not available" } },
  limit: 10_000,
  depth: 0,
  select: { id: true },
});

console.log(`records still holding the placeholder: ${docs.length}`);
if (!docs.length) process.exit(0);

let done = 0;
let failed = 0;
const queue = [...docs];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    for (let next = queue.pop(); next; next = queue.pop()) {
      try {
        await payload.update({
          collection: "schools",
          id: next.id,
          data: { scholarship: null },
        });
      } catch {
        failed++;
      }
      if (++done % 250 === 0) console.log(`  ${done}/${docs.length}  failed:${failed}`);
    }
  }),
);
console.log(`done — cleared ${done - failed}, failed ${failed}`);
process.exit(0);
