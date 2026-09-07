import Link from "next/link";
import { sql } from "drizzle-orm";
import { getPayload } from "payload";
import config from "@payload-config";

import "./analytics.css";

/**
 * What visitors did, from our own records.
 *
 * Vercel answers "how many people". This answers "what were they looking for",
 * which is the half that changes decisions — above all the searches that came
 * back empty, because each one names a school somebody wanted and the
 * directory does not carry.
 *
 * Aggregated in SQL rather than by loading rows and counting in JavaScript:
 * these are five cheap GROUP BYs, and the alternative stops working the moment
 * the table has a month of traffic in it.
 */
const DAYS = 30;

interface Row {
  [key: string]: unknown;
}

export async function Analytics() {
  const payload = await getPayload({ config });
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows?: Row[] } | Row[]> };
  };

  const run = async (query: unknown): Promise<Row[]> => {
    try {
      const result = await db.drizzle.execute(query);
      return (Array.isArray(result) ? result : (result.rows ?? [])) as Row[];
    } catch {
      // A missing table before the first deploy should show an empty panel,
      // not a stack trace on the admin homepage.
      return [];
    }
  };

  const [totals, daily, topSearches, emptySearches, topSchools] = await Promise.all([
    run(sql`
      select
        count(*) filter (where type = 'search')::int as searches,
        count(*) filter (where type = 'view')::int as views,
        count(*) filter (where type = 'search' and results = 0)::int as empty
      from events
      where created_at > now() - interval '${sql.raw(String(DAYS))} days'
    `),
    run(sql`
      select date_trunc('day', created_at)::date as day,
             count(*) filter (where type = 'search')::int as searches,
             count(*) filter (where type = 'view')::int as views
      from events
      where created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by 1
    `),
    run(sql`
      select query, count(*)::int as n, max(results)::int as results
      from events
      where type = 'search' and query is not null and query <> ''
        and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 12
    `),
    run(sql`
      select query, count(*)::int as n, max(created_at) as last_seen
      from events
      where type = 'search' and results = 0 and query is not null and query <> ''
        and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 12
    `),
    run(sql`
      select e.slug, count(*)::int as n, max(s.name) as name
      from events e left join schools s on s.slug = e.slug
      where e.type = 'view' and e.slug is not null
        and e.created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by e.slug order by n desc limit 12
    `),
  ]);

  const t = totals[0] ?? {};
  const searches = Number(t.searches ?? 0);
  const views = Number(t.views ?? 0);
  const empty = Number(t.empty ?? 0);
  const emptyRate = searches ? Math.round((empty / searches) * 100) : 0;
  const nf = new Intl.NumberFormat("en-NG");

  const peak = Math.max(1, ...daily.map((d) => Number(d.searches ?? 0) + Number(d.views ?? 0)));

  return (
    <div className="eduplana-an eduplana-an--view">
      <header className="eduplana-an__head">
        <div>
          <h2>Analytics</h2>
          <p>What visitors searched for and opened, over the last {DAYS} days.</p>
        </div>
        <Link className="btn btn--style-secondary btn--size-small" href="/admin">
          Back to dashboard
        </Link>
      </header>

      <ul className="eduplana-an__stats">
        <Stat label="Searches" value={nf.format(searches)} hint="queries run" />
        <Stat label="Profiles opened" value={nf.format(views)} hint="school pages read" />
        <Stat
          label="Found nothing"
          value={nf.format(empty)}
          hint={`${emptyRate}% of searches`}
          tone={empty > 0 ? "warn" : undefined}
        />
      </ul>

      {daily.length > 0 ? (
        <section className="eduplana-an__panel">
          <h3>Activity</h3>
          <div className="eduplana-an__chart" role="img" aria-label={`Daily activity over the last ${DAYS} days`}>
            {daily.map((d) => {
              const s = Number(d.searches ?? 0);
              const v = Number(d.views ?? 0);
              const day = String(d.day).slice(0, 10);
              return (
                <span key={day} className="eduplana-an__bar" title={`${day}: ${s} searches, ${v} views`}>
                  <span className="eduplana-an__bar-v" style={{ height: `${(v / peak) * 100}%` }} />
                  <span className="eduplana-an__bar-s" style={{ height: `${(s / peak) * 100}%` }} />
                </span>
              );
            })}
          </div>
          <p className="eduplana-an__legend">
            <span className="eduplana-an__key eduplana-an__key--s" /> Searches
            <span className="eduplana-an__key eduplana-an__key--v" /> Profile views
          </p>
        </section>
      ) : null}

      <div className="eduplana-an__grid">
        <Panel
          title="Searches that found nothing"
          note="Each one is a school somebody wanted. The clearest list of what to add next."
          empty="No empty searches yet."
          rows={emptySearches.map((r) => ({
            key: String(r.query),
            label: String(r.query),
            value: `${nf.format(Number(r.n ?? 0))}×`,
          }))}
          tone="warn"
        />
        <Panel
          title="Most searched"
          note="What people type most often."
          empty="No searches recorded yet."
          rows={topSearches.map((r) => ({
            key: String(r.query),
            label: String(r.query),
            value: `${nf.format(Number(r.n ?? 0))}×`,
          }))}
        />
        <Panel
          title="Most viewed schools"
          note="The schools worth approaching first."
          empty="No profile views recorded yet."
          rows={topSchools.map((r) => ({
            key: String(r.slug),
            label: String(r.name ?? r.slug),
            value: `${nf.format(Number(r.n ?? 0))}×`,
            href: `/admin/collections/schools?search=${encodeURIComponent(String(r.name ?? ""))}`,
          }))}
        />
      </div>

      {searches === 0 && views === 0 ? (
        <p className="eduplana-an__hint">
          Nothing recorded yet. Searches are counted when somebody uses the directory, and profile
          views when a school page is opened — both start filling in as soon as the site has visitors.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warn";
}) {
  return (
    <li className={tone ? `eduplana-an__stat eduplana-an__stat--${tone}` : "eduplana-an__stat"}>
      <span className="eduplana-an__value">{value}</span>
      <span className="eduplana-an__label">{label}</span>
      {hint ? <span className="eduplana-an__hint-sm">{hint}</span> : null}
    </li>
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
  note: string;
  empty: string;
  tone?: "warn";
  rows: Array<{ key: string; label: string; value: string; href?: string }>;
}) {
  return (
    <section className={tone ? `eduplana-an__panel eduplana-an__panel--${tone}` : "eduplana-an__panel"}>
      <h3>{title}</h3>
      <p className="eduplana-an__note">{note}</p>
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
