import Link from "next/link";
import type { ReactNode } from "react";

import "./ui.css";

/**
 * Shared admin primitives: page frame, cards, stats, lists, meters, the gauge.
 *
 * Every admin screen composes from these, so a card has one padding and one
 * radius wherever it appears. Charts with a hover layer live in charts.tsx
 * (they need the browser) and are re-exported here so screens import from one
 * place.
 */

export { Bars, TrendChart } from "./charts";

export const nf = new Intl.NumberFormat("en-NG");

/* ------------------------------------------------------------------ shell -- */

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="ad ad-page">{children}</div>;
}

export function PageHeader({
  title,
  sub,
  back,
  actions,
}: {
  title: string;
  sub?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="ad-head">
      <div className="ad-head__text">
        {back ? (
          <Link className="ad-head__back" href={back.href}>
            {back.label}
          </Link>
        ) : null}
        <h1>{title}</h1>
        {sub ? <p className="ad-head__sub">{sub}</p> : null}
      </div>
      {actions ? (
        <nav className="ad-head__actions" aria-label="Page actions">
          {actions}
        </nav>
      ) : null}
    </header>
  );
}

export function Grid({
  cols,
  children,
  label,
}: {
  cols: 2 | 3 | 4 | "wide" | "wide-left";
  children: ReactNode;
  label?: string;
}) {
  return (
    <section className={`ad-grid ad-grid--${cols}`} aria-label={label}>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ cards -- */

export function Card({
  title,
  note,
  aside,
  foot,
  tone,
  flush,
  children,
}: {
  title?: string;
  note?: string;
  aside?: ReactNode;
  foot?: ReactNode;
  tone?: "warn";
  /** Content runs to the card's edges (tables, the gauge's footer strip). */
  flush?: boolean;
  children: ReactNode;
}) {
  const id = title ? `ad-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;
  return (
    <section
      className={["ad-card", tone && `ad-card--${tone}`, flush && "ad-card--flush"].filter(Boolean).join(" ")}
      aria-labelledby={id}
    >
      {title ? (
        <div className="ad-card__head">
          <div>
            <h2 id={id}>{title}</h2>
            {note ? <p className="ad-card__note">{note}</p> : null}
          </div>
          {aside ? <div className="ad-card__aside">{aside}</div> : null}
        </div>
      ) : null}
      <div className="ad-card__body">{children}</div>
      {foot ? <div className="ad-card__foot">{foot}</div> : null}
    </section>
  );
}

/** Up or down against the previous period, as a pill. */
export function Delta({ change }: { change: number | null | undefined }) {
  if (typeof change !== "number") return null;
  const up = change >= 0;
  return (
    <span className={`ad-delta ${up ? "ad-delta--up" : "ad-delta--down"}`}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
        <path d={up ? "M6 10V2M2.5 5.5 6 2l3.5 3.5" : "M6 2v8M2.5 6.5 6 10l3.5-3.5"} fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="u-sr-only">{up ? "up" : "down"} </span>
      {Math.abs(change)}%
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  change,
  tone,
  icon,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  tone?: "warn";
  icon?: ReactNode;
  href?: string;
}) {
  const body = (
    <>
      {icon ? <span className="ad-stat__icon" aria-hidden>{icon}</span> : null}
      <span className="ad-stat__label">{label}</span>
      <span className="ad-stat__row">
        <span className="ad-stat__value">{value}</span>
        <Delta change={change} />
      </span>
      {hint ? <span className="ad-stat__hint">{hint}</span> : null}
    </>
  );
  const cls = ["ad-card", "ad-stat", tone && `ad-stat--${tone}`].filter(Boolean).join(" ");
  return href ? (
    <Link className={`${cls} ad-stat--link`} href={href}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ------------------------------------------------------------------ lists -- */

export interface ListRow {
  key: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
  /** A second line under the label. */
  sub?: string;
}

export function DataList({ rows, empty }: { rows: ListRow[]; empty: ReactNode }) {
  if (!rows.length) return <div className="ad-empty">{empty}</div>;
  return (
    <ol className="ad-list">
      {rows.map((r) => {
        const label = (
          <>
            <span className="ad-list__label">{r.label}</span>
            {r.sub ? <span className="ad-list__sub">{r.sub}</span> : null}
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              r.external ? (
                <a className="ad-list__main" href={r.href} target="_blank" rel="noreferrer">
                  {label}
                </a>
              ) : (
                <Link className="ad-list__main" href={r.href}>
                  {label}
                </Link>
              )
            ) : (
              <span className="ad-list__main">{label}</span>
            )}
            <span className="ad-list__value">{r.value}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Label, count and a bar showing its share of the largest. */
export function Meters({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: string; n: number; href?: string }>;
  empty: ReactNode;
}) {
  if (!rows.length) return <div className="ad-empty">{empty}</div>;
  const total = rows.reduce((a, r) => a + r.n, 0) || 1;
  return (
    <ul className="ad-meters">
      {rows.map((r) => {
        const share = Math.round((r.n / total) * 100);
        return (
          <li key={r.key}>
            <span className="ad-meters__top">
              {r.href ? (
                <Link href={r.href} className="ad-meters__label">{r.label}</Link>
              ) : (
                <span className="ad-meters__label">{r.label}</span>
              )}
              <span className="ad-meters__n">
                {nf.format(r.n)} <span>{share}%</span>
              </span>
            </span>
            <span className="ad-meters__track" aria-hidden>
              <span className="ad-meters__fill" style={{ width: `${Math.max(2, share)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ gauge -- */

/**
 * A half-circle showing one share of a whole. Used for a single headline
 * proportion, never for comparisons — those are bars.
 */
export function Gauge({ value, total, label }: { value: number; total: number; label: string }) {
  const share = total > 0 ? value / total : 0;
  const pct = share * 100;
  const R = 90;
  const len = Math.PI * R;
  const shown = pct > 0 && pct < 1 ? "<1" : String(Math.round(pct));
  return (
    <div className="ad-gauge">
      <svg viewBox="0 0 220 124" role="img" aria-label={`${label}: ${shown}%`}>
        <path d="M20 110 A90 90 0 0 1 200 110" className="ad-gauge__track" pathLength={len} />
        {/* No fill at zero: a zero-length dash with round caps still paints a dot at each end. */}
        {share > 0 ? (
          <path d="M20 110 A90 90 0 0 1 200 110" className="ad-gauge__fill" pathLength={len}
            strokeDasharray={`${Math.max(3, share * len)} ${len * 2}`} />
        ) : null}
      </svg>
      <p className="ad-gauge__value">
        {shown}
        <span>%</span>
      </p>
    </div>
  );
}

/** A row of figures under a card, separated by hairlines: the gauge's funnel. */
export function FigureStrip({ items }: { items: Array<{ label: string; value: string; href?: string }> }) {
  return (
    <dl className="ad-strip">
      {items.map((i) => (
        <div key={i.label}>
          <dt>{i.label}</dt>
          <dd>{i.href ? <Link href={i.href}>{i.value}</Link> : i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Legend({ a, b }: { a: string; b: string }) {
  return (
    <p className="ad-legend">
      <span>
        <i className="ad-key ad-key--1" aria-hidden /> {a}
      </span>
      <span>
        <i className="ad-key ad-key--2" aria-hidden /> {b}
      </span>
    </p>
  );
}
