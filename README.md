# Eduplana

Education data and management for Nigeria — from choosing a school to running
one well.

Search, filter, compare and shortlist **7,375 school records** across all 36
states and the FCT; read every school for **career-education signals**; and
browse nine years of education research.

Live at [eduplana.vercel.app](https://eduplana.vercel.app). School records are
flat JSON in the repo; the ~26,000 photographs, logos and PDFs (1.2 GB) live on
Cloudflare R2, not in git.

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Set `NEXT_PUBLIC_ASSET_BASE_URL` in `.env.local` to the R2 public URL so school
photography loads; without it the app falls back to `public/`, which only works
if you have the asset trees on disk.

```bash
npm run build                # production build
npm run lint                 # eslint
./scripts/sync-assets.sh     # upload new files in public/{schools,insights} to R2
```

## What works today

| Area | Status |
| --- | --- |
| Nationwide search | Free-text + location, weighted so name and place beat incidental matches |
| Filters | State, area, level, budget, day/boarding, curriculum, faith, facilities, has-photos |
| Shareable results | Every filter lives in the URL, so a search can be sent to family |
| School profiles | Photos, fees, curriculum, facilities, activities, clubs, contact, nearby schools |
| Save | localStorage — no sign-in required |
| Compare | Up to 4 schools on identical rows |
| Career signals | Every school read for 8 career indicators; 1,486 clear the bar |
| Autocomplete | Type-ahead on name and town, on the homepage and in the filter panel |
| Insights archive | 54 infographics and 29 reports, filterable by topic |
| Mobile | Sticky filter drawer, card results, large touch targets |

## Layout

```
src/data/schools.*.json     The dataset — primary and secondary
src/lib/schools.ts          Search, filter, facets, related schools
src/lib/format.ts           Naira, phone, location and fee formatting
src/lib/taxonomy.ts         Maps a facility/club label to its icon and colour
src/lib/career.ts           Career-education signals derived from published tags
src/lib/insights.ts         The research archive (infographics + documents)
src/data/insights.json      Archive manifest — titles, topics, file paths
src/lib/assets.ts           Maps repo-relative asset paths to the CDN
src/app/                    Routes (App Router, Next 16)
src/components/             UI, including the client-side shortlist store
design/brand/lockup.png     Supplied logo export — the source for public/brand
public/brand/               Logo lock-up, reversed lock-up, icon mark, favicon (in git)
public/images/              Hero photograph and city tiles (in git)
public/schools/             Local copy of school media — gitignored, served from R2
public/insights/            Local copy of the archive — gitignored, served from R2
scripts/sync-assets.sh      Uploads public/{schools,insights} to the R2 bucket
scripts/build-brand-assets.mjs  Regenerates public/brand from design/brand/lockup.png
```

### Assets

School photography, logos, admission forms and the research archive (~26,000
files, 1.2 GB) are stored in a Cloudflare R2 bucket that mirrors the `public/`
layout. `src/lib/assets.ts` prefixes those paths with
`NEXT_PUBLIC_ASSET_BASE_URL` at render time; everything under `/brand` and
`/images` is small and ships with the repo. The sync script uses `rclone copy`
on purpose — it only ever adds or updates bucket objects, so files uploaded
later by the admin can never be deleted by a local run.

## The data

`src/data/schools.primary.json` and `src/data/schools.secondary.json` are the
source of truth. Each file is a flat JSON array of records shaped like this:

```jsonc
{
  "id": "meadow-hall-school-f9b90",
  "slug": "meadow-hall-school",       // URL segment, unique across both files
  "name": "Meadow Hall School",
  "level": "primary",                 // "primary" | "secondary"
  "tagline": "A Place to Excel",
  "summary": "We are committed to …", // display-ready prose
  "state": "Lagos",
  "area": "Lekki",
  "address": "Meadow Hall Way, …",
  "busStop": "…",                     // nearest landmark
  "phone": "08073000554",             // the school's own line, not the directory's
  "admissionsOfficer": "Ms.Winnie Oragwu",
  "admissionsRole": "Admissions Manager",
  "website": "https://www.meadowhallschool.org",
  "yearFounded": 2002,
  "curricula": ["British", "Nigerian"],
  "scope": "Primary",
  "fee": { "label": "2 tuition figures", "min": 852000, "max": 1150000 },
  "feeItems": [                       // exact lines, when the school published them
    { "label": "Tuition (Infant)", "amount": 852000 },
    { "label": "Tuition (Primary)", "amount": 1150000 }
  ],
  "admissionForm": "/schools/meadow-hall-school/admission-form.pdf",
  "day": true,
  "boarding": false,
  "faith": "Secular",                 // "Secular" | "Christian" | "Islamic"
  "maxClassSize": 25,
  "scholarship": null,                // only when the school publishes one
  "siblingsDiscount": "5% off the third sibling",
  "facilities": ["Swimming Pool", "Standard ICT Centre"],
  "activities": ["Swimming", "Inter-House Sports"],
  "clubs": ["Taekwondo", "Scrabble"],
  "images": {
    "logo": "/schools/meadow-hall-school/logo.webp",
    "gallery": [
      { "full": "/schools/…/photo-01.webp", "thumb": "/schools/…/photo-01-thumb.webp" }
    ]
  },
  "verified": false                   // set by the backend, never derived
}
```

`src/lib/types.ts` is the authoritative definition. Two rules hold throughout:

* **Records are display-ready.** Fees are parsed into numbers, curricula are
  split into filterable values, descriptions are complete sentences and tag
  lists contain labels rather than prose. Nothing is cleaned or repaired at
  request time — if a value is wrong, fix it in the JSON.
* **A missing value is `null` or `[]`, never a guess.** The UI renders those as
  "not provided" rather than treating absence as a negative.

### Career signals, and the two kinds of badge

`src/lib/career.ts` reads each school's `facilities`, `activities` and `clubs`
for eight career indicators. A school publishing four or more carries the
**Career signals** badge, and its profile lists the exact items that earned it.

This is derived, not assessed, and the UI says so everywhere it appears. It is
deliberately a different claim from **Verified** (`School.verified`), which the
backend sets once a human has confirmed a school's details. The two badges use
different colours and shapes so they can never be read as the same thing — do
not merge them.

Tuning the bar is a one-line change (`STRONG_THRESHOLD`); adding an indicator
means adding an entry to `SIGNALS` with the substrings it matches.

### Moving to a database

`src/lib/schools.ts` is the seam. Everything above it calls `search()`,
`getSchool()`, `facetsFor()` and friends, so the records can move into Postgres
by reimplementing that one file — the field names above map directly onto
columns, and no component needs to change.

Local JSON is deliberate for now: 7,375 records is ~11 MB in memory and a full
scan takes under a millisecond, and committing to a schema this early would
freeze decisions still being learned from.

### Phone numbers

An earlier import captured a shared enquiry line rather than each school's own
number: 4,454 records carried one of just two phones, so "Call school" reached
the wrong place. Those were replaced with the school's own line, matched on
record id so a number can never land on the wrong school.

6,674 of 7,375 records now carry a number and 4,861 of those are distinct. Where
no genuine number could be established the field is `null` — "not provided"
beats a wrong number, which is worse than silence because someone acts on it.
The named admissions contact is stored alongside it, since it tells a parent who
they are about to reach.

## Search

`src/lib/site.ts` holds the canonical host, and everything that emits a URL
reads it from there. The apex redirects to `www`, so canonical tags, Open Graph
URLs and the sitemap all have to agree on `www.eduplana.org` — two addresses for
one page splits the ranking between them. Note what is deliberately *not* in
that fallback chain: `VERCEL_PROJECT_PRODUCTION_URL`, which resolves to the
deployment name and is how the site previously declared the wrong domain.

| | |
| --- | --- |
| `src/app/robots.ts` | Points crawlers at the sitemap; keeps them out of `/admin`, `/compare`, `/shortlist` |
| `src/app/(site)/sitemap.ts` | All 7,375 school pages plus the static routes |
| Canonicals | Per page. `/schools?q=…` canonicalises to `/schools`, so filter permutations do not compete |
| Open Graph / Twitter | Site-wide defaults, overridden per school; card at `public/brand/og-card.png` |
| Structured data | `Organization` + `WebSite` (with a search action) site-wide, `School` per profile |

`robots.ts` sits at the app root rather than in the `(site)` route group beside
`sitemap.ts`. That asymmetry is not a preference — `sitemap.ts` is picked up
from inside a route group and `robots.ts` is silently ignored there, never
appearing in the build manifest. Moving it back breaks it with no error.

School structured data emits only fields the record actually holds, and never
`aggregateRating`: there are no reviews, and inventing stars is what earns a
manual penalty.

## The admin

Payload CMS at `/admin`, backed by the same Neon Postgres the migration writes
to. Three roles:

| | |
| --- | --- |
| **super admin** | manages accounts: creates them, resets passwords, and is the only role that can grant super admin |
| **admin** | full control of content, including the `verified` flag |
| **editor** | writes and publishes content, but cannot assert verification |

The admin/editor line exists because "verified" is a factual claim to the public
that a human confirmed a school's details — not something to tick while tidying
copy. The super-admin line exists because managing accounts is a different kind
of power from managing content: an admin who could edit other accounts could
reset the super admin's password and take the site over.

**Passwords cannot be read back, by anyone.** Payload stores a salted hash, so
the original text is not in the database to display — there is no setting that
would reveal it, and storing the plaintext alongside the hash would mean one
leaked backup exposes every account. When somebody is locked out, a super admin
opens their record, types a new password and passes it on. That is why the
"Forgot password?" link is gone: no email adapter is configured, so it could
only ever claim to have sent a message. `/admin/forgot` redirects to the login
page.

**Adding someone.** Sign in as super admin, then *Add a user* on the dashboard,
or Users → Create New. You set their password on that form.

**Sessions end.** A session lasts an hour from signing in and does not renew
itself. Payload prompts a minute before expiry so anyone mid-edit can extend on
purpose; walking away from the machine logs you out. Five wrong passwords locks
an account for fifteen minutes.

**The no-guess rule is enforced, not just documented.** `not stated`, `n/a`,
`unknown`, `tbd` and bare punctuation are rejected on save for the free-text
fields, and a phone number must have 10–14 digits. A number already sitting on
ten or more other schools is refused outright — that is what a directory or
agency line looks like, and it is how the last bad number in the data was found.
The bar sits above the largest genuine school group, which lists nine campuses
on one head-office line.

## Known limitations

* **Scholarships are published by 74 schools.** 4,380 records previously read
  "Not available", which was indistinguishable from an untouched form default
  in the source and told a parent the school offers nothing. Those are now
  `null` and the card is omitted rather than saying "not provided" — on 7,301
  pages it would have been a row that says nothing.
* **Fees are present on 4,476 of 7,375 records.** Schools without a fee band
  disappear whenever a budget filter is applied. That is correct — inventing a
  band would be worse — but it needs a product answer before launch.
* **Only 111 records have exact fee figures**; the rest carry the directory's
  coarse band. `fee` is derived from **tuition lines only** — the published
  table also lists levies, uniforms and textbooks, and letting a ₦3,000 PTA levy
  set the floor would put a ₦120,000-a-term school in an "under ₦50,000" search.
  A table whose largest figure is under ₦1,000 is discarded outright as being in
  the wrong units rather than genuinely cheap.
* Nothing is verified with the schools themselves. Fee bands are indicative and
  the UI says so. A verified badge should only ever apply to facts actually
  checked.

## Not built yet

1. Postgres + admin (Payload CMS), replacing the JSON behind `schools.ts` —
   planned in `docs/admin-phase-plan.md`
2. Accounts — parent sign-in, saved lists synced across devices
3. School claiming and per-field verification
4. Enquiry and application flow
