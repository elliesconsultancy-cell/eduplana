import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { sql } from "drizzle-orm";
import { getPayload, type Where } from "payload";
import config from "@payload-config";

import "./dashboard.css";

/**
 * The admin home.
 *
 * Payload's stock dashboard lists the collections, which the sidebar already
 * does two inches to the left. The useful question on landing is "what state is
 * the directory in, and what do people want from it" — so that is what this
 * answers, in that order.
 *
 * The opening element is coverage by state rather than a row of totals. The
 * single most actionable fact about a national directory is how unevenly it
 * covers the nation: a count of 7,375 tells you nothing you can act on, while
 * the shape of the tail tells you where to work next.
 */
interface Row {
  [key: string]: unknown;
}

/** Nigerian states as they appear on a form: three letters, FCT kept whole. */
function code(state: string): string {
  if (state.startsWith("FCT")) return "FCT";
  return state.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
}

export async function Dashboard() {
  const payload = await getPayload({ config });
  const db = payload.db as unknown as {
    drizzle: { execute: (q: unknown) => Promise<{ rows?: Row[] } | Row[]> };
  };
  const query = async (q: unknown): Promise<Row[]> => {
    try {
      const result = await db.drizzle.execute(q);
      return (Array.isArray(result) ? result : (result.rows ?? [])) as Row[];
    } catch {
      return [];
    }
  };

  const { user } = await payload.auth({ headers: await nextHeaders() });
  const isSuperAdmin = user && "role" in user && user.role === "super-admin";

  const count = (where?: Where) =>
    payload.count({ collection: "schools", ...(where ? { where } : {}) });

  const [total, drafts, verified, noPhotos, byState, gaps, opened, recent] = await Promise.all([
    count(),
    count({ _status: { equals: "draft" } }),
    count({ verified: { equals: true } }),
    count({ "images.logo": { exists: false } }),
    query(sql`
      select state, count(*)::int as n
      from schools
      where _status = 'published' and state is not null
      group by state order by n desc
    `),
    query(sql`
      select query, count(*)::int as n
      from events
      where type = 'search' and results = 0 and query is not null and query <> ''
        and created_at > now() - interval '30 days'
      group by 1 order by n desc limit 5
    `),
    query(sql`
      select e.slug, count(*)::int as n, max(s.name) as name
      from events e left join schools s on s.slug = e.slug
      where e.type = 'view' and e.slug is not null
        and e.created_at > now() - interval '30 days'
      group by e.slug order by n desc limit 5
    `),
    payload.find({
      collection: "schools",
      limit: 5,
      sort: "-updatedAt",
      depth: 0,
      draft: true,
      select: { name: true, state: true, updatedAt: true, _status: true },
    }),
  ]);

  const nf = new Intl.NumberFormat("en-NG");
  const states = byState.map((r) => ({ state: String(r.state), n: Number(r.n ?? 0) }));
  const peak = Math.max(1, ...states.map((s) => s.n));
  const published = states.reduce((sum, s) => sum + s.n, 0);
  const largest = states[0];
  const thin = states.filter((s) => s.n < 50).length;
  const share = largest && published ? Math.round(published / largest.n) : 0;

  return (
    <div className="ep-dash">
      <header className="ep-dash__head">
        <div className="ep-dash__title">
          <p className="ep-dash__eyebrow">Eduplana</p>
          <h2>The directory</h2>
          <p className="ep-dash__sub">
            <b>{nf.format(total.totalDocs)}</b> schools across 36 states and the FCT
          </p>
        </div>
        <nav className="ep-dash__actions" aria-label="Directory actions">
          <Link className="btn btn--style-primary btn--size-small" href="/admin/collections/schools/create">
            Add a school
          </Link>
          <Link className="btn btn--style-secondary btn--size-small" href="/admin/collections/schools">
            Browse schools
          </Link>
          <Link className="btn btn--style-secondary btn--size-small" href="/admin/analytics">
            Analytics
          </Link>
          {isSuperAdmin ? (
            <Link className="btn btn--style-secondary btn--size-small" href="/admin/collections/users">
              People
            </Link>
          ) : null}
        </nav>
      </header>

      {/* The signature: the shape of the directory, state by state. */}
      {states.length > 0 ? (
        <section className="ep-cov" aria-labelledby="ep-cov-h">
          <div className="ep-cov__label">
            <h3 id="ep-cov-h">Coverage by state</h3>
            <p>
              {largest ? (
                <>
                  {largest.state} holds 1 in every {share} schools listed.{" "}
                  {thin > 0 ? (
                    <>
                      {thin} states have fewer than 50 — that tail is where the directory is
                      thinnest.
                    </>
                  ) : null}
                </>
              ) : null}
            </p>
          </div>
          <ol className="ep-cov__plot">
            {states.map((s) => (
              <li
                key={s.state}
                /* The quiet tone marks exactly the tail the sentence above
                   names, so the split encodes the finding rather than an
                   arbitrary "top N". */
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

      <div className="ep-dash__cols">
        {/* A worklist, not a scoreboard: each row is something to go and do. */}
        <section className="ep-card" aria-labelledby="ep-work-h">
          <h3 id="ep-work-h">Needs a human</h3>
          <p className="ep-card__note">Records a person still has to look at.</p>
          <ul className="ep-work">
            <Work
              label="Unverified"
              value={nf.format(total.totalDocs - verified.totalDocs)}
              note="no school has been confirmed with a human yet"
              href="/admin/collections/schools?where[verified][equals]=false"
              tone="gold"
            />
            <Work
              label="No logo"
              value={nf.format(noPhotos.totalDocs)}
              note="profile renders with initials instead"
              href="/admin/collections/schools"
            />
            <Work
              label="Unpublished drafts"
              value={nf.format(drafts.totalDocs)}
              note="edited but not yet live"
              href="/admin/collections/schools?where[_status][equals]=draft"
            />
          </ul>
        </section>

        <section className="ep-card" aria-labelledby="ep-want-h">
          <h3 id="ep-want-h">What people looked for</h3>
          <p className="ep-card__note">
            From the directory’s own search, over 30 days. <Link href="/admin/analytics">See all</Link>
          </p>

          <h4 className="ep-card__sub ep-card__sub--gold">Found nothing</h4>
          {gaps.length ? (
            <ol className="ep-rows">
              {gaps.map((g) => (
                <li key={String(g.query)}>
                  <span>{String(g.query)}</span>
                  <em>{nf.format(Number(g.n ?? 0))}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ep-empty">
              Nothing yet. When a search comes back with no results it lands here — each row a
              school somebody wanted and the directory does not carry.
            </p>
          )}

          <h4 className="ep-card__sub">Most opened</h4>
          {opened.length ? (
            <ol className="ep-rows">
              {opened.map((o) => (
                <li key={String(o.slug)}>
                  <span>{String(o.name ?? o.slug)}</span>
                  <em>{nf.format(Number(o.n ?? 0))}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="ep-empty">
              Nothing yet. The schools people open most will rank here, which is the list worth
              approaching first.
            </p>
          )}
        </section>
      </div>

      <section className="ep-card ep-card--wide" aria-labelledby="ep-recent-h">
        <h3 id="ep-recent-h">Recently edited</h3>
        <ul className="ep-recent">
          {recent.docs.map((d) => (
            <li key={d.id}>
              <Link href={`/admin/collections/schools/${d.id}`}>{d.name}</Link>
              <span className="ep-recent__meta">
                {d.state ? `${d.state} · ` : ""}
                {new Date(d.updatedAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Work({
  label,
  value,
  note,
  href,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  href: string;
  tone?: "gold";
}) {
  return (
    <li className={tone ? `ep-work__row ep-work__row--${tone}` : "ep-work__row"}>
      <Link href={href}>
        <em>{value}</em>
        <span className="ep-work__label">{label}</span>
        <span className="ep-work__note">{note}</span>
      </Link>
    </li>
  );
}
