import Link from "next/link";
import { sql } from "drizzle-orm";
import { getPayload } from "payload";
import config from "@payload-config";

import "./analytics.css";

/**
 * Analytics, with somewhere to go.
 *
 * The overview answers "what happened"; every row on it is a link into this
 * same view with a filter, which answers "what happened to that". A list of
 * counts with nothing behind it is where most admin analytics stops, and it is
 * the point at which a number stops being useful — you can see that a page was
 * opened 40 times and still have no idea when, by how many people, or from
 * where.
 */
const DAYS = 30;

interface Row {
  [key: string]: unknown;
}

type Params = { [key: string]: string | string[] | undefined };

const one = (params: Params | undefined, key: string): string | null => {
  const v = params?.[key];
  return typeof v === "string" && v.trim() ? v : null;
};

export async function Analytics({ searchParams }: { searchParams?: Params }) {
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

  const page = one(searchParams, "page");
  const query = one(searchParams, "q");

  if (page) return <PageDetail path={page} run={run} />;
  if (query) return <SearchDetail query={query} run={run} />;
  return <Overview run={run} />;
}

/* ------------------------------------------------------------------ shell -- */

function Shell({
  title,
  sub,
  back,
  children,
}: {
  title: string;
  sub: string;
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="eduplana-an eduplana-an--view">
      <header className="eduplana-an__head">
        <div>
          {back ? (
            <Link className="eduplana-an__back" href={back.href}>
              ← {back.label}
            </Link>
          ) : null}
          <h2>{title}</h2>
          <p>{sub}</p>
        </div>
        <Link className="eduplana-an__btn" href="/admin">
          Overview
        </Link>
      </header>
      {children}
    </div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warn" }) {
  return (
    <li className={tone ? `eduplana-an__stat eduplana-an__stat--${tone}` : "eduplana-an__stat"}>
      <span className="eduplana-an__value">{value}</span>
      <span className="eduplana-an__label">{label}</span>
      {hint ? <span className="eduplana-an__hint-sm">{hint}</span> : null}
    </li>
  );
}

/** Daily bars. One series, so no legend — the panel heading names it. */
function Bars({ rows, label }: { rows: Array<{ day: string; n: number }>; label: string }) {
  const peak = Math.max(1, ...rows.map((r) => r.n));
  return (
    <figure className="eduplana-an__chart" role="img" aria-label={label}>
      {rows.map((r) => (
        <span key={r.day} className="eduplana-an__bar" title={`${r.day}: ${r.n}`}>
          <span className="eduplana-an__bar-s" style={{ height: `${(r.n / peak) * 100}%` }} />
        </span>
      ))}
    </figure>
  );
}

function Panel({
  title,
  note,
  rows,
  empty,
  tone,
}: {
  title: string;
  note?: string;
  empty: string;
  tone?: "warn";
  rows: Array<{ key: string; label: string; value: string; href?: string }>;
}) {
  return (
    <section className={tone ? `eduplana-an__panel eduplana-an__panel--${tone}` : "eduplana-an__panel"}>
      <h3>{title}</h3>
      {note ? <p className="eduplana-an__note">{note}</p> : null}
      {rows.length ? (
        <ol className="eduplana-an__list">
          {rows.map((r) => (
            <li key={r.key}>
              {r.href ? <Link href={r.href}>{r.label}</Link> : <span>{r.label}</span>}
              <em>{r.value}</em>
            </li>
          ))}
        </ol>
      ) : (
        <p className="eduplana-an__empty">{empty}</p>
      )}
    </section>
  );
}

const nf = new Intl.NumberFormat("en-NG");
const link = (path: string) => `/admin/analytics?page=${encodeURIComponent(path)}`;
const qlink = (q: string) => `/admin/analytics?q=${encodeURIComponent(q)}`;

/* --------------------------------------------------------------- overview -- */

async function Overview({ run }: { run: (q: unknown) => Promise<Row[]> }) {
  const [totals, daily, pages, searches, gaps, referrers, devices] = await Promise.all([
    run(sql`select
      count(distinct visitor)::int as visitors,
      count(*) filter (where type = 'view')::int as views,
      count(*) filter (where type = 'search')::int as searches,
      count(*) filter (where type = 'search' and results = 0)::int as empty
      from events where created_at > now() - interval '${sql.raw(String(DAYS))} days'`),
    run(sql`select d::date as day, coalesce(e.n, 0)::int as n
      from generate_series(now()::date - interval '${sql.raw(String(DAYS - 1))} days', now()::date, interval '1 day') d
      left join (select created_at::date as day, count(*)::int as n from events
        where type = 'view' and created_at > now() - interval '${sql.raw(String(DAYS))} days' group by 1) e
      on e.day = d::date order by 1`),
    run(sql`select path, count(*)::int as n, count(distinct visitor)::int as people from events
      where type = 'view' and path is not null and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 12`),
    run(sql`select query, count(*)::int as n from events
      where type = 'search' and query is not null and query <> '' and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 12`),
    run(sql`select query, count(*)::int as n from events
      where type = 'search' and results = 0 and query is not null and query <> '' and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 12`),
    run(sql`select referrer, count(distinct visitor)::int as n from events
      where referrer is not null and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 8`),
    run(sql`select device, count(distinct visitor)::int as n from events
      where device is not null and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc`),
  ]);

  const t = totals[0] ?? {};
  const n = (k: string) => Number(t[k] ?? 0);
  const days = daily.map((r) => ({ day: String(r.day).slice(0, 10), n: Number(r.n ?? 0) }));
  const any = n("views") + n("searches") > 0;

  return (
    <Shell title="Analytics" sub={`Everything visitors did, over ${DAYS} days. Every row opens.`}>
      <ul className="eduplana-an__stats">
        <Stat label="Visitors" value={nf.format(n("visitors"))} hint="counted once per day each" />
        <Stat label="Page views" value={nf.format(n("views"))} hint="pages opened" />
        <Stat label="Searches" value={nf.format(n("searches"))} hint="queries run" />
        <Stat label="Found nothing" value={nf.format(n("empty"))} hint="searches with no results" tone="warn" />
      </ul>

      {any ? (
        <section className="eduplana-an__panel">
          <h3>Page views a day</h3>
          <Bars rows={days} label={`Page views per day over ${DAYS} days`} />
        </section>
      ) : (
        <section className="eduplana-an__panel">
          <h3>Nothing recorded yet</h3>
          <p className="eduplana-an__empty">
            Searches are counted when somebody uses the directory and page views when a page is
            opened. Both start filling in as soon as the site has visitors.
          </p>
        </section>
      )}

      <div className="eduplana-an__grid">
        <Panel
          title="Searches that found nothing"
          note="Each one is a school somebody wanted"
          empty="No empty searches yet."
          tone="warn"
          rows={gaps.map((r) => ({
            key: String(r.query), label: String(r.query),
            value: `${nf.format(Number(r.n ?? 0))}×`, href: qlink(String(r.query)),
          }))}
        />
        <Panel
          title="Most searched"
          note="What people type most often"
          empty="No searches yet."
          rows={searches.map((r) => ({
            key: String(r.query), label: String(r.query),
            value: `${nf.format(Number(r.n ?? 0))}×`, href: qlink(String(r.query)),
          }))}
        />
        <Panel
          title="Most visited pages"
          note="Views over 30 days"
          empty="No page views yet."
          rows={pages.map((r) => ({
            key: String(r.path), label: String(r.path),
            value: nf.format(Number(r.n ?? 0)), href: link(String(r.path)),
          }))}
        />
        <Panel
          title="Where visitors came from"
          empty="No referrers yet — everyone arrived directly."
          rows={referrers.map((r) => ({
            key: String(r.referrer), label: String(r.referrer), value: nf.format(Number(r.n ?? 0)),
          }))}
        />
        <Panel
          title="Devices"
          note="Visitors, not views"
          empty="Nothing yet."
          rows={devices.map((r) => ({
            key: String(r.device),
            label: String(r.device).replace(/^./, (c) => c.toUpperCase()),
            value: nf.format(Number(r.n ?? 0)),
          }))}
        />
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------ page detail -- */

async function PageDetail({ path, run }: { path: string; run: (q: unknown) => Promise<Row[]> }) {
  const [totals, daily, referrers, devices] = await Promise.all([
    run(sql`select count(*)::int as views, count(distinct visitor)::int as people,
      min(created_at) as first_seen, max(created_at) as last_seen
      from events where type = 'view' and path = ${path}
      and created_at > now() - interval '${sql.raw(String(DAYS))} days'`),
    run(sql`select d::date as day, coalesce(e.n, 0)::int as n
      from generate_series(now()::date - interval '${sql.raw(String(DAYS - 1))} days', now()::date, interval '1 day') d
      left join (select created_at::date as day, count(*)::int as n from events
        where type = 'view' and path = ${path} group by 1) e on e.day = d::date order by 1`),
    run(sql`select referrer, count(*)::int as n from events
      where type = 'view' and path = ${path} and referrer is not null
      and created_at > now() - interval '${sql.raw(String(DAYS))} days' group by 1 order by n desc limit 8`),
    run(sql`select device, count(distinct visitor)::int as n from events
      where type = 'view' and path = ${path} and device is not null
      and created_at > now() - interval '${sql.raw(String(DAYS))} days' group by 1 order by n desc`),
  ]);

  const t = totals[0] ?? {};
  const views = Number(t.views ?? 0);
  const people = Number(t.people ?? 0);
  const days = daily.map((r) => ({ day: String(r.day).slice(0, 10), n: Number(r.n ?? 0) }));
  const slug = path.startsWith("/schools/") ? path.slice("/schools/".length) : null;

  return (
    <Shell title={path} sub={`One page, over ${DAYS} days`} back={{ href: "/admin/analytics", label: "All analytics" }}>
      <ul className="eduplana-an__stats">
        <Stat label="Page views" value={nf.format(views)} />
        <Stat label="People" value={nf.format(people)} hint="distinct visitors" />
        <Stat
          label="Views per person"
          value={people ? (views / people).toFixed(1) : "—"}
          hint="how often they came back"
        />
      </ul>

      <section className="eduplana-an__panel">
        <h3>Views a day</h3>
        <Bars rows={days} label={`Views of ${path} per day`} />
      </section>

      <div className="eduplana-an__grid">
        <Panel
          title="Where they came from"
          empty="No referrers — visitors reached this page directly or from within the site."
          rows={referrers.map((r) => ({ key: String(r.referrer), label: String(r.referrer), value: nf.format(Number(r.n ?? 0)) }))}
        />
        <Panel
          title="Devices"
          empty="Nothing yet."
          rows={devices.map((r) => ({
            key: String(r.device),
            label: String(r.device).replace(/^./, (c) => c.toUpperCase()),
            value: nf.format(Number(r.n ?? 0)),
          }))}
        />
        <section className="eduplana-an__panel">
          <h3>Open it</h3>
          <p className="eduplana-an__note">See what a visitor sees, or fix what they found.</p>
          <ol className="eduplana-an__list">
            <li>
              <a href={`https://www.eduplana.org${path}`} target="_blank" rel="noreferrer">
                View the live page
              </a>
              <em>↗</em>
            </li>
            {slug ? (
              <li>
                <Link href={`/admin/collections/schools?where[slug][equals]=${encodeURIComponent(slug)}`}>
                  Edit this school
                </Link>
                <em>→</em>
              </li>
            ) : null}
          </ol>
        </section>
      </div>
    </Shell>
  );
}

/* ---------------------------------------------------------- search detail -- */

async function SearchDetail({ query, run }: { query: string; run: (q: unknown) => Promise<Row[]> }) {
  const [totals, daily, devices] = await Promise.all([
    run(sql`select count(*)::int as times, count(distinct visitor)::int as people,
      max(results)::int as best, min(results)::int as worst, max(created_at) as last_seen
      from events where type = 'search' and query = ${query}
      and created_at > now() - interval '${sql.raw(String(DAYS))} days'`),
    run(sql`select d::date as day, coalesce(e.n, 0)::int as n
      from generate_series(now()::date - interval '${sql.raw(String(DAYS - 1))} days', now()::date, interval '1 day') d
      left join (select created_at::date as day, count(*)::int as n from events
        where type = 'search' and query = ${query} group by 1) e on e.day = d::date order by 1`),
    run(sql`select device, count(*)::int as n from events
      where type = 'search' and query = ${query} and device is not null
      and created_at > now() - interval '${sql.raw(String(DAYS))} days' group by 1 order by n desc`),
  ]);

  const t = totals[0] ?? {};
  const times = Number(t.times ?? 0);
  const best = Number(t.best ?? 0);
  const days = daily.map((r) => ({ day: String(r.day).slice(0, 10), n: Number(r.n ?? 0) }));

  return (
    <Shell
      title={`“${query}”`}
      sub={`One search, over ${DAYS} days`}
      back={{ href: "/admin/analytics", label: "All analytics" }}
    >
      <ul className="eduplana-an__stats">
        <Stat label="Searched" value={`${nf.format(times)}×`} />
        <Stat label="People" value={nf.format(Number(t.people ?? 0))} hint="distinct visitors" />
        <Stat
          label="Results returned"
          value={nf.format(best)}
          hint={best === 0 ? "nothing, every time" : "at most"}
          tone={best === 0 ? "warn" : undefined}
        />
      </ul>

      <section className="eduplana-an__panel">
        <h3>Times searched a day</h3>
        <Bars rows={days} label={`Searches for ${query} per day`} />
      </section>

      <div className="eduplana-an__grid">
        <Panel
          title="Devices"
          empty="Nothing yet."
          rows={devices.map((r) => ({
            key: String(r.device),
            label: String(r.device).replace(/^./, (c) => c.toUpperCase()),
            value: nf.format(Number(r.n ?? 0)),
          }))}
        />
        <section className={best === 0 ? "eduplana-an__panel eduplana-an__panel--warn" : "eduplana-an__panel"}>
          <h3>{best === 0 ? "This search finds nothing" : "Run it yourself"}</h3>
          <p className="eduplana-an__note">
            {best === 0
              ? "Somebody looked for this and the directory came back empty. Either the school is missing, or it is listed under a name nobody would type."
              : "See exactly what a visitor sees for this query."}
          </p>
          <ol className="eduplana-an__list">
            <li>
              <a
                href={`https://www.eduplana.org/schools?q=${encodeURIComponent(query)}`}
                target="_blank"
                rel="noreferrer"
              >
                Search the live site
              </a>
              <em>↗</em>
            </li>
            <li>
              <Link href="/admin/collections/schools/create">Add a school</Link>
              <em>→</em>
            </li>
          </ol>
        </section>
      </div>
    </Shell>
  );
}
