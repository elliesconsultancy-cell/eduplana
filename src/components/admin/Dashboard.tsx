import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { sql } from "drizzle-orm";
import { getPayload } from "payload";
import config from "@payload-config";
import { Eye, Plus, Search, SearchX, Send, Users } from "lucide-react";

import {
  Card,
  DataList,
  FigureStrip,
  Gauge,
  Grid,
  Legend,
  Meters,
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
 * Answers, in order: how many people came this week, how much of the directory
 * has been confirmed by the schools themselves, where the listings are thin,
 * and what is waiting on somebody. Every figure comes from our own Postgres —
 * nothing here needs a Vercel login to read.
 *
 * The verified gauge is the one large element on purpose. It is the number the
 * business exists to move: a listing a parent can trust because its school
 * checked it.
 */
interface Row {
  [key: string]: unknown;
}

const code = (state: string) =>
  state.startsWith("FCT") ? "FCT" : state.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** Percentage change against the previous window, or null when there is no base. */
function delta(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

function greeting(name: string | undefined): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(new Date()),
  );
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

const when = (iso: string) => {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" });
};

const pageLink = (path: string) => `/admin/analytics?page=${encodeURIComponent(path)}`;
const searchLink = (q: string) => `/admin/analytics?q=${encodeURIComponent(q)}`;
const KIND = { update: "Corrections", confirm: "Confirmed as correct", removal: "Asked to be removed" } as const;

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
  const name = user && "name" in user ? (user.name as string | undefined) : undefined;

  const [totals, series, topPages, referrers, devices, byState, gaps, directory, funnel, pending, recent] =
    await Promise.all([
      run(sql`select
        count(distinct visitor) filter (where created_at > now() - interval '7 days')::int as visitors,
        count(distinct visitor) filter (where created_at between now() - interval '14 days' and now() - interval '7 days')::int as visitors_prev,
        count(*) filter (where type = 'view' and created_at > now() - interval '7 days')::int as views,
        count(*) filter (where type = 'view' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as views_prev,
        count(*) filter (where type = 'search' and created_at > now() - interval '7 days')::int as searches,
        count(*) filter (where type = 'search' and created_at between now() - interval '14 days' and now() - interval '7 days')::int as searches_prev,
        count(*) filter (where type = 'search' and results = 0 and created_at > now() - interval '7 days')::int as empty,
        count(*) filter (where type = 'search' and results = 0 and created_at between now() - interval '14 days' and now() - interval '7 days')::int as empty_prev
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
      run(sql`select count(*)::int as total,
        count(*) filter (where verified)::int as verified,
        count(*) filter (where level = 'primary')::int as primary,
        count(*) filter (where level = 'secondary')::int as secondary
        from schools where _status = 'published'`),
      run(sql`select
        count(distinct email) filter (where sends > 0)::int as emailed,
        count(*) filter (where status in ('opened', 'submitted', 'approved'))::int as opened,
        count(*) filter (where status in ('submitted', 'approved'))::int as replied,
        count(*) filter (where status = 'approved')::int as approved
        from school_contacts`),
      payload
        .find({
          collection: "school-submissions",
          where: { status: { equals: "pending" } },
          sort: "-createdAt",
          limit: 5,
          depth: 0,
          select: { schoolName: true, kind: true, createdAt: true, contactName: true },
        })
        .catch(() => ({ docs: [], totalDocs: 0 })),
      payload.find({
        collection: "schools",
        limit: 6,
        sort: "-updatedAt",
        depth: 0,
        draft: true,
        select: { name: true, state: true, level: true, updatedAt: true },
      }),
    ]);

  const t = totals[0] ?? {};
  const num = (row: Row | undefined, k: string) => Number(row?.[k] ?? 0);

  const days = series.map((r) => ({
    day: String(r.day instanceof Date ? r.day.toISOString() : r.day).slice(0, 10),
    a: Number(r.views ?? 0),
    b: Number(r.visitors ?? 0),
  }));
  const hasTraffic = days.some((d) => d.a > 0 || d.b > 0);

  const states = byState.map((r) => ({ state: String(r.state), n: Number(r.n ?? 0) }));
  const peak = Math.max(1, ...states.map((s) => s.n));
  const thin = states.filter((s) => s.n < 50).length;
  const placed = states.reduce((a, s) => a + s.n, 0);
  const share = states[0] && placed ? Math.round(placed / states[0].n) : 0;

  const d = directory[0];
  const total = num(d, "total");
  const verified = num(d, "verified");
  const f = funnel[0];

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
        title={greeting(name)}
        sub="Here is how Eduplana did over the last seven days, and what needs you."
        actions={
          canEdit ? (
            <>
              <Link className="ad-btn" href="/admin/outreach">
                <Send size={17} aria-hidden /> Email schools
              </Link>
              <Link className="ad-btn ad-btn--primary" href="/admin/collections/schools/create">
                <Plus size={18} aria-hidden /> Add a school
              </Link>
            </>
          ) : null
        }
      />

      <Grid cols={4} label="This week">
        <StatCard icon={<Users size={22} />} label="Visitors" value={nf.format(num(t, "visitors"))}
          change={delta(num(t, "visitors"), num(t, "visitors_prev"))}
          hint={delta(num(t, "visitors"), num(t, "visitors_prev")) == null ? "Last 7 days" : "Against the week before"} href="/admin/analytics" />
        <StatCard icon={<Eye size={22} />} label="Page views" value={nf.format(num(t, "views"))}
          change={delta(num(t, "views"), num(t, "views_prev"))}
          hint={delta(num(t, "views"), num(t, "views_prev")) == null ? "Last 7 days" : "Against the week before"} href="/admin/analytics" />
        <StatCard icon={<Search size={22} />} label="Searches" value={nf.format(num(t, "searches"))}
          change={delta(num(t, "searches"), num(t, "searches_prev"))}
          hint={delta(num(t, "searches"), num(t, "searches_prev")) == null ? "Last 7 days" : "Against the week before"} href="/admin/analytics" />
        <StatCard icon={<SearchX size={22} />} label="Searches that found nothing" value={nf.format(num(t, "empty"))}
          tone="warn" hint="Each is a school someone wanted" href="/admin/analytics" />
      </Grid>

      <Grid cols="wide">
        <Card title="Traffic" note="Page views and visitors per day, last 14 days"
          aside={<Legend a="Page views" b="Visitors" />}>
          {hasTraffic ? (
            <TrendChart days={days} label="Page views and visitors per day over the last 14 days" />
          ) : (
            <div className="ad-empty">No visits recorded in the last 14 days.</div>
          )}
        </Card>

        <Card title="Verified by schools" note="Listings their own school has confirmed" flush>
          <Gauge value={verified} total={total} label="Listings verified by their school" />
          <p className="ad-gauge-copy">
            {verified === 0
              ? "No school has confirmed its listing yet. Each one that replies to outreach moves this."
              : `${nf.format(verified)} of ${nf.format(total)} listings have been checked by the school itself.`}
          </p>
          <FigureStrip
            items={[
              { label: "Emailed", value: nf.format(num(f, "emailed")), href: "/admin/collections/school-contacts" },
              { label: "Opened", value: nf.format(num(f, "opened")),
                href: "/admin/collections/school-contacts?where[status][in]=opened,submitted,approved" },
              { label: "Replied", value: nf.format(num(f, "replied")), href: "/admin/collections/school-submissions" },
              { label: "Verified", value: nf.format(verified),
                href: "/admin/collections/schools?where[verified][equals]=true" },
            ]}
          />
        </Card>
      </Grid>

      {states.length > 0 ? (
        <Grid cols={2}>
          <div style={{ gridColumn: "1 / -1" }}>
            <Card
              title="Listings by state"
              note={`${states[0].state} holds 1 in every ${share} listings${
                thin > 0 ? `; ${thin} states have fewer than 50, shown in grey` : ""
              }. Select a state to see its schools.`}
              aside={
                <span className="ad-pill">
                  {nf.format(num(d, "primary"))} primary · {nf.format(num(d, "secondary"))} secondary
                </span>
              }
            >
              <ol className="ad-cov">
                {states.map((s) => (
                  <li key={s.state} className={s.n < 50 ? "ad-cov__col ad-cov__col--thin" : "ad-cov__col"}>
                    <Link
                      href={`/admin/collections/schools?where[state][equals]=${encodeURIComponent(s.state)}`}
                      aria-label={`${s.state}: ${nf.format(s.n)} schools`}
                    >
                      <span className="ad-cov__bar" style={{ height: `${Math.max(2, (s.n / peak) * 100)}%` }} />
                      <span className="ad-cov__code">{code(s.state)}</span>
                      <span className="ad-cov__n" aria-hidden>
                        {s.state} · {nf.format(s.n)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </Grid>
      ) : null}

      <Grid cols={3}>
        <Card
          title="Waiting for review"
          note="Changes schools have sent in"
          aside={pending.totalDocs > 0 ? <span className="ad-pill ad-pill--warn">{pending.totalDocs}</span> : null}
          foot={
            pending.totalDocs > 0 ? (
              <Link href="/admin/collections/school-submissions?where[status][equals]=pending">
                Review all {nf.format(pending.totalDocs)}
              </Link>
            ) : undefined
          }
        >
          <DataList
            rows={pending.docs.map((s) => ({
              key: String(s.id),
              label: String(s.schoolName ?? "A school"),
              sub: `${KIND[s.kind as keyof typeof KIND] ?? "Changes"}${s.contactName ? `, from ${s.contactName}` : ""}`,
              value: when(String(s.createdAt)),
              href: `/admin/collections/school-submissions/${s.id}`,
            }))}
            empty={<>Nothing waiting. When a school sends in changes, they appear here.</>}
          />
        </Card>
        <Card title="Searches that found nothing" note="Last 30 days. Each is a school somebody wanted">
          <DataList rows={rows(gaps, "query", searchLink)} empty="Every search found something." />
        </Card>
        <Card title="Most visited pages" note="Last 7 days">
          <DataList rows={rows(topPages, "path", pageLink)} empty="No page views yet this week." />
        </Card>
      </Grid>

      <Grid cols="wide-left">
        <Card title="Where visitors come from" note="Visitors by referring site and device, last 7 days">
          <Meters
            rows={referrers.map((r) => ({ key: String(r.referrer), label: String(r.referrer), n: Number(r.n ?? 0) }))}
            empty="No referrers this week: visitors typed the address or used a bookmark."
          />
          {devices.length ? (
            <div style={{ marginTop: "var(--ad-5)" }}>
              <Meters
                rows={devices.map((r) => ({
                  key: `d-${String(r.device)}`,
                  label: String(r.device).replace(/^./, (c) => c.toUpperCase()),
                  n: Number(r.n ?? 0),
                }))}
                empty=""
              />
            </div>
          ) : null}
        </Card>
        <Card
          title="Recently edited"
          note="The last six listings changed"
          aside={
            <Link className="ad-btn ad-btn--small" href="/admin/collections/schools">
              All schools
            </Link>
          }
        >
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th scope="col">School</th>
                  <th scope="col">State</th>
                  <th scope="col">Level</th>
                  <th scope="col">Edited</th>
                </tr>
              </thead>
              <tbody>
                {recent.docs.map((s) => (
                  <tr key={String(s.id)}>
                    <th scope="row">
                      <Link href={`/admin/collections/schools/${s.id}`}>{String(s.name)}</Link>
                    </th>
                    <td>{s.state ? String(s.state) : "—"}</td>
                    <td>
                      <span className="ad-pill">{s.level === "primary" ? "Primary" : "Secondary"}</span>
                    </td>
                    <td className="ad-table__muted">{when(String(s.updatedAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Grid>
    </PageContainer>
  );
}
