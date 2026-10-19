# Hosting plan: get off the Vercel CPU limit, then make the app portable

**Audience:** this file is written to be handed to an AI coding agent (Zed) task by task.
Read `AGENTS.md` first: this is Next 16 + Payload 3, so check `node_modules/next/dist/docs/`
before using any Next API you think you know.

**Context.** EduPlanner is pre-launch and not a business yet, so it stays on Vercel's free
Hobby plan for now. The project hit 100% of Hobby's included **Fluid Active CPU (4 h/month)**.
The goal is:

1. **Phase 1:** cut CPU use enough to stay inside the free tier (stay on Vercel).
2. **Phase 2:** make the app runnable anywhere (Docker), without moving yet.
3. **Phase 3:** a walkthrough for moving to a flat-price server when it's time (launch,
   or when Phase 1 isn't enough).

Do the phases in order. Each task is one commit. Don't start Phase 3 without Tunde's go-ahead.

---

## Review, 19 October 2026 (read this before the tasks below)

The plan was checked against measurements before anything was built. What changed:

**What the data says.** Our own bot-filtered counter recorded about **3,300 human page views in 30 days**.
Vercel counted **324,000 requests and 49,000 function runs** in the same month. Over 90% of the load is
crawlers and bots, not visitors. That makes bot blocking the biggest lever, and means the tracking
beacon (about 35 human views a day) is not a meaningful cost.

**Where a function's CPU goes.** Measured in a fresh Node process: loading Payload's packages costs
about **1.0 s** (core 0.44, Postgres adapter 0.41, editor 0.12, sharp 0.06); parsing the 10 MB school
snapshot costs about **0.06 s**. The plan blames "Payload and the snapshot"; it is almost all Payload.

| Task | Verdict |
| --- | --- |
| **Phase 0, hide the site** | Not done. It switches off the SEO work the site exists for, and blocks nothing that bots which ignore robots.txt are doing. Bot protection (1.5) targets the actual problem. |
| **1.1 Look at Observability** | Still the first step. Needs Tunde. |
| **1.2 Batch the beacons** | **Skipped.** About 35 human views a day at ~0.04 s each is about a second of CPU a day. It adds complexity and risks losing views when a tab is killed. |
| **1.3 Cache suggestions** | **Done**, with a one-hour CDN cache instead of a day (a renamed or unpublished school can be suggested for at most an hour), and lowercase queries so one prefix is one cache entry. |
| **1.4 Prerender all profiles** | **Skipped.** An on-demand render is about 0.03 s of CPU, so there is little to save, and a full prerender would add roughly 1.6 GB to every deploy and could exhaust the 200,000 monthly ISR writes (September used 140,000). |
| **1.5 Bot protection** | Needs Tunde, in the dashboard. Highest value. |
| **Not in the plan: lazy-load Payload** | **Done.** `lib/schools.ts` and `lib/track.ts` imported Payload at the top, so every public page loaded it at startup even when the data was cached. Now it loads only when the change set must be read. Locally: startup CPU 1.64 s to 1.2 s, first suggestion 0.27 s to 0.13 s, memory 592 MB to 472 MB. |
| **Not in the plan: unwanted crawlers** | **Done.** SEO-tool scrapers and bulk collectors are disallowed in `robots.ts`. Search engines and AI assistants are not. |
| **Phase 2, Docker** | **Deferred**, not needed until a move is planned. **Correction:** the repo uses **npm** (`package-lock.json`); there is no `pnpm-lock.yaml`, and `packageManager: pnpm` is not committed. Every `pnpm` command in 2.2 must be `npm ci` / `npm run build`, or the image will not build. Docker is installed on Tunde's machine, so 2.4 can be tested locally. |
| **Phase 3, moving** | Unchanged: do it at launch or if the measures below fail. |

**Next measurement.** Compare October's Fluid Active CPU (Vercel, Usage) with September's 7 h 33 m. If it
is on course for under 3 h, stop here.

---

## Why the CPU gets used (read before changing anything)

Each uncached request on Vercel can start a fresh serverless instance. Starting one means
loading Payload **and** parsing `src/data/schools.snapshot.json` (~10 MB, 7,375 schools).
That cold start costs a lot of CPU. The routes that trigger it most:

| Source | What happens | File |
| --- | --- | --- |
| Page-view beacon | One `POST /api/track` **per page view**, each one loading Payload and inserting a row | `src/components/page-beacon.tsx`, `src/app/(site)/api/track/route.ts`, `src/lib/track.ts` |
| Search suggestions | `GET /api/suggest` on almost every keystroke (160 ms debounce). The response sends `public, max-age=60`, which only caches in the browser, not on Vercel's CDN | `src/components/school-search-box.tsx`, `src/app/(site)/api/suggest/route.ts` |
| School profiles | Only the top 500 are prerendered. The other ~6,900 render on first visit, and each deploy starts with a fresh cache. Crawlers walking the sitemap re-render them | `src/app/(site)/schools/[slug]/page.tsx` |
| `/schools?…` listing | Rendered fresh on every request. robots.txt already blocks the query versions, but badly behaved bots ignore it | `src/app/(site)/schools/page.tsx`, `src/app/robots.ts` |

---

## Phase 0: a decision for Tunde (not for the agent)

**Should the site be indexable before launch?** Right now `robots.ts` and `sitemap.ts` invite
search engines to crawl all 7,375 profiles, and that's probably most of the traffic.

- **Option A: stay indexable** to build an SEO head start. Do Phase 1 as written.
- **Option B: hide until launch.** Change `robots.ts` to `disallow: "/"`, add
  `robots: { index: false }` to the site layout metadata, and remove the sitemap link.
  That probably removes most CPU use straight away. Undo it on launch day.

---

## Phase 1: stay on Vercel and use less CPU

### Task 1.1: Look at where the CPU actually goes (Tunde, 5 minutes, in the dashboard)

Vercel dashboard → project → **Observability** → Vercel Functions. Sort by CPU time. Note the
top routes, and use them to check that the order of tasks below makes sense. Then check
**Firewall** to see how much of the traffic is bots.

### Task 1.2: Send page-view beacons in batches

Goal: about **one** `/api/track` request per visit instead of one per page, with the
`/admin/analytics` dashboard unchanged (it reads every `type = 'view'` row, see
`src/components/admin/Analytics.tsx` and `Dashboard.tsx`).

- `page-beacon.tsx`: instead of calling `fetch` on each pathname change, push
  `{ path, slug, referrer }` onto an in-memory queue (copied to `sessionStorage` in a try/catch).
  Flush with `navigator.sendBeacon('/api/track', JSON.stringify({ views: queue }))` on
  `visibilitychange` → `hidden` and on `pagehide`, then clear the queue. Keep the
  strict-mode double-fire guard. Ignore repeat views of the same path within one session.
- `api/track/route.ts`: accept `{ views: [...] }` (cap it at 50 items, and validate each item with
  the existing `PATH`/slug regexes). Keep accepting the old single-object shape for one
  release. Keep the bot user-agent filter.
- `lib/track.ts`: add `recordMany(events)` that inserts all rows in **one** database call (use
  Payload's underlying Drizzle (`payload.db.drizzle`) for a single multi-row insert, or loop
  `payload.create` if that's simpler, since it's still one function invocation). `sendBeacon`
  sends `text/plain`, so parse with `await request.text()` → `JSON.parse`.
- **Done when:** clicking through 5 pages and then closing the tab produces a single `/api/track`
  request in DevTools → Network (filter "track", tick Preserve log), and 5 rows show up in
  `/admin/analytics`.

### Task 1.3: Let the CDN cache search suggestions

- `api/suggest/route.ts`: change the header to
  `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800`.
  Vercel's CDN caches per full URL, including `?q=`, so the same prefix typed by anyone is
  computed once a day.
- `school-search-box.tsx`: lowercase and trim the query before building the URL so `Lekki`,
  `lekki` and `lekki ` share one cache entry. Raise the debounce to 250 ms.
- Admin edits can make a suggestion up to a day stale. That's acceptable before launch, so note it
  in the README.
- **Done when:** running `curl -sI "https://<site>/api/suggest?q=lek"` twice shows `x-vercel-cache: HIT` on the
  second call.

### Task 1.4: Prerender every school profile at build time

The comment in `generateStaticParams` says each prerender was a database read. That was true
before the snapshot existed. Now `getSchool` reads the bundled snapshot, plus one cached
"changes" query (`unstable_cache` in `src/lib/schools.ts`).

- **First verify:** run `NODE_ENV=production pnpm build` locally with logging around
  `fetchChanges` and count how many times it runs during the build. Expect a handful (one per
  build worker), not thousands.
- If that holds, remove the `.slice(0, 500)` and the gallery filter so all 7,375 slugs are
  prerendered. Update the comment to say why.
- Check the build time. The Hobby build limit is 45 minutes. If a full build takes more than about 15 minutes,
  raise the cap to 3,000 instead and say so in the comment.
- **Done when:** after deploying, a profile that was outside the old top 500 returns
  `x-vercel-cache: PRERENDER` or `HIT` on its very first request.

### Task 1.5: Block bots at the firewall (Tunde, in the dashboard)

Vercel → Firewall: turn on the managed **Bot Protection** / AI-bot rules if the plan offers them.
If custom rules are available, add a rate-limit rule on `/schools` requests that have a query
string. No code change.

### Task 1.6: Re-measure

After 1.2–1.5 have run for a week, compare Observability CPU against Task 1.1. If the project is
still on course for more than about 3 h a month, move on to Phase 3 sooner rather than later.

---

## Phase 2: make it portable (no move yet)

Goal: `docker run` gives a working site and admin on any machine, and nothing breaks when
`VERCEL` isn't set.

### Task 2.1: Standalone build

- `next.config.ts`: add `output: "standalone"` (keep it inside `withPayload`). Confirm Vercel
  deploys still work, because Vercel ignores this setting.
- `sharp` must be in `dependencies` (it already is).

### Task 2.2: Dockerfile and `.dockerignore`

A multi-stage build: `node:22-slim` base, `corepack enable` (the repo pins pnpm 10), install
with `pnpm install --frozen-lockfile`, `pnpm build`, then copy `.next/standalone`,
`.next/static` and `public` into the runtime stage. Run as a non-root user and
`CMD ["node", "server.js"]` on port 3000. `.dockerignore`: `node_modules`, `.next`, `.git`,
`.env*`, `design`, `docs`, `tsconfig.tsbuildinfo`.

Build-time env: `next build` currently needs `DATABASE_URL` and `PAYLOAD_SECRET` (for the
prerender in Task 1.4) and the `NEXT_PUBLIC_*` values. Pass them as build args/secrets, never
bake `.env.local` into an image layer.

### Task 2.3: Remove Vercel-only assumptions

- `src/app/(site)/layout.tsx`: render `<Analytics />` and `<SpeedInsights />` only when
  `process.env.VERCEL` is set, so they don't load or 404 anywhere else.
- `src/lib/site.ts`: make sure the production URL comes from `NEXT_PUBLIC_SITE_URL` first, and
  falls back to `VERCEL_PROJECT_PRODUCTION_URL` only on Vercel. Add `NEXT_PUBLIC_SITE_URL` to
  `.env.example`.
- Add `GET /api/health` that returns `{ ok: true }` without touching the database (for the host's
  health check).
- Add `RESEND_API_KEY` and `NEXT_PUBLIC_SITE_URL` to `.env.example` (they're used but not
  listed).

### Task 2.4: Local proof

`docker compose up` with a `docker-compose.yml` that runs the image with `.env.local`.
**Done when** these all work against the container: the home page, a school profile, a search,
`/admin` login, editing a school in the admin (and the change appearing on its profile, which
proves `revalidateTag` works with the filesystem cache), uploading a photo (which lands in R2),
and a test outreach email.

### Task 2.5: Docs

Add a "Running outside Vercel" section to `README.md`: build args, required env, the volume for
`.next/cache`, and the health check.

---

## Phase 3: walkthrough for moving to a flat-price server

Do this when EduPlanner launches, or if Phase 1 doesn't keep CPU under the limit. The database
(Neon), files (Cloudflare R2) and email (Resend) **don't move**. Only the app server changes.

**Recommended shape:** one always-on container running the Phase 2 image, with Cloudflare in front.
Payload is built to run as a long-lived Node server, so the snapshot gets loaded once instead of
on every cold start, and the bill is flat whatever the CPU use.

```
visitor → Cloudflare (free plan: DNS, CDN cache, bot filtering)
        → app server (Docker: Next + Payload, port 3000, volume for .next/cache)
              ├─ Neon Postgres (unchanged)
              ├─ Cloudflare R2 (unchanged)
              └─ Resend (unchanged)
```

**Where to run it** (check current prices when you decide):
- **Small VPS + Coolify**: Hetzner, DigitalOcean, OVH, etc. 2 vCPU / 4 GB is enough. Coolify is a free,
  self-hosted dashboard that deploys from GitHub on every push, like Vercel. This is the cheapest
  option, but you look after the server.
- **Railway or Render**: deploys the Dockerfile from GitHub with nothing to manage. It costs a bit more,
  and usage-based billing comes back in a milder form.
- Pick a region near Neon (`us-east-1`), or in Europe, which is closer to Nigerian users. With the snapshot
  setup, database round-trips are rare, so either is fine.

**Steps (VPS + Coolify version):**

1. Create the server (Ubuntu LTS). Add an SSH key, turn off password login, and allow only ports 22/80/443 in the firewall.
2. Install Coolify with its one-line installer and open its dashboard.
3. Connect the GitHub repo and choose the **Dockerfile** build pack.
4. Add env vars: everything in `.env.example`, plus `NODE_ENV=production`. Mark
   `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_*` as build-time too.
5. Add a persistent volume mounted at `/app/.next/cache` so the page cache survives restarts.
6. Set the health check to `/api/health`. Deploy, and test on the server's temporary URL with the
   Task 2.4 checklist.
7. DNS: in Cloudflare, point the domain (an A record) at the server, proxied (orange cloud). SSL mode
   **Full (strict)**. Coolify's Traefik issues the certificate.
8. Cloudflare: turn on Bot Fight Mode. Add a Cache Rule so `/_next/static/*` and `/api/suggest*`
   respect origin headers. Leave `/admin*`, `/manage*` and `/api/track` uncached (the existing headers
   already say `no-store`).
9. Analytics: since Vercel Analytics won't work here, turn on **Cloudflare Web Analytics**
   (free, cookieless, in keeping with the NDPR reasoning in the README) and add its script
   tag next to the conditional Vercel one from Task 2.3. `/admin/analytics` keeps working
   unchanged.
10. Leave the Vercel project running for two weeks as a fallback, then delete it.

**Rollback:** point DNS back at Vercel. Nothing about the data has moved, so there's nothing to restore.

---

## Things not to do

- Don't move to Cloudflare Workers / OpenNext. Payload and `sharp` fit badly there, so it swaps one
  kind of lock-in for another.
- Don't delete the snapshot mechanism (`scripts/snapshot-schools.mts`). It protects Neon's
  5 GB/month free egress on any host.
- Don't remove the `/schools?` rule from `robots.ts`.
