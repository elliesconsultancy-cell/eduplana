import Link from "next/link";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { allSchools } from "@/lib/schools";
import {
  contacts,
  outreachMessage,
  recipients,
  sentInLastDay,
  settings,
  type Audience,
} from "@/lib/outreach/server";
import { SITE_URL } from "@/lib/site";
import { Card, Grid, PageContainer, PageHeader, StatCard, nf } from "./ui";
import "./outreach.css";

/**
 * Outreach: ask schools to check their own listings.
 *
 * Laid out in the order the work happens — where things stand, what the email
 * says, who it goes to — so the Send button sits under the preview of exactly
 * what will be sent rather than somewhere a person could press it unread.
 */
type Params = { [key: string]: string | string[] | undefined };
const one = (p: Params | undefined, k: string) => {
  const v = p?.[k];
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

export async function Outreach(props: AdminViewServerProps) {
  const { initPageResult, params, searchParams } = props;
  const payload = initPageResult.req.payload;
  const role = (initPageResult.req.user as { role?: string } | null)?.role;
  const canSend = role === "admin" || role === "super-admin";

  const state = one(searchParams, "state");
  const level = one(searchParams, "level");
  const audience: Audience = one(searchParams, "audience") === "reminder" ? "reminder" : "new";

  const [s, rows, sentToday, schools, pending] = await Promise.all([
    settings(payload),
    contacts(payload),
    sentInLastDay(payload),
    allSchools(),
    payload.count({ collection: "school-submissions", where: { status: { equals: "pending" } } }),
  ]);
  const matching = await recipients({ state, level, audience }, rows);
  const remaining = Math.max(0, s.dailyLimit - sentToday);

  const inboxes = new Set(schools.filter((x) => x.email).map((x) => x.email!.toLowerCase()));
  const optedOut = new Set(rows.filter((r) => r.optedOut).map((r) => r.email));
  const emailed = new Set(rows.filter((r) => r.sends > 0).map((r) => r.email));
  const reached = (statuses: string[]) => rows.filter((r) => statuses.includes(r.status)).length;

  const sample = matching[0];
  const preview = sample
    ? outreachMessage(s, sample, `${SITE_URL}/manage/(private link for this inbox)`)
    : null;

  const sent = one(searchParams, "sent");
  const error = one(searchParams, "error");
  const tested = one(searchParams, "tested");

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
      <PageContainer>
        <PageHeader
          title="Outreach"
          sub="Email schools a private link to check and correct their own listing. Nothing they change goes live until it is approved."
          actions={
            <>
              <Link className="ad-btn" href="/admin/globals/outreach-settings">
                Edit the email
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
            Sent {nf.format(Number(sent))} email{sent === "1" ? "" : "s"}.
          </p>
        ) : null}
        {tested ? (
          <p className="or-banner or-banner--ok" role="status">
            Test sent to {initPageResult.req.user?.email}. Its link works for a day, so you can try the whole
            journey.
          </p>
        ) : null}
        {error ? (
          <p className="or-banner or-banner--warn" role="alert">
            {error}
          </p>
        ) : null}

        <Grid cols={4} label="Outreach so far">
          <StatCard
            label="Inboxes emailed"
            value={nf.format(emailed.size)}
            hint={`of ${nf.format(inboxes.size - optedOut.size)} we can reach`}
          />
          <StatCard
            label="Schools that opened the link"
            value={nf.format(reached(["opened", "submitted", "approved"]))}
          />
          <StatCard label="Schools that replied" value={nf.format(reached(["submitted", "approved"]))} />
          <StatCard label="Approved and verified" value={nf.format(reached(["approved"]))} />
        </Grid>

        <Grid cols="wide">
          <Card
            title="The email"
            note={
              sample
                ? `As the first inbox in this list will receive it — ${sample.email}.`
                : "No inbox matches these filters, so there is nothing to preview."
            }
            aside={
              <Link className="ad-btn" href="/admin/globals/outreach-settings">
                Edit
              </Link>
            }
          >
            {preview ? (
              <div className="or-mail">
                <p className="or-mail__meta">
                  <span>From</span> {preview.from}
                </p>
                <p className="or-mail__meta">
                  <span>Subject</span> <strong>{preview.subject}</strong>
                </p>
                <pre className="or-mail__body">{preview.text}</pre>
              </div>
            ) : null}
          </Card>

          <Card
            title="Send"
            note={`${nf.format(sentToday)} sent in the last 24 hours. ${nf.format(remaining)} more allowed today.`}
            tone={remaining === 0 ? "warn" : undefined}
          >
            <form method="get" action="/admin/outreach" className="or-form">
              <label className="or-field">
                <span>Who</span>
                <select name="audience" defaultValue={audience}>
                  <option value="new">Schools not yet emailed</option>
                  <option value="reminder">Reminder: emailed over a week ago, link never opened</option>
                </select>
              </label>
              <label className="or-field">
                <span>State</span>
                <select name="state" defaultValue={state ?? ""}>
                  <option value="">All states</option>
                  {NIGERIAN_STATE_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
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
              <button type="submit" className="ad-btn">
                Update the count
              </button>
            </form>

            <p className="or-count">
              <strong>{nf.format(matching.length)}</strong> inbox{matching.length === 1 ? "" : "es"} match
              {matching.length === 1 ? "es" : ""}, covering{" "}
              {nf.format(matching.reduce((n, i) => n + i.schools.length, 0))} listings. Schools that share an
              inbox get one email between them.
            </p>

            {canSend ? (
              <>
                <form method="post" action="/admin-actions/outreach" className="or-form">
                  <input type="hidden" name="action" value="send" />
                  <input type="hidden" name="audience" value={audience} />
                  <input type="hidden" name="state" value={state ?? ""} />
                  <input type="hidden" name="level" value={level ?? ""} />
                  <label className="or-field">
                    <span>How many</span>
                    <input
                      type="number"
                      name="count"
                      min={1}
                      max={Math.max(1, Math.min(remaining, matching.length))}
                      defaultValue={Math.min(remaining, matching.length, 20)}
                      required
                    />
                  </label>
                  <label className="or-check">
                    <input type="checkbox" name="confirm" value="yes" required />
                    <span>I have sent myself a test and read it.</span>
                  </label>
                  <button
                    type="submit"
                    className="ad-btn ad-btn--primary"
                    disabled={remaining === 0 || matching.length === 0}
                  >
                    Send now
                  </button>
                </form>
                <form method="post" action="/admin-actions/outreach" className="or-form or-form--quiet">
                  <input type="hidden" name="action" value="test" />
                  <input type="hidden" name="audience" value={audience} />
                  <input type="hidden" name="state" value={state ?? ""} />
                  <input type="hidden" name="level" value={level ?? ""} />
                  <button type="submit" className="ad-btn" disabled={!sample || remaining === 0}>
                    Send me a test
                  </button>
                  <span className="or-hint">
                    Goes to {initPageResult.req.user?.email}, with a working link to {sample?.schools[0]?.name ?? "a sample school"}.
                  </span>
                </form>
              </>
            ) : (
              <p className="or-hint">Only admins can send. You can still see where outreach stands.</p>
            )}

            <p className="or-hint">
              Start small. A domain that has never sent mail before is judged on its first few hundred
              messages; twenty a day for the first week, then more, keeps them out of spam folders.
            </p>
          </Card>
        </Grid>

        <p className="or-foot">
          <Link href="/admin/collections/school-contacts">Every school contacted, with its status</Link>
          {" · "}
          {nf.format(optedOut.size)} inbox{optedOut.size === 1 ? " has" : "es have"} asked not to be emailed.
        </p>
      </PageContainer>
    </DefaultTemplate>
  );
}
