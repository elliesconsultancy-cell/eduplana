"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * The dashboard's two time-series charts, with their hover layer.
 *
 * Hand-drawn SVG rather than a charting library: two shapes do not justify the
 * weight. The crosshair snaps to the nearest day and the readout lists every
 * series at that day, so nobody has to land the pointer on a 2px line. The same
 * readout follows the arrow keys when the chart has focus, and a visually
 * hidden table carries every value for screen readers.
 */

const day = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

const nf = new Intl.NumberFormat("en-NG");

/**
 * The top of the axis: four equal steps of a round size (1, 2 or 5 times a
 * power of ten), so every gridline lands on a whole, readable count.
 */
function niceMax(n: number): number {
  const raw = Math.max(1, n / 4);
  const pow = 10 ** Math.floor(Math.log10(raw));
  // 2.5 only from tens upwards, where it still makes whole numbers (25, 250).
  const steps = pow >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  const step = (steps.find((s) => s * pow >= raw) ?? 10) * pow;
  return Math.max(4, Math.ceil(step) * 4);
}

function useScrub(count: number) {
  const [at, setAt] = useState<number | null>(null);
  const onPointer = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setAt(Math.round(ratio * (count - 1)));
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") setAt((i) => Math.min(count - 1, (i ?? -1) + 1));
    else if (e.key === "ArrowLeft") setAt((i) => Math.max(0, (i ?? count) - 1));
    else if (e.key === "Escape") setAt(null);
    else return;
    e.preventDefault();
  };
  return { at, setAt, onPointer, onKey };
}

function Axis({ max }: { max: number }) {
  return (
    <div className="ch-y" aria-hidden>
      {[max, max * 0.75, max / 2, max / 4, 0].map((v) => (
        <span key={v}>{nf.format(v)}</span>
      ))}
    </div>
  );
}

export function TrendChart({
  days,
  label,
  names = ["Page views", "Visitors"],
}: {
  days: Array<{ day: string; a: number; b: number }>;
  label: string;
  names?: [string, string];
}) {
  const id = useId();
  const W = 1000;
  const H = 240;
  const max = niceMax(Math.max(1, ...days.flatMap((d) => [d.a, d.b])));
  const x = (i: number) => (i / Math.max(1, days.length - 1)) * W;
  const y = (v: number) => H - (v / max) * H;
  const path = (k: "a" | "b") =>
    days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d[k]).toFixed(1)}`).join(" ");
  const { at, setAt, onPointer, onKey } = useScrub(days.length);
  const point = at == null ? null : days[at];
  const left = at == null ? 0 : (at / Math.max(1, days.length - 1)) * 100;

  return (
    <figure className="ch">
      <div className="ch-frame">
        <Axis max={max} />
        <div
          className="ch-plot"
          tabIndex={0}
          role="img"
          aria-label={`${label}. Use the arrow keys to read each day.`}
          onPointerMove={onPointer}
          onPointerLeave={() => setAt(null)}
          onKeyDown={onKey}
          onBlur={() => setAt(null)}
        >
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ep-brand)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="var(--ep-brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="ch-grid" vectorEffect="non-scaling-stroke" />
            ))}
            <path d={`${path("a")} L${W} ${H} L0 ${H} Z`} fill={`url(#${id}-fill)`} />
            <path d={path("a")} className="ch-line ch-line--a" vectorEffect="non-scaling-stroke" />
            <path d={path("b")} className="ch-line ch-line--b" vectorEffect="non-scaling-stroke" />
          </svg>
          {point ? (
            <>
              <span className="ch-cross" style={{ left: `${left}%` }} aria-hidden />
              <span className="ch-dot ch-dot--a" style={{ left: `${left}%`, top: `${(y(point.a) / H) * 100}%` }} aria-hidden />
              <span className="ch-dot ch-dot--b" style={{ left: `${left}%`, top: `${(y(point.b) / H) * 100}%` }} aria-hidden />
              <div className={left > 70 ? "ch-tip ch-tip--left" : "ch-tip"} style={{ left: `${left}%` }} role="status">
                <p className="ch-tip__day">{day(point.day)}</p>
                <p className="ch-tip__row">
                  <i className="ch-swatch ch-swatch--a" aria-hidden />
                  <strong>{nf.format(point.a)}</strong> {names[0].toLowerCase()}
                </p>
                <p className="ch-tip__row">
                  <i className="ch-swatch ch-swatch--b" aria-hidden />
                  <strong>{nf.format(point.b)}</strong> {names[1].toLowerCase()}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <figcaption className="ch-x" aria-hidden>
        {days
          .filter((_, i) => i % Math.ceil(days.length / 7) === 0 || i === days.length - 1)
          .map((d) => (
            <span key={d.day}>{day(d.day)}</span>
          ))}
      </figcaption>
      <table className="u-sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{names[0]}</th>
            <th scope="col">{names[1]}</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <th scope="row">{day(d.day)}</th>
              <td>{d.a}</td>
              <td>{d.b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** One series per day, as columns. The column is its own hover target. */
export function Bars({ rows, label }: { rows: Array<{ day: string; n: number }>; label: string }) {
  const max = niceMax(Math.max(1, ...rows.map((r) => r.n)));
  const { at, setAt, onKey } = useScrub(rows.length);
  return (
    <figure className="ch">
      <div className="ch-frame">
        <Axis max={max} />
        <div
          className="ch-plot ch-plot--bars"
          tabIndex={0}
          role="img"
          aria-label={`${label}. Use the arrow keys to read each day.`}
          onKeyDown={onKey}
          onPointerLeave={() => setAt(null)}
          onBlur={() => setAt(null)}
        >
          {rows.map((r, i) => (
            <span
              key={r.day}
              className={at === i ? "ch-col is-on" : "ch-col"}
              onPointerEnter={() => setAt(i)}
            >
              <span className="ch-col__bar" style={{ height: `${(r.n / max) * 100}%` }} />
              {at === i ? (
                <span className={i / rows.length > 0.7 ? "ch-tip ch-tip--left ch-tip--bar" : "ch-tip ch-tip--bar"} role="status">
                  <span className="ch-tip__day">{day(r.day)}</span>
                  <span className="ch-tip__row">
                    <strong>{nf.format(r.n)}</strong>
                  </span>
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="ch-x" aria-hidden>
        <span>{rows[0] ? day(rows[0].day) : ""}</span>
        <span>{rows.length ? day(rows[rows.length - 1].day) : ""}</span>
      </figcaption>
      <table className="u-sr-only">
        <caption>{label}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <th scope="row">{day(r.day)}</th>
              <td>{r.n}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
