import Link from "next/link";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { BadgeCheck, Mail, MailOpen, MessageSquareReply } from "lucide-react";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { allSchools } from "@/lib/schools";
import {
  MAX_ADDRESSES,
  MAX_TEST_RECIPIENTS,
  contacts,
  generalMessage,
  outreachMessage,
  planAddresses,
  recentSends,
  recipients,
  sentInLastDay,
  settings,
  splitAddresses,
  type Audience,
  type PlanStatus,
} from "@/lib/outreach/server";
import { schoolNames } from "@/lib/outreach/mail";
import { SITE_URL } from "@/lib/site";
import { Card, Grid, PageContainer, PageHeader, StatCard, nf } from "./ui";
import "./outreach.css";

/**
 * Outreach: ask schools to check their own listings.
 *
 * Every send is two steps. Preview produces the exact list of who will be
 * emailed; Send emails that list and nothing else. Nobody has to guess which
 * schools a button press reaches, and a "Recently sent" table underneath shows
 * who already has been.
 *
 * Two ways in: schools from the directory, filtered by state and level, or
 * addresses pasted by hand.
 */
type Params = { [key: string]: string | string[] | undefined };
const one = (p: Params | undefined, k: string) => {
  const v = p?.[k];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Africa/Lagos" }) : "";

const where = (schools: Array<{ area: string | null; state: string | null }>) =>
  [schools[0]?.area, schools[0]?.state].filter(Boolean).join(", ");

/** A school's primary and secondary listings share a name; show it once. */
const names = (schools: Array<{ name: string }>) => schoolNames(schools.map((s) => s.name));

const STATUS: Record<string, { label: string; tone: string }> = {
  none: { label: "Not emailed", tone: "" },
  sent: { label: "Emailed", tone: "ad-pill--brand" },
  opened: { label: "Opened the link", tone: "ad-pill--brand" },
  submitted: { label: "Sent changes", tone: "ad-pill--warn" },
  approved: { label: "Verified", tone: "ad-pill--up" },
};

const PLAN: Record<PlanStatus, { label: string; tone: string; sends: boolean }> = {
  listing: { label: "Gets their private link", tone: "ad-pill--brand", sends: true },
  general: { label: "Not on Eduplana: gets the general email", tone: "", sends: true },
  "sent-before": { label: "Already emailed, skipped", tone: "ad-pill--warn", sends: false },
  "opted-out": { label: "Unsubscribed, skipped", tone: "ad-pill--down", sends: false },
  invalid: { label: "Not a valid address, skipped", tone: "ad-pill--down", sends: false },
  duplicate: { label: "Listed twice, skipped", tone: "", sends: false },
};

export async function Outreach(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props;
  const payload = initPageResult.req.payload;
  const me = initPageResult.req.user as { role?: string; email?: string } | null;
  const canSend = me?.role === "admin" || me?.role === "super-admin";

  const tab = one(searchParams, "tab") === "addresses" ? "addresses" : "directory";
  const state = one(searchParams, "state");
  const level = one(searchParams, "level");
  const audience: Audience = one(searchParams, "audience") === "reminder" ? "reminder" : "new";
  const pasted = one(searchParams, "to") ?? "";
  const includeSent = one(searchParams, "includeSent") === "yes";

  const [s, rows, sentToday, schools, pending, recent] = await Promise.all([
    settings(payload),
    contacts(payload),
    sentInLastDay(payload),
    allSchools(),
    payload.count({ collection: "school-submissions", where: { status: { equals: "pending" } } }),
    recentSends(12, payload),
  ]);
  const remaining = Math.max(0, s.dailyLimit - sentToday);

  const matching = await recipients({ state, level, audience }, rows);
  const requested = Number(one(searchParams, "count") ?? Math.min(20, remaining));
  const count = Math.max(0, Math.min(requested || 0, remaining, matching.length));
  const chosen = matching.slice(0, count);

  const plan = pasted ? await planAddresses(splitAddresses(pasted), includeSent, rows) : [];
  const willSend = plan.filter((p) => PLAN[p.status].sends);

  const inboxes = new Set(schools.filter((x) => x.email).map((x) => x.email!.toLowerCase()));
  const optedOut = new Set(rows.filter((r) => r.optedOut).map((r) => r.email));
  const emailed = new Set(rows.filter((r) => r.sends > 0).map((r) => r.email));
  const reached = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length;

  const sample = chosen[0] ?? matching[0];
  const preview = sample ? outreachMessage(s, sample, `${SITE_URL}/manage/(private link for this inbox)`) : null;
  const general = generalMessage(s, "school@example.com");

  const sent = one(searchParams, "sent");
  const of = one(searchParams, "of");
  const error = one(searchParams, "error");
  const tested = one(searchParams, "tested");

  const filterQuery = () => {
    const q = new URLSearchParams();
    if (state) q.set("state", state);
    if (level) q.set("level", level);
    q.set("audience", audience);
    return q.toString();
  };

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
      // Payload passes header actions only to its own views.
      viewActions={payload.config.admin.components?.actions}
    >
      <PageContainer>
        <PageHeader
          title="Email schools"
          sub="Send schools a private link to check and correct their own listing. Nothing they change goes live until it is approved."
          actions={
            <>
              <Link className="ad-btn" href="/admin/globals/outreach-settings">
                Edit the emails
              </Link>
              <Link
                className={pending.totalDocs > 0 ? "ad-btn ad-btn--primary" : "ad-btn"}
                href="/admin/collections/school-submissions?where[status][equals]=pending"
              >
                Review submissions{pending.totalDocs > 0 ? ` (${pending.totalDocs})` : ""}
              </Link>
            </>
          }
        />

        {sent ? (
          <p className="or-banner or-banner--ok" role="status">
            Sent {nf.format(Number(sent))}
            {of && of !== sent ? ` of ${nf.format(Number(of))}` : ""} email{sent === "1" ? "" : "s"}. They are
            listed under Recently sent below.
          </p>
        ) : null}
        {tested ? (
          <p className="or-banner or-banner--ok" role="status">
            Test sent to {tested === "1" ? me?.email : tested}.
            {one(searchParams, "testKind") === "general" ? "" : " Each link works for a day, so you can try the whole journey."}
          </p>
        ) : null}
        {error ? (
          <p className="or-banner or-banner--warn" role="alert">
            {error}
          </p>
        ) : null}

        <Grid cols={4} label="Outreach so far">
          <StatCard icon={<Mail size={22} />} label="Inboxes emailed" value={nf.format(emailed.size)}
            hint={`Of ${nf.format(inboxes.size - optedOut.size)} on Eduplana we can reach`} />
          <StatCard icon={<MailOpen size={22} />} label="Schools that opened the link"
            value={nf.format(reached(["opened", "submitted", "approved"]))} />
          <StatCard icon={<MessageSquareReply size={22} />} label="Schools that replied"
            value={nf.format(reached(["submitted", "approved"]))} />
          <StatCard icon={<BadgeCheck size={22} />} label="Approved and verified" value={nf.format(reached(["approved"]))} />
        </Grid>

        <nav className="or-tabs" aria-label="How to choose recipients">
          <Link href={`/admin/outreach?${filterQuery()}`} className={tab === "directory" ? "is-active" : ""}
            aria-current={tab === "directory" ? "page" : undefined}>
            Schools in the directory
          </Link>
          <Link href="/admin/outreach?tab=addresses" className={tab === "addresses" ? "is-active" : ""}
            aria-current={tab === "addresses" ? "page" : undefined}>
            Specific addresses
          </Link>
          <span className="or-tabs__quota">
            {nf.format(sentToday)} sent in the last 24 hours, {nf.format(remaining)} more allowed today
          </span>
        </nav>

        {tab === "directory" ? (
          <Grid cols="wide">
            <Card
              title="Who will receive it"
              note={
                count > 0
                  ? `These ${nf.format(chosen.length)} inbox${chosen.length === 1 ? "" : "es"} will be emailed, in this order. Schools that share an inbox get one email between them.`
                  : remaining === 0
                    ? "Today's limit has been reached. Come back tomorrow."
                    : "No inbox matches these filters."
              }
            >
              <form method="get" action="/admin/outreach" className="or-form">
                <label className="or-field">
                  <span>Who</span>
                  <select name="audience" defaultValue={audience}>
                    <option value="new">Not emailed yet</option>
                    <option value="reminder">Reminder: emailed a week ago, never opened</option>
                  </select>
                </label>
                <label className="or-field">
                  <span>State</span>
                  <select name="state" defaultValue={state ?? ""}>
                    <option value="">All states</option>
                    {NIGERIAN_STATE_NAMES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="or-field">
                  <span>Level</span>
                  <select name="level" defaultValue={level ?? ""}>
                    <option value="">Primary and secondary</option>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                  </select>
                </label>
                <label className="or-field">
                  <span>How many</span>
                  <input type="number" name="count" min={1} max={Math.max(1, remaining)} defaultValue={count || 1} />
                </label>
                <button type="submit" className="ad-btn">
                  Preview recipients
                </button>
              </form>
              <p className="or-hint">
                {nf.format(matching.length)} inbox{matching.length === 1 ? "" : "es"} match in total, covering{" "}
                {nf.format(matching.reduce((n, i) => n + i.schools.length, 0))} listings.
              </p>

              {chosen.length ? (
                <div className="or-list">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th scope="col">School</th>
                        <th scope="col">Email</th>
                        <th scope="col">Where</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chosen.map((i) => (
                        <tr key={i.email}>
                          <th scope="row" title={i.schools.map((x) => x.name).join(", ")}>
                            {names(i.schools)}
                          </th>
                          <td>{i.email}</td>
                          <td className="ad-table__muted">{where(i.schools)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {canSend && chosen.length ? (
                <form method="post" action="/admin-actions/outreach" className="or-send">
                  <input type="hidden" name="action" value="send" />
                  <input type="hidden" name="audience" value={audience} />
                  <input type="hidden" name="state" value={state ?? ""} />
                  <input type="hidden" name="level" value={level ?? ""} />
                  <input type="hidden" name="emails" value={chosen.map((i) => i.email).join("\n")} />
                  <label className="or-check">
                    <input type="checkbox" name="confirm" value="yes" required />
                    <span>I have sent myself a test and checked this list.</span>
                  </label>
                  <button type="submit" className="ad-btn ad-btn--primary">
                    Send to these {nf.format(chosen.length)}
                  </button>
                </form>
              ) : null}
              {!canSend ? <p className="or-hint">Only admins can send.</p> : null}
            </Card>

            <Card
              title="The email"
              note={sample ? `As ${sample.email} will receive it.` : "Nothing to preview for these filters."}
              aside={
                <Link className="ad-btn ad-btn--small" href="/admin/globals/outreach-settings">
                  Edit
                </Link>
              }
            >
              {preview ? <MailPreview from={preview.from} subject={preview.subject} html={preview.html} /> : null}
              {canSend ? (
                <TestForm action="test" me={me?.email ?? ""} disabled={!sample || remaining === 0}
                  hidden={{ audience, state: state ?? "", level: level ?? "" }}
                  note="Each gets a working link to this sample school, so you can try the whole journey." />
              ) : null}
            </Card>
          </Grid>
        ) : (
          <>
            <Grid cols="wide">
              <Card
                title="Addresses"
                note={`Paste up to ${MAX_ADDRESSES} email addresses, separated by commas, spaces or new lines. Check them first to see what each one will get.`}
              >
                <form method="get" action="/admin/outreach" className="or-addr">
                  <input type="hidden" name="tab" value="addresses" />
                  <label className="u-sr-only" htmlFor="or-to">
                    Email addresses
                  </label>
                  <textarea id="or-to" name="to" rows={8} defaultValue={pasted}
                    placeholder={"admissions@school-one.com, info@school-two.ng\nhello@school-three.com"} />
                  <label className="or-check">
                    <input type="checkbox" name="includeSent" value="yes" defaultChecked={includeSent} />
                    <span>Include addresses we have already emailed</span>
                  </label>
                  <button type="submit" className="ad-btn">
                    Check addresses
                  </button>
                </form>
              </Card>

              <Card
                title="For schools not on Eduplana"
                note="Addresses that belong to no listing get this instead, since there is no listing to link to."
                aside={
                  <Link className="ad-btn ad-btn--small" href="/admin/globals/outreach-settings">
                    Edit
                  </Link>
                }
              >
                <MailPreview from={general.from} subject={general.subject} html={general.html} />
                {canSend ? (
                  <TestForm action="test-general" me={me?.email ?? ""} disabled={remaining === 0} hidden={{}} />
                ) : null}
              </Card>
            </Grid>

            {plan.length ? (
              <Card
                title="What will happen"
                note={`${nf.format(willSend.length)} of ${nf.format(plan.length)} will be emailed${
                  willSend.length > remaining
                    ? `, but only ${nf.format(remaining)} more are allowed today. The rest will need sending tomorrow`
                    : ""
                }.`}
              >
                <div className="or-list or-list--tall">
                  <table className="ad-table">
                    <thead>
                      <tr>
                        <th scope="col">Address</th>
                        <th scope="col">What happens</th>
                        <th scope="col">Listing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.map((p, n) => (
                        <tr key={`${p.email}-${n}`}>
                          <th scope="row">{p.email}</th>
                          <td>
                            <span className={`ad-pill ${PLAN[p.status].tone}`}>
                              {PLAN[p.status].label}
                              {p.status === "sent-before" && p.lastSentAt ? ` (${date(p.lastSentAt)})` : ""}
                            </span>
                          </td>
                          <td className="ad-table__muted">{p.schools.length ? names(p.schools) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {canSend && willSend.length ? (
                  <form method="post" action="/admin-actions/outreach" className="or-send">
                    <input type="hidden" name="action" value="send-addresses" />
                    <input type="hidden" name="addresses" value={pasted} />
                    <input type="hidden" name="includeSent" value={includeSent ? "yes" : ""} />
                    <label className="or-check">
                      <input type="checkbox" name="confirm" value="yes" required />
                      <span>I have checked this list.</span>
                    </label>
                    <button type="submit" className="ad-btn ad-btn--primary" disabled={remaining === 0}>
                      Send {nf.format(Math.min(willSend.length, remaining))} email
                      {Math.min(willSend.length, remaining) === 1 ? "" : "s"}
                    </button>
                  </form>
                ) : null}
              </Card>
            ) : null}
          </>
        )}

        <div style={{ marginTop: "var(--ad-5)" }}>
          <Card
            title="Recently sent"
            note="The latest schools and addresses emailed, newest first"
            aside={
              <Link className="ad-btn ad-btn--small" href="/admin/collections/school-contacts">
                Everyone emailed
              </Link>
            }
          >
            {recent.length ? (
              <div className="ad-table-wrap">
                <table className="ad-table">
                  <thead>
                    <tr>
                      <th scope="col">School</th>
                      <th scope="col">Email</th>
                      <th scope="col">Where it stands</th>
                      <th scope="col">Emailed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.school}>
                        <th scope="row">{r.name}</th>
                        <td>{r.email}</td>
                        <td>
                          <span className={`ad-pill ${STATUS[r.status]?.tone ?? ""}`}>
                            {STATUS[r.status]?.label ?? r.status}
                          </span>
                        </td>
                        <td className="ad-table__muted">{date(r.lastSentAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="ad-empty">Nothing sent yet. Every email you send is listed here.</div>
            )}
          </Card>
        </div>

        <p className="or-foot">
          {nf.format(optedOut.size)} address{optedOut.size === 1 ? " has" : "es have"} unsubscribed and will never be
          emailed again. A new domain is judged on its first few hundred messages: about twenty a day for the first
          week keeps them out of spam folders.
        </p>
      </PageContainer>
    </DefaultTemplate>
  );
}

/**
 * The email exactly as it will arrive, drawn in a sandboxed frame so its own
 * styles cannot leak into the admin, and nothing in it can run.
 */
function MailPreview({ from, subject, html }: { from: string; subject: string; html: string }) {
  return (
    <div className="or-mail">
      <p className="or-mail__meta">
        <span>From</span> {from}
      </p>
      <p className="or-mail__meta">
        <span>Subject</span> <strong>{subject}</strong>
      </p>
      <iframe className="or-mail__frame" title={`Preview: ${subject}`} srcDoc={html} sandbox="" loading="lazy" />
    </div>
  );
}

/** Send a test to one or more addresses, defaulting to the person signed in. */
function TestForm({
  action,
  me,
  disabled,
  hidden,
  note,
}: {
  action: "test" | "test-general";
  me: string;
  disabled: boolean;
  hidden: Record<string, string>;
  note?: string;
}) {
  const id = `or-test-${action}`;
  return (
    <form method="post" action="/admin-actions/outreach" className="or-test">
      <input type="hidden" name="action" value={action} />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label htmlFor={id} className="or-test__label">
        Send a test to
      </label>
      <div className="or-test__row">
        <input id={id} name="testTo" type="text" defaultValue={me} autoComplete="off"
          placeholder="you@eduplana.org, colleague@eduplana.org" />
        <button type="submit" className="ad-btn" disabled={disabled}>
          Send test
        </button>
      </div>
      <p className="or-hint">
        Up to {MAX_TEST_RECIPIENTS} addresses, separated by commas. Marked [Test] in the subject.
        {note ? ` ${note}` : ""}
      </p>
    </form>
  );
}
