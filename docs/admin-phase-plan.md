# Admin phase — plan

The goal of this phase: **anyone on the Eduplana team can edit any school,
add new schools, manage the research archive and edit page content from an
admin panel — without a developer.** Today all of that lives in two JSON files
that only a code change can touch.

## Stack

| Piece | Choice | Why |
| --- | --- | --- |
| Admin + API | **Payload CMS 3** | Open source, installs *inside* this Next.js app (admin at `/admin`), brings auth, roles, drafts and an editing UI we don't have to build. Requires Next ≥16.2.6 — we're on 16.3.1. |
| Database | **Neon Postgres** (already provisioned, `us-east-1`) | Same region as Vercel's functions (`iad1`). ~25 MB of data against a 500 MB free tier. Branching gives us a free rehearsal database for the migration. |
| Media | **Cloudflare R2** (already live, 25,955 objects) | Payload's `@payloadcms/storage-s3` adapter speaks R2's S3 API, so admin uploads land in the same bucket the site already serves from. |
| Hosting | Vercel (unchanged) | One deploy: site + admin + API are a single Next.js app. |

Packages: `payload`, `@payloadcms/next`, `@payloadcms/db-postgres`,
`@payloadcms/richtext-lexical`, `@payloadcms/storage-s3`, `sharp`.
`next.config.ts` gets wrapped with `withPayload()`.

### App layout after install

Payload owns one route group; the existing site moves into another. No URL
changes for visitors.

```
src/app/(site)/…            everything that exists today, unchanged URLs
src/app/(payload)/admin/…   the admin panel
src/app/(payload)/api/…     Payload's REST API (used by the admin UI)
src/payload.config.ts       schema, roles, hooks — the file most edits touch
src/collections/…           one file per collection below
```

---

## The database

Payload generates and migrates the Postgres schema from collection configs —
we describe fields, it owns the DDL. What it will produce, roughly:

```
users                      admins & editors (auth, bcrypt, sessions)
schools                    one row per school — scalar fields as columns
  schools_curricula        ] Payload stores array/select-many fields as
  schools_facilities       ] child tables, one row per item, ordered.
  schools_activities       ]
  schools_clubs             ]
  schools_fee_items        label + amount per published tuition line
  schools_gallery          gallery rows (legacy path OR new media ref)
  schools_rels             relationships (e.g. gallery → media)
media                      new uploads: R2 key, mime, size, alt, focal point
infographics               the 54 archive charts (title, topic, year, media)
reports                    the 29 PDFs (title, topic, year, file)
pages / globals            homepage sections, banners, footer, site settings
payload_migrations, payload_preferences, *_versions   Payload internals
```

### The `schools` collection — field for field

Every field in today's JSON maps directly; nothing is dropped and nothing is
invented. Grouped as the admin will see them:

| Group | Fields | Notes |
| --- | --- | --- |
| Identity | `name`, `slug`, `level`, `tagline`, `summary` | slug unique + indexed; summary is plain textarea (records are display-ready prose — no rich text needed yet) |
| Location | `state`, `area`, `address`, `busStop` | `state` becomes a **select with the 37 canonical options** — the Nasarawa/Nassarawa split we just fixed can never come back |
| Contact | `phone`, `website` | validated: digits / URL |
| Academics | `curricula[]`, `scope`, `yearFounded`, `maxClassSize`, `faith`, `day`, `boarding` | curricula as select-many from the known list |
| Fees | `fee.label/min/max`, `feeItems[]`, `scholarship`, `siblingsDiscount` | feeItems is an array field: label + naira amount |
| Offer | `facilities[]`, `activities[]`, `clubs[]` | array-of-text rows; chip taxonomy stays a render-time concern |
| Media | `logoPath`, `gallery[]`, `admissionFormPath` | see media strategy below |
| Status | `verified`, `published` | `verified` is **admin-only at the field level** — an editor cannot tick it. Publishing uses Payload drafts. |

`id` keeps the existing string ids (`meadow-hall-school-f9b90`) as the primary
key so nothing that references a school ever has to be re-mapped.

### Media strategy — the important decision

The bucket already holds 25,955 files that the data references as plain paths
(`/schools/<slug>/photo-01.webp`). We will **not** re-ingest those as 26k
`media` rows — re-uploading 1.2 GB through Payload buys nothing and risks a
lot. Instead:

- **Legacy media stays as paths.** `logoPath`, `admissionFormPath` and gallery
  rows keep their path strings; the site keeps rendering them through
  `src/lib/assets.ts` exactly as now.
- **New uploads go through Payload.** The `media` upload collection writes to
  the same R2 bucket under `media/…` via the S3 adapter. A gallery row is
  *either* a legacy `path` *or* a `media` relationship; the renderer resolves
  both. Replacing a school's photo = add an upload row, delete the legacy row.
- The sync script already uses `rclone copy` (never deletes), so bucket objects
  created by Payload are safe from local runs.

### Users, roles and permissions

Two roles now; the model extends cleanly when school-claiming arrives.

| Ability | `admin` | `editor` |
| --- | --- | --- |
| Edit / create schools, archive, pages | ✓ | ✓ |
| Publish drafts | ✓ | ✓ |
| Tick **`verified`** on a school | ✓ | ✗ (field-level access) |
| Delete records | ✓ | ✗ (soft: unpublish instead) |
| Manage users & roles | ✓ | ✗ |

Public reads only ever see published records. Every collection keeps
**versions + drafts** on, so edits have history, mistakes can be rolled back,
and `updatedBy` is stamped by a hook — a real audit trail.

Secrets added to Vercel: `DATABASE_URL`, `PAYLOAD_SECRET` (32 random bytes),
and the four existing `R2_*` keys (needed server-side for uploads now, not
just locally).

### Admin look and feel

Payload's admin is themeable, and this is where it gets made "really nice":

- Eduplana logo + brand green via the official theming hooks; custom login
  screen artwork.
- Nav grouped **Directory** (Schools) / **Archive** (Infographics, Reports) /
  **Content** (Pages, Settings) / **System** (Users, Media).
- Schools list configured like the site's own search: columns for name, state,
  level, fee band, verified; filters on state / level / verified; search on
  name. `useAsTitle: name` so relations read as school names, never ids.
- Field descriptions carry the editorial rules (e.g. *"Verified means a human
  confirmed details with the school — never tick it from the website alone"*).

---

## How the site reads the database

`src/lib/schools.ts` is already the seam — components only call `search()`,
`getSchool()`, `facetsFor()` etc. The surface **does not change**; only the
body does:

1. One cached loader fetches all published schools via Payload's Local API
   (no HTTP hop — same process) and is wrapped in `'use cache'` +
   `cacheTag('schools')`. 7,375 records ≈ 11 MB; the existing in-memory
   scoring/filtering code keeps working on top of it byte-for-byte.
2. A Payload `afterChange` hook on schools calls `updateTag('schools')` (and a
   per-slug tag), so **an admin edit is live on the site in seconds** — no
   redeploy.
3. Build stops prerendering all 3,046 school pages (that would mean 3k DB
   round-trips per deploy against Neon's free compute). Prerender the ~500
   richest profiles; the long tail renders on demand and caches. Visitors see
   no difference.

This is deliberately the *smallest correct* read-path change. If search ever
needs to outgrow memory (50k+ schools), the same seam swaps to SQL/pg_trgm
without touching a component.

## Migrating the 7,375 records

A one-off script (`scripts/migrate-to-db.ts`, using Payload's Local API so all
validation and hooks run):

1. Read both JSON files, upsert by `id` — **idempotent**, safe to re-run.
2. Rehearse against a **Neon branch** first (free, instant): counts must match
   7,375; spot-check Meadow Hall, a feeItems school, an admissionForm school.
3. Run against production Neon. The JSON files stay in the repo untouched
   until burn-in ends — they are the rollback.

---

## Order of work

Each step ends with a verification gate; nothing merges with a red gate.

| # | Work | Gate |
| --- | --- | --- |
| 1 | Install Payload (route groups, `withPayload`, Postgres adapter), `users` only | Admin boots locally; first admin created; site pages byte-identical |
| 2 | Full schema (all collections above) + roles + field access | An editor account cannot see `verified`; drafts round-trip |
| 3 | Migration script → **Neon branch** | 7,375 rows; spot-checks pass; re-run changes nothing |
| 4 | Rewire `lib/schools.ts` to the DB loader + cache tags | All 7 existing e2e suites green against the DB-backed app |
| 5 | R2 upload adapter + edit→revalidate hooks | Upload a photo in admin → appears on the live school page without redeploy |
| 6 | Admin polish (branding, columns, filters, descriptions) | Non-developer walkthrough: edit a school, add a school, publish |
| 7 | Deploy: Vercel env vars, migrate prod Neon, burn-in | Live e2e pass; Neon dashboards quiet; then remove the JSON read path |

Realistic sizing: steps 1–3 ≈ a day and a half of focused work, 4–5 ≈ two
days, 6–7 ≈ a day plus burn-in. **Call it a week of part-time evenings, not an
afternoon.**

## Risks, named

- **Neon free compute (100 CU-hrs/mo).** Builds no longer hammer the DB
  (see prerender cut) and scale-to-zero covers idle. Watched via Neon's
  dashboard during burn-in.
- **Payload array tables mean JOIN fan-out.** Irrelevant at one bulk load per
  cache fill; flagged so nobody "optimises" a per-request `depth: 3` query in
  later.
- **Vercel Hobby is non-commercial.** Unchanged from before: Pro ($20/mo)
  before real launch.
- **Rollback.** Until burn-in ends, the JSON files remain the fallback — one
  env flag flips the loader back.
