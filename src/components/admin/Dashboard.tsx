import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { sql } from "drizzle-orm";
import { getPayload, type Where } from "payload";
import config from "@payload-config";

import "./dashboard.css";

/**
 * The admin home.
 *
 * Answers three questions in the order they get asked: how many people came,
 * what were they looking for, and what does the directory still need. Every
 * figure comes from our own Postgres — there is no third-party analytics
 * account behind any of it, and nothing here needs a Vercel login to read.
 */
interface Row {
  [key: string]: unknown;
}

const code = (state: string) =>
  state.startsWith("FCT") ? "FCT" : state.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** Percentage change against the previous window, or null when there is no base. */
function delta(now: number, before: number): number | null {
  if (!before) return now > 0 ? null : 0;
  return Math.round(((now - before) / before) * 100);
}

export async function Dashboard() {
  const payload = await getPayload({ config });
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows?: Row[] } | Row[]> };
  };
  const run = async (q: unknown): Promise<Row[]> => {
    try {
      const r = await db.drizzle.execute(q);
      return (Array.isArray(r) ? r : (r.rows ?? [])) as Row[];
    } catch {
      return [];
    }
  };

  const { user } = await payload.auth({ headers: await nextHeaders() });
  const role = user && "role" in user ? (user.role as string) : undefined;
  const canEdit = role !== "analyst";
  const isSuperAdmin = role === "super-admin";

  const count = (where?: Where) =>
    payload.count({ collection: "schools", ...(where ? { where } : {}) });

  const [totals, series, topPages, referrers, devices, byState, gaps, levels, unverified, recent] =
    await Promise.all([
      run(sql`
        select
          count(distinct visitor) filter (where created_at > now() - interval '7 days')::int as visitors,
          count(distinct visitor) filter (where created_at between now() - interval '14 days' and now() - interval '7 days')::int as visitors_prev,
          count(*) filter (where type = 'view' and created_at > now() - interval '7 days')::int as views,
          count(*) filter (where type = 'view' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as views_prev,
          count(*) filter (where type = 'search' and created_at > now() - interval '7 days')::int as searches,
          count(*) filter (where type = 'search' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as searches_prev,
          count(*) filter (where type = 'search' and results = 0 and created_at > now() - interval '7 days')::int as empty
        from events
      `),
      run(sql`
        select d::date as day,
               coalesce(v.views, 0)::int as views,
               coalesce(v.visitors, 0)::int as visitors
        from generate_series(now()::date - interval '13 days', now()::date, interval '1 day') d
        left join (
          select created_at::date as day,
                 count(*) filter (where type = 'view')::int as views,
                 count(distinct visitor)::int as visitors
          from events where created_at > now() - interval '14 days' group by 1
        ) v on v.day = d::date
        order by 1
      `),
      run(sql`
        select path, count(*)::int as n from events
        where type = 'view' and created_at > now() - interval '7 days'
        group by 1 order by n desc limit 6
      `),
      run(sql`
        select referrer, count(*)::int as n from events
        where referrer is not null and created_at > now() - interval '7 days'
        group by 1 order by n desc limit 5
      `),
      run(sql`
        select device, count(distinct visitor)::int as n from events
        where device is not null and created_at > now() - interval '7 days'
        group by 1 order by n desc
      `),
      run(sql`
        select state, count(*)::int as n from schools
        where _status = 'published' and state is not null group by 1 order by n desc
      `),
      run(sql`
        select query, count(*)::int as n from events
        where type = 'search' and results = 0 and query is not null and query <> ''
          and created_at > now() - interval '30 days'
        group by 1 order by n desc limit 6
      `),
      run(sql`
        select level, count(*)::int as n from schools
        where _status = 'published' group by 1
      `),
      count({ verified: { equals: false } }),
      payload.find({
        collection: "schools",
        limit: 5,
        sort: "-updatedAt",
        depth: 0,
        draft: true,
        select: { name: true, state: true, updatedAt: true },
      }),
    ]);

  const nf = new Intl.NumberFormat("en-NG");
  const t = totals[0] ?? {};
  const num = (k: string) => Number(t[k] ?? 0);

  const days = series.map((r) => ({
    day: String(r.day).slice(0, 10),
    views: Number(r.views ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
  const hasTraffic = days.some((d) => d.views > 0 || d.visitors > 0);

  const states = byState.map((r) => ({ state: String(r.state), n: Number(r.n ?? 0) }));
  const peak = Math.max(1, ...states.map((s) => s.n));
  const thin = states.filter((s) => s.n < 50).length;
  const published = states.reduce((a, s) => a + s.n, 0);
  const share = states[0] && published ? Math.round(published / states[0].n) : 0;

  const primary = Number(levels.find((l) => l.level === "primary")?.n ?? 0);
  const secondary = Number(levels.find((l) => l.level === "secondary")?.n ?? 0);
  const schools = primary + secondary;

  return (
    <div className="ep">
      <header className="ep__head">
        <div>
          <p className="ep__eyebrow">Eduplana</p>
          <h2>Overview</h2>
        </div>
        <nav className="ep__actions" aria-label="Shortcuts">
          {canEdit ? (
            <Link className="ep__btn ep__btn--primary" href="/admin/collections/schools/create">
              Add a school
            </Link>
          ) : null}
          <Link className="ep__btn" href="/admin/collections/schools">
            Schools
          </Link>
          <Link className="ep__btn" href="/admin/analytics">
            Analytics
          </Link>
          {isSuperAdmin ? (
            <Link className="ep__btn" href="/admin/collections/users">
              People
            </Link>
          ) : null}
        </nav>
      </header>

      <ul className="ep__kpis">
        <Kpi
          label="Visitors"
          hint="last 7 days"
          value={nf.format(num("visitors"))}
          change={delta(num("visitors"), num("visitors_prev"))}
        />
        <Kpi
          label="Page views"
          hint="last 7 days"
          value={nf.format(num("views"))}
          change={delta(num("views"), num("views_prev"))}
        />
        <Kpi
          label="Searches"
          hint="last 7 days"
          value={nf.format(num("searches"))}
          change={delta(num("searches"), num("searches_prev"))}
        />
        <Kpi
          label="Found nothing"
          hint="searches with no results"
          value={nf.format(num("empty"))}
          tone="warn"
        />
      </ul>

      <div className="ep__row ep__row--split">
        <section className="ep-panel" aria-labelledby="ep-traffic">
          <div className="ep-panel__top">
            <div>
              <h3 id="ep-traffic">Traffic</h3>
              <p>Page views and visitors, 14 days</p>
            </div>
            <p className="ep-legend">
              <span className="ep-legend__key ep-legend__key--a" /> Views
              <span className="ep-legend__key ep-legend__key--b" /> Visitors
            </p>
          </div>
          {hasTraffic ? (
            <Traffic days={days} />
          ) : (
            <p className="ep-blank">
              No traffic recorded yet. Every page a visitor reaches is counted here from the moment
              they arrive.
            </p>
          )}
        </section>

        <section className="ep-panel" aria-labelledby="ep-mix">
          <div className="ep-panel__top">
            <div>
              <h3 id="ep-mix">The directory</h3>
              <p>{nf.format(schools)} published records</p>
            </div>
          </div>
          <Donut primary={primary} secondary={secondary} />
          <ul className="ep-legend-rows">
            <li>
              <span className="ep-legend__key ep-legend__key--a" /> Primary <em>{nf.format(primary)}</em>
            </li>
            <li>
              <span className="ep-legend__key ep-legend__key--b" /> Secondary{" "}
              <em>{nf.format(secondary)}</em>
            </li>
          </ul>
          <p className="ep-panel__foot">
            <Link href="/admin/collections/schools?where[verified][equals]=false">
              {nf.format(unverified.totalDocs)} unverified
            </Link>{" "}
            — no school has been confirmed with a human yet.
          </p>
        </section>
      </div>

      {states.length > 0 ? (
        <section className="ep-panel" aria-labelledby="ep-cov">
          <div className="ep-panel__top">
            <div>
              <h3 id="ep-cov">Coverage by state</h3>
              <p>
                {states[0].state} holds 1 in every {share} schools listed
                {thin > 0 ? `, and ${thin} states have fewer than 50` : ""}.
              </p>
            </div>
          </div>
          <ol className="ep-cov">
            {states.map((s) => (
              <li
                key={s.state}
                className={s.n < 50 ? "ep-cov__col ep-cov__col--thin" : "ep-cov__col"}
              >
                <Link
                  href={`/admin/collections/schools?where[state][equals]=${encodeURIComponent(s.state)}`}
                  title={`${s.state}: ${nf.format(s.n)} schools`}
                >
                  <span className="ep-cov__bar" style={{ height: `${Math.max(2, (s.n / peak) * 100)}%` }} />
                  <span className="ep-cov__code">{code(s.state)}</span>
                  <span className="ep-cov__n">{nf.format(s.n)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="ep__row ep__row--three">
        <List
          title="Searches that found nothing"
          note="Each one is a school somebody wanted"
          empty="Nothing yet."
          tone="warn"
          rows={gaps.map((g) => ({
            key: String(g.query),
            label: String(g.query),
            value: nf.format(Number(g.n ?? 0)),
            href: `/admin/analytics?q=${encodeURIComponent(String(g.query))}`,
          }))}
        />
        <List
          title="Most visited pages"
          note="Last 7 days"
          empty="Nothing yet."
          rows={topPages.map((p) => ({
            key: String(p.path),
            label: String(p.path),
            value: nf.format(Number(p.n ?? 0)),
            href: `/admin/analytics?page=${encodeURIComponent(String(p.path))}`,
          }))}
        />
        <List
          title="Where visitors came from"
          note="Referring site, last 7 days"
          empty="No referrers yet — visitors have arrived directly."
          rows={referrers.map((r) => ({ key: String(r.referrer), label: String(r.referrer), value: nf.format(Number(r.n ?? 0)) }))}
        />
      </div>

      <div className="ep__row ep__row--split">
        <List
          title="Devices"
          note="Visitors, last 7 days"
          empty="Nothing yet."
          rows={devices.map((d) => ({
            key: String(d.device),
            label: String(d.device).replace(/^./, (c) => c.toUpperCase()),
            value: nf.format(Number(d.n ?? 0)),
          }))}
        />
        <section className="ep-panel" aria-labelledby="ep-recent">
          <div className="ep-panel__top">
            <div>
              <h3 id="ep-recent">Recently edited</h3>
              <p>The last five records touched</p>
            </div>
          </div>
          <ul className="ep-rows">
            {recent.docs.map((d) => (
              <li key={d.id}>
                <Link href={`/admin/collections/schools/${d.id}`}>{d.name}</Link>
                <em>
                  {d.state ? `${d.state} · ` : ""}
                  {new Date(d.updatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                </em>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({
  label,
  hint,
  value,
  change,
  tone,
}: {
  label: string;
  hint: string;
  value: string;
  change?: number | null;
  tone?: "warn";
}) {
  return (
    <li className={tone ? `ep-kpi ep-kpi--${tone}` : "ep-kpi"}>
      <div className="ep-kpi__row">
        <span className="ep-kpi__value">{value}</span>
        {typeof change === "number" ? (
          <span className={`ep-chip ${change >= 0 ? "ep-chip--up" : "ep-chip--down"}`}>
            {change >= 0 ? "▲" : "▼"} {Math.abs(change)}%
          </span>
        ) : null}
      </div>
      <span className="ep-kpi__label">{label}</span>
      <span className="ep-kpi__hint">{hint}</span>
    </li>
  );
}

/**
 * Two series over fourteen days, drawn as SVG on the server.
 *
 * No charting library: this is one path per series and the page ships no extra
 * JavaScript for it. Views and visitors share one axis — visitors are a subset
 * of views, so the comparison is honest on a single scale.
 */
function Traffic({ days }: { days: Array<{ day: string; views: number; visitors: number }> }) {
  const W = 640;
  const H = 150;
  const peak = Math.max(1, ...days.flatMap((d) => [d.views, d.visitors]));
  const x = (i: number) => (i / Math.max(1, days.length - 1)) * W;
  const y = (v: number) => H - (v / peak) * (H - 10);
  const line = (key: "views" | "visitors") =>
    days.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(" ");
  const area = `${line("views")} L ${W} ${H} L 0 ${H} Z`;

  return (
    <figure className="ep-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img"
        aria-label={`Page views and visitors over ${days.length} days`}>
        <defs>
          <linearGradient id="ep-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ep-a)" stopOpacity="0.30" />
            <stop offset="100%" stopColor="var(--ep-a)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#ep-fill)" />
        <path d={line("views")} fill="none" stroke="var(--ep-a)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={line("visitors")} fill="none" stroke="var(--ep-b)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="ep-chart__axis">
        <span>{days[0]?.day.slice(5)}</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </figcaption>
    </figure>
  );
}

/** Primary against secondary. One ring, two arcs, labelled beside it. */
function Donut({ primary, secondary }: { primary: number; secondary: number }) {
  const total = Math.max(1, primary + secondary);
  const C = 2 * Math.PI * 54;
  const share = (primary / total) * C;

  return (
    <svg className="ep-donut" viewBox="0 0 140 140" role="img"
      aria-label={`${primary} primary and ${secondary} secondary schools`}>
      <circle cx="70" cy="70" r="54" fill="none" stroke="var(--ep-b)" strokeWidth="16" />
      <circle cx="70" cy="70" r="54" fill="none" stroke="var(--ep-a)" strokeWidth="16"
        strokeDasharray={`${share} ${C - share}`} strokeDashoffset={C / 4} strokeLinecap="butt" />
      <text x="70" y="66" className="ep-donut__n">{Math.round((primary / total) * 100)}%</text>
      <text x="70" y="84" className="ep-donut__t">primary</text>
    </svg>
  );
}

function List({
  title,
  note,
  rows,
  empty,
  tone,
}: {
  title: string;
  note: string;
  empty: string;
  tone?: "warn";
  rows: Array<{ key: string; label: string; value: string; href?: string }>;
}) {
  return (
    <section className={tone ? `ep-panel ep-panel--${tone}` : "ep-panel"}>
      <div className="ep-panel__top">
        <div>
          <h3>{title}</h3>
          <p>{note}</p>
        </div>
      </div>
      {rows.length ? (
        <ul className="ep-rows">
          {rows.map((r) => (
            <li key={r.key}>
              {r.href ? <Link href={r.href}>{r.label}</Link> : <span>{r.label}</span>}
              <em>{r.value}</em>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ep-blank">{empty}</p>
      )}
    </section>
  );
}
