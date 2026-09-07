import { sql } from "drizzle-orm";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";

import { Bars, Card, DataList, Grid, PageContainer, PageHeader, StatCard, nf, type ListRow } from "./ui";

/**
 * Analytics, inside the admin shell.
 *
 * Payload wraps its own views in the default template but not custom ones
 * registered by path, so this screen previously rendered bare — no sidebar, no
 * header, no way back. Wrapping it here is the fix; every prop below comes from
 * `initPageResult`, which Payload has already resolved for the request.
 *
 * The overview answers "what happened"; every row on it links back into this
 * same view with a filter, which answers "what happened to that".
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

const pageLink = (p: string) => `/admin/analytics?page=${encodeURIComponent(p)}`;
const searchLink = (q: string) => `/admin/analytics?q=${encodeURIComponent(q)}`;

export async function Analytics(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props;
  const payload = initPageResult.req.payload;

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

  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      {page ? (
        <PageDetail path={page} run={run} />
      ) : query ? (
        <SearchDetail query={query} run={run} />
      ) : (
        <Overview run={run} />
      )}
    </DefaultTemplate>
  );
}

const listRows = (list: Row[], key: string, href?: (v: string) => string, suffix = ""): ListRow[] =>
  list.map((r) => ({
    key: String(r[key]),
    label: String(r[key]),
    value: `${nf.format(Number(r.n ?? 0))}${suffix}`,
    href: href?.(String(r[key])),
  }));

const titleCase = (v: unknown) => String(v).replace(/^./, (c) => c.toUpperCase());

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
    run(sql`select path, count(*)::int as n from events
      where type = 'view' and path is not null and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 10`),
    run(sql`select query, count(*)::int as n from events
      where type = 'search' and query is not null and query <> '' and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 10`),
    run(sql`select query, count(*)::int as n from events
      where type = 'search' and results = 0 and query is not null and query <> '' and created_at > now() - interval '${sql.raw(String(DAYS))} days'
      group by 1 order by n desc limit 10`),
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
    <PageContainer>
      <PageHeader title="Analytics" sub={`Everything visitors did, over ${DAYS} days. Every row opens.`} />

      <Grid cols={4} label="Headline figures">
        <StatCard label="Visitors" value={nf.format(n("visitors"))} hint="counted once per day each" />
        <StatCard label="Page views" value={nf.format(n("views"))} hint="pages opened" />
        <StatCard label="Searches" value={nf.format(n("searches"))} hint="queries run" />
        <StatCard label="Found nothing" value={nf.format(n("empty"))} hint="searches with no results" tone="warn" />
      </Grid>

      <Grid cols={2}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Page views a day" note={`Last ${DAYS} days`}>
            {any ? (
              <Bars rows={days} label={`Page views per day over ${DAYS} days`} />
            ) : (
              <p className="ad-empty">
                Nothing recorded yet. Searches are counted when somebody uses the directory and page
                views when a page is opened — both begin as soon as the site has visitors.
              </p>
            )}
          </Card>
        </div>
      </Grid>

      <Grid cols={3}>
        <Card title="Searches that found nothing" note="Each one is a school somebody wanted" tone="warn">
          <DataList rows={listRows(gaps, "query", searchLink, "×")} empty="No empty searches yet." />
        </Card>
        <Card title="Most searched" note="What people type most often">
          <DataList rows={listRows(searches, "query", searchLink, "×")} empty="No searches yet." />
        </Card>
        <Card title="Most visited pages" note={`Views over ${DAYS} days`}>
          <DataList rows={listRows(pages, "path", pageLink)} empty="No page views yet." />
        </Card>
      </Grid>

      <Grid cols={2}>
        <Card title="Where visitors came from" note="Referring site">
          <DataList rows={listRows(referrers, "referrer")} empty="No referrers — everyone arrived directly." />
        </Card>
        <Card title="Devices" note="Visitors, not views">
          <DataList
            rows={devices.map((d) => ({ key: String(d.device), label: titleCase(d.device), value: nf.format(Number(d.n ?? 0)) }))}
            empty="Nothing yet."
          />
        </Card>
      </Grid>
    </PageContainer>
  );
}

/* ------------------------------------------------------------ page detail -- */

async function PageDetail({ path, run }: { path: string; run: (q: unknown) => Promise<Row[]> }) {
  const [totals, daily, referrers, devices] = await Promise.all([
    run(sql`select count(*)::int as views, count(distinct visitor)::int as people from events
      where type = 'view' and path = ${path} and created_at > now() - interval '${sql.raw(String(DAYS))} days'`),
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
    <PageContainer>
      <PageHeader title={path} sub={`One page, over ${DAYS} days`}
        back={{ href: "/admin/analytics", label: "All analytics" }} />

      <Grid cols={3} label="Headline figures">
        <StatCard label="Page views" value={nf.format(views)} />
        <StatCard label="People" value={nf.format(people)} hint="distinct visitors" />
        <StatCard label="Views per person" value={people ? (views / people).toFixed(1) : "—"}
          hint="how often they came back" />
      </Grid>

      <Grid cols={2}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Views a day" note={`Last ${DAYS} days`}>
            <Bars rows={days} label={`Views of ${path} per day`} />
          </Card>
        </div>
      </Grid>

      <Grid cols={3}>
        <Card title="Where they came from" note="Referring site">
          <DataList rows={listRows(referrers, "referrer")}
            empty="No referrers — visitors reached this page directly or from within the site." />
        </Card>
        <Card title="Devices" note="Visitors">
          <DataList
            rows={devices.map((d) => ({ key: String(d.device), label: titleCase(d.device), value: nf.format(Number(d.n ?? 0)) }))}
            empty="Nothing yet."
          />
        </Card>
        <Card title="Open it" note="See what a visitor sees, or fix what they found">
          <DataList
            empty=""
            rows={[
              { key: "live", label: "View the live page", value: "↗", href: `https://www.eduplana.org${path}`, external: true },
              ...(slug
                ? [{
                    key: "edit",
                    label: "Edit this school",
                    value: "→",
                    href: `/admin/collections/schools?where[slug][equals]=${encodeURIComponent(slug)}`,
                  }]
                : []),
            ]}
          />
        </Card>
      </Grid>
    </PageContainer>
  );
}

/* ---------------------------------------------------------- search detail -- */

async function SearchDetail({ query, run }: { query: string; run: (q: unknown) => Promise<Row[]> }) {
  const [totals, daily, devices] = await Promise.all([
    run(sql`select count(*)::int as times, count(distinct visitor)::int as people, max(results)::int as best
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
    <PageContainer>
      <PageHeader title={`“${query}”`} sub={`One search, over ${DAYS} days`}
        back={{ href: "/admin/analytics", label: "All analytics" }} />

      <Grid cols={3} label="Headline figures">
        <StatCard label="Searched" value={`${nf.format(times)}×`} />
        <StatCard label="People" value={nf.format(Number(t.people ?? 0))} hint="distinct visitors" />
        <StatCard label="Results returned" value={nf.format(best)}
          hint={best === 0 ? "nothing, every time" : "at most"} tone={best === 0 ? "warn" : undefined} />
      </Grid>

      <Grid cols={2}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Card title="Times searched a day" note={`Last ${DAYS} days`}>
            <Bars rows={days} label={`Searches for ${query} per day`} />
          </Card>
        </div>
      </Grid>

      <Grid cols={2}>
        <Card title="Devices" note="Searches">
          <DataList
            rows={devices.map((d) => ({ key: String(d.device), label: titleCase(d.device), value: nf.format(Number(d.n ?? 0)) }))}
            empty="Nothing yet."
          />
        </Card>
        <Card
          title={best === 0 ? "This search finds nothing" : "Run it yourself"}
          tone={best === 0 ? "warn" : undefined}
          note={
            best === 0
              ? "Somebody looked for this and the directory came back empty. Either the school is missing, or it is listed under a name nobody would type."
              : "See exactly what a visitor sees for this query."
          }
        >
          <DataList
            empty=""
            rows={[
              { key: "live", label: "Search the live site", value: "↗", href: `https://www.eduplana.org/schools?q=${encodeURIComponent(query)}`, external: true },
              { key: "add", label: "Add a school", value: "→", href: "/admin/collections/schools/create" },
            ]}
          />
        </Card>
      </Grid>
    </PageContainer>
  );
}
