import Link from "next/link";
import type { ReactNode } from "react";

import "./ui.css";

/**
 * Shared admin primitives.
 *
 * The dashboard and the analytics screens previously each defined their own
 * card, stat, list and chart markup, which is why the same component had
 * different padding depending on which page you were looking at. These are the
 * single definitions; both screens compose from here.
 */

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
      <div>
        {back ? (
          <Link className="ad-head__eyebrow" href={back.href}>
            ← {back.label}
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
  cols: 2 | 3 | 4 | "wide";
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
  children,
}: {
  title?: string;
  note?: string;
  aside?: ReactNode;
  foot?: ReactNode;
  tone?: "warn";
  children: ReactNode;
}) {
  const id = title ? `ad-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : undefined;
  return (
    <section
      className={tone ? `ad-card ad-card--${tone}` : "ad-card"}
      aria-labelledby={id}
    >
      {title ? (
        <div className="ad-card__head">
          <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--ad-4)" }}>
            <h2 id={id}>{title}</h2>
            {aside}
          </div>
          {note ? <p className="ad-card__note">{note}</p> : null}
        </div>
      ) : null}
      {children}
      {foot ? <div className="ad-card__foot ad-card__foot--rule">{foot}</div> : null}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  change,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  change?: number | null;
  tone?: "warn";
}) {
  return (
    <div className={tone ? `ad-card ad-stat ad-stat--${tone}` : "ad-card ad-stat"}>
      <p className="ad-stat__row">
        <span className="ad-stat__value">{value}</span>
        {typeof change === "number" ? (
          <span className={`ad-chip ${change >= 0 ? "ad-chip--up" : "ad-chip--down"}`}>
            <span aria-hidden>{change >= 0 ? "▲" : "▼"}</span>
            <span className="u-sr-only">{change >= 0 ? "up" : "down"} </span>
            {Math.abs(change)}%
          </span>
        ) : null}
      </p>
      <span className="ad-stat__label">{label}</span>
      {hint ? <span className="ad-stat__hint">{hint}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ lists -- */

export interface ListRow {
  key: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}

export function DataList({ rows, empty }: { rows: ListRow[]; empty: string }) {
  if (!rows.length) return <p className="ad-empty">{empty}</p>;
  return (
    <ol className="ad-list">
      {rows.map((r) => (
        <li key={r.key}>
          {r.href ? (
            r.external ? (
              <a className="ad-list__label" href={r.href} target="_blank" rel="noreferrer">
                {r.label}
              </a>
            ) : (
              <Link className="ad-list__label" href={r.href}>
                {r.label}
              </Link>
            )
          ) : (
            <span className="ad-list__label">{r.label}</span>
          )}
          <em className="ad-list__value">{r.value}</em>
        </li>
      ))}
    </ol>
  );
}

/* ----------------------------------------------------------------- charts -- */

/** One series over N days. No legend: the card heading names it. */
export function Bars({ rows, label }: { rows: Array<{ day: string; n: number }>; label: string }) {
  const peak = Math.max(1, ...rows.map((r) => r.n));
  return (
    <figure className="ad-chart">
      <div className="ad-bars" role="img" aria-label={label}>
        {rows.map((r) => (
          <span key={r.day} style={{ height: `${(r.n / peak) * 100}%` }} title={`${r.day}: ${r.n}`} />
        ))}
      </div>
      <figcaption className="ad-chart__axis">
        <span>{rows[0]?.day.slice(5)}</span>
        <span>{rows[rows.length - 1]?.day.slice(5)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Two series over N days, drawn server-side.
 *
 * No charting library: one path per series, and the page ships no extra
 * JavaScript for it. Both series share one axis because visitors are a subset
 * of views, so a single scale is the honest comparison.
 */
export function TrendChart({
  days,
  label,
}: {
  days: Array<{ day: string; a: number; b: number }>;
  label: string;
}) {
  const W = 640;
  const H = 160;
  const peak = Math.max(1, ...days.flatMap((d) => [d.a, d.b]));
  const x = (i: number) => (i / Math.max(1, days.length - 1)) * W;
  const y = (v: number) => H - (v / peak) * (H - 12);
  const line = (k: "a" | "b") =>
    days.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");

  return (
    <figure className="ad-chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={label}>
        <defs>
          <linearGradient id="ad-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ad-accent)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--ad-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line("a")} L ${W} ${H} L 0 ${H} Z`} fill="url(#ad-fill)" />
        <path d={line("a")} fill="none" stroke="var(--ad-accent)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={line("b")} fill="none" stroke="var(--ad-series-2)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="ad-chart__axis">
        <span>{days[0]?.day.slice(5)}</span>
        <span>{days[days.length - 1]?.day.slice(5)}</span>
      </figcaption>
    </figure>
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
