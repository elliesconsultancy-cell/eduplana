import Link from "next/link";
import { headers as nextHeaders } from "next/headers";
import { getPayload, type Where } from "payload";
import config from "@payload-config";

import "./dashboard.css";

/**
 * The admin home, replacing Payload's stock dashboard entirely.
 *
 * The default view lists the collections — which the sidebar already does, two
 * inches to the left. For a directory this size the useful question on landing
 * is "what state is the data in?", so this answers it with live counts and puts
 * the two things people arrive wanting to do within one click.
 */
export async function Dashboard() {
  const payload = await getPayload({ config });

  // Accounts are managed by super-admins alone, so nobody else is offered
  // the controls — showing them would just produce a permission error on save.
  const { user } = await payload.auth({ headers: await nextHeaders() });
  const isSuperAdmin = user && "role" in user && user.role === "super-admin";

  const count = (where?: Where) =>
    payload.count({ collection: "schools", ...(where ? { where } : {}) });

  const [total, published, drafts, verified, primary, secondary, withPhotos, recent] =
    await Promise.all([
      count(),
      count({ _status: { equals: "published" } }),
      count({ _status: { equals: "draft" } }),
      count({ verified: { equals: true } }),
      count({ level: { equals: "primary" } }),
      count({ level: { equals: "secondary" } }),
      count({ "images.logo": { exists: true } }),
      payload.find({
        collection: "schools",
        limit: 6,
        sort: "-updatedAt",
        depth: 0,
        draft: true,
        select: { name: true, state: true, updatedAt: true, _status: true },
      }),
    ]);

  const stats = [
    { label: "Schools", value: total.totalDocs, hint: "in the directory" },
    { label: "Published", value: published.totalDocs, hint: "live on the site" },
    { label: "Drafts", value: drafts.totalDocs, hint: "not yet published" },
    { label: "Verified", value: verified.totalDocs, hint: "confirmed with the school" },
    { label: "Primary", value: primary.totalDocs, hint: "" },
    { label: "Secondary", value: secondary.totalDocs, hint: "" },
    { label: "With a logo", value: withPhotos.totalDocs, hint: "" },
  ];

  const formatted = new Intl.NumberFormat("en-NG");

  return (
    <div className="eduplana-dash eduplana-dash--view">
      <div className="eduplana-dash__head">
        <h2>Directory at a glance</h2>
        <div className="eduplana-dash__actions">
          <Link className="btn btn--style-primary btn--size-small" href="/admin/collections/schools/create">
            Add a school
          </Link>
          <Link className="btn btn--style-secondary btn--size-small" href="/admin/collections/schools">
            Browse all schools
          </Link>
          {isSuperAdmin ? (
            <>
              <Link
                className="btn btn--style-secondary btn--size-small"
                href="/admin/collections/users/create"
              >
                Add a user
              </Link>
              <Link
                className="btn btn--style-secondary btn--size-small"
                href="/admin/collections/users"
              >
                Manage users
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <ul className="eduplana-dash__stats">
        {stats.map((s) => (
          <li key={s.label}>
            <span className="eduplana-dash__value">{formatted.format(s.value)}</span>
            <span className="eduplana-dash__label">{s.label}</span>
            {s.hint ? <span className="eduplana-dash__hint">{s.hint}</span> : null}
          </li>
        ))}
      </ul>

      <div className="eduplana-dash__recent">
        <h3>Recently edited</h3>
        <ul>
          {recent.docs.map((doc) => {
            const d = doc as unknown as {
              id: string; name: string; state?: string | null;
              updatedAt: string; _status?: string;
            };
            return (
              <li key={d.id}>
                <Link href={`/admin/collections/schools/${d.id}`}>{d.name}</Link>
                <span className="eduplana-dash__meta">
                  {d.state ?? "No state"}
                  {d._status === "draft" ? " · Draft" : ""}
                  {" · "}
                  {new Date(d.updatedAt).toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
