import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { sql } from "drizzle-orm";
import { getPayload, type Where } from "payload";
import config from "@payload-config";

import {
  Bars,
  Card,
  DataList,
  Grid,
  Legend,
  PageContainer,
  PageHeader,
  StatCard,
  TrendChart,
  nf,
  type ListRow,
} from "./ui";

/**
 * The admin home.
 *
 * Answers three questions in the order they get asked: how many people came,
 * what were they looking for, and what does the directory still need. Every
 * figure comes from our own Postgres; nothing here depends on a third-party
 * analytics account, and none of it needs a Vercel login to read.
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

const pageLink = (path: string) => `/admin/analytics?page=${encodeURIComponent(path)}`;
const searchLink = (q: string) => `/admin/analytics?q=${encodeURIComponent(q)}`;

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
      run(sql`select
        count(distinct visitor) filter (where created_at > now() - interval '7 days')::int as visitors,
        count(distinct visitor) filter (where created_at between now() - interval '14 days' and now() - interval '7 days')::int as visitors_prev,
        count(*) filter (where type = 'view' and created_at > now() - interval '7 days')::int as views,
        count(*) filter (where type = 'view' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as views_prev,
        count(*) filter (where type = 'search' and created_at > now() - interval '7 days')::int as searches,
        count(*) filter (where type = 'search' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as searches_prev,
        count(*) filter (where type = 'search' and results = 0 and created_at > now() - interval '7 days')::int as empty
        from events`),
      run(sql`select d::date as day, coalesce(v.views, 0)::int as views, coalesce(v.visitors, 0)::int as visitors
        from generate_series(now()::date - interval '13 days', now()::date, interval '1 day') d
        left join (select created_at::date as day,
            count(*) filter (where type = 'view')::int as views,
            count(distinct visitor)::int as visitors
          from events where created_at > now() - interval '14 days' group by 1) v on v.day = d::date
        order by 1`),
      run(sql`select path, count(*)::int as n from events
        where type = 'view' and path is not null and created_at > now() - interval '7 days'
        group by 1 order by n desc limit 6`),
      run(sql`select referrer, count(distinct visitor)::int as n from events
        where referrer is not null and created_at > now() - interval '7 days'
        group by 1 order by n desc limit 5`),
      run(sql`select device, count(distinct visitor)::int as n from events
        where device is not null and created_at > now() - interval '7 days'
        group by 1 order by n desc`),
      run(sql`select state, count(*)::int as n from schools
        where _status = 'published' and state is not null group by 1 order by n desc`),
      run(sql`select query, count(*)::int as n from events
        where type = 'search' and results = 0 and query is not null and query <> ''
          and created_at > now() - interval '30 days'
        group by 1 order by n desc limit 6`),
      run(sql`select level, count(*)::int as n from schools where _status = 'published' group by 1`),
      count({ verified: { equals: false } }),
      payload.find({
        collection: "schools",
        limit: 6,
        sort: "-updatedAt",
        depth: 0,
        draft: true,
        select: { name: true, state: true, updatedAt: true },
      }),
    ]);

  const t = totals[0] ?? {};
  const num = (k: string) => Number(t[k] ?? 0);

  const days = series.map((r) => ({
    day: String(r.day).slice(0, 10),
    a: Number(r.views ?? 0),
    b: Number(r.visitors ?? 0),
  }));
  const hasTraffic = days.some((d) => d.a > 0 || d.b > 0);

  const states = byState.map((r) => ({ state: String(r.state), n: Number(r.n ?? 0) }));
  const peak = Math.max(1, ...states.map((s) => s.n));
  const thin = states.filter((s) => s.n < 50).length;
  const published = states.reduce((a, s) => a + s.n, 0);
  const share = states[0] && published ? Math.round(published / states[0].n) : 0;

  const primary = Number(levels.find((l) => l.level === "primary")?.n ?? 0);
  const secondary = Number(levels.find((l) => l.level === "secondary")?.n ?? 0);
  const schools = primary + secondary;

  const rows = (list: Row[], key: string, href?: (v: string) => string): ListRow[] =>
    list.map((r) => ({
      key: String(r[key]),
      label: String(r[key]),
      value: nf.format(Number(r.n ?? 0)),
      href: href?.(String(r[key])),
    }));

  return (
    <PageContainer>
      <PageHeader
        title="Overview"
        sub="Traffic, searches and the state of the directory."
        actions={
          <>
            {canEdit ? (
              <Link className="ad-btn ad-btn--primary" href="/admin/collections/schools/create">
                Add a school
              </Link>
            ) : null}
            <Link className="ad-btn" href="/admin/collections/schools">
              Schools
            </Link>
            <Link className="ad-btn" href="/admin/analytics">
              Analytics
            </Link>
            {isSuperAdmin ? (
              <Link className="ad-btn" href="/admin/collections/users">
                People
              </Link>
            ) : null}
          </>
        }
      />

      <Grid cols={4} label="Headline figures">
        <StatCard label="Visitors" hint="last 7 days" value={nf.format(num("visitors"))}
          change={delta(num("visitors"), num("visitors_prev"))} />
        <StatCard label="Page views" hint="last 7 days" value={nf.format(num("views"))}
          change={delta(num("views"), num("views_prev"))} />
        <StatCard label="Searches" hint="last 7 days" value={nf.format(num("searches"))}
          change={delta(num("searches"), num("searches_prev"))} />
        <StatCard label="Found nothing" hint="searches with no results"
          value={nf.format(num("empty"))} tone="warn" />
      </Grid>

      <Grid cols="wide">
        <Card
          title="Traffic"
          note="Page views and visitors, 14 days"
          aside={<Legend a="Views" b="Visitors" />}
        >
          {hasTraffic ? (
            <TrendChart days={days} label="Page views and visitors over 14 days" />
          ) : (
            <p className="ad-empty">
              No traffic recorded yet. Every page a visitor reaches is counted from the moment they
              arrive.
            </p>
          )}
        </Card>

        <Card
          title="The directory"
          note={`${nf.format(schools)} published records`}
          foot={
            <>
              <Link href="/admin/collections/schools?where[verified][equals]=false">
                {nf.format(unverified.totalDocs)} unverified
              </Link>{" "}
              — no school has been confirmed with a human yet.
            </>
          }
        >
          <Donut primary={primary} secondary={secondary} />
          <DataList
            empty=""
            rows={[
              { key: "p", label: "Primary", value: nf.format(primary) },
              { key: "s", label: "Secondary", value: nf.format(secondary) },
            ]}
          />
        </Card>
      </Grid>

      {states.length > 0 ? (
        <Grid cols={2}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Card
              title="Coverage by state"
              note={`${states[0].state} holds 1 in every ${share} schools listed${
                thin > 0 ? `, and ${thin} states have fewer than 50` : ""
              }.`}
            >
              <ol className="ad-cov">
                {states.map((s) => (
                  <li key={s.state} className={s.n < 50 ? "ad-cov__col ad-cov__col--thin" : "ad-cov__col"}>
                    <Link
                      href={`/admin/collections/schools?where[state][equals]=${encodeURIComponent(s.state)}`}
                      title={`${s.state}: ${nf.format(s.n)} schools`}
                    >
                      <span className="ad-cov__bar" style={{ height: `${Math.max(2, (s.n / peak) * 100)}%` }} />
                      <span className="ad-cov__code">{code(s.state)}</span>
                      <span className="ad-cov__n">{nf.format(s.n)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </Grid>
      ) : null}

      <Grid cols={3}>
        <Card title="Searches that found nothing" note="Each one is a school somebody wanted" tone="warn">
          <DataList rows={rows(gaps, "query", searchLink)} empty="Nothing yet." />
        </Card>
        <Card title="Most visited pages" note="Last 7 days">
          <DataList rows={rows(topPages, "path", pageLink)} empty="Nothing yet." />
        </Card>
        <Card title="Where visitors came from" note="Referring site, last 7 days">
          <DataList rows={rows(referrers, "referrer")} empty="No referrers — visitors arrived directly." />
        </Card>
      </Grid>

      <Grid cols={2}>
        <Card title="Devices" note="Visitors, last 7 days">
          <DataList
            rows={devices.map((d) => ({
              key: String(d.device),
              label: String(d.device).replace(/^./, (c) => c.toUpperCase()),
              value: nf.format(Number(d.n ?? 0)),
            }))}
            empty="Nothing yet."
          />
        </Card>
        <Card title="Recently edited" note="The last six records touched">
          <DataList
            rows={recent.docs.map((d) => ({
              key: String(d.id),
              label: String(d.name),
              value: new Date(d.updatedAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
              href: `/admin/collections/schools/${d.id}`,
            }))}
            empty="Nothing edited yet."
          />
        </Card>
      </Grid>
    </PageContainer>
  );
}

/** Primary against secondary. One ring, two arcs, labelled beside it. */
function Donut({ primary, secondary }: { primary: number; secondary: number }) {
  const total = Math.max(1, primary + secondary);
  const C = 2 * Math.PI * 52;
  const share = (primary / total) * C;
  return (
    <svg className="ad-donut" viewBox="0 0 132 132" role="img"
      aria-label={`${primary} primary and ${secondary} secondary schools`}>
      <circle cx="66" cy="66" r="52" fill="none" stroke="var(--ad-series-2)" strokeWidth="15" />
      <circle cx="66" cy="66" r="52" fill="none" stroke="var(--ad-accent)" strokeWidth="15"
        strokeDasharray={`${share} ${C - share}`} strokeDashoffset={C / 4} />
      <text x="66" y="63" className="ad-donut__n">{Math.round((primary / total) * 100)}%</text>
      <text x="66" y="80" className="ad-donut__t">primary</text>
    </svg>
  );
}

export { Bars };
