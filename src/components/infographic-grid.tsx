"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Expand, X } from "lucide-react";
import { asset } from "@/lib/assets";

interface Item {
  slug: string;
  title: string;
  year: number | null;
  full: string;
  thumb: string;
  topic: string;
  width: number;
  height: number;
}

/**
 * Topic tints. Colour here is wayfinding, not decoration: with 54 charts on one
 * page the tint is how you keep your place while scanning.
 */
const TOPIC_TONES: Record<string, string> = {
  Budget: "bg-brand-50 text-brand-800",
  Universities: "bg-career-50 text-career-700",
  States: "bg-amber-50 text-amber-800",
  Accountability: "bg-rose-50 text-rose-800",
  Access: "bg-teal-50 text-teal-800",
};

const FALLBACK_TONE = "bg-ink-100 text-ink-700";

export function InfographicGrid({ items }: { items: Item[] }) {
  const [topic, setTopic] = useState("All");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const topics = ["All", ...[...new Set(items.map((i) => i.topic))].sort()];
  const visible = topic === "All" ? items : items.filter((i) => i.topic === topic);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) =>
        current === null ? null : (current + delta + visible.length) % visible.length,
      ),
    [visible.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [openIndex, close, step]);

  const open = openIndex !== null ? visible[openIndex] : null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap gap-2">
          {topics.map((t) => {
            const count = t === "All" ? items.length : items.filter((i) => i.topic === t).length;
            const active = topic === t;
            return (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => {
                    setTopic(t);
                    setOpenIndex(null);
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-brand-900 text-white"
                      : "bg-white text-ink-700 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"
                  }`}
                >
                  {t}
                  <span
                    className={`tabular-nums text-xs ${active ? "text-white/60" : "text-ink-400"}`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-ink-500">
          Showing <span className="font-semibold text-ink-800">{visible.length}</span> of{" "}
          {items.length}
        </p>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((item, index) => (
          <li key={item.slug} className="h-full">
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200"
            >
              {/*
               * Contained rather than cropped. These run from 0.4 to 1.44 in
               * aspect ratio, so `cover` sliced the sides off the wide ones and
               * the bottom off the tall ones. Matting them in a fixed frame
               * shows every chart whole and makes every tile the same size.
               */}
              <span className="relative block aspect-[4/5] w-full shrink-0 overflow-hidden bg-gradient-to-b from-ink-50 to-ink-100/60 p-3">
                <Image
                  src={asset(item.thumb)}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 260px"
                  className="object-contain p-1 transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span
                  aria-hidden
                  className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-ink-950/70 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                >
                  <Expand size={14} strokeWidth={2.4} />
                </span>
              </span>

              <span className="flex flex-1 flex-col p-4">
                {/* Two lines are reserved whether the title needs them or not,
                    so the meta row lines up across every card in the row. */}
                <span className="line-clamp-2 min-h-[2.7em] text-[13px] font-semibold leading-snug text-ink-900">
                  {item.title}
                </span>
                <span className="mt-3 flex items-center gap-2">
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      TOPIC_TONES[item.topic] ?? FALLBACK_TONE
                    }`}
                  >
                    {item.topic}
                  </span>
                  {item.year ? (
                    <span className="text-[11px] font-medium tabular-nums text-ink-400">
                      {item.year}
                    </span>
                  ) : null}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {visible.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-10 text-center text-sm text-ink-500">
          Nothing filed under {topic} yet.
        </p>
      ) : null}

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
          onClick={close}
          className="fixed inset-0 z-50 flex flex-col bg-ink-950/95 p-4 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0" onClick={(e) => e.stopPropagation()}>
              <p className="font-display truncate text-white sm:text-lg">{open.title}</p>
              <p className="mt-0.5 text-sm text-white/50">
                {open.topic}
                {open.year ? ` · ${open.year}` : ""} · {openIndex! + 1} of {visible.length}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <a
                href={asset(open.full)}
                download
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Download size={15} strokeWidth={2.4} aria-hidden />
                <span className="hidden sm:inline">Download</span>
              </a>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/20"
              >
                <X size={15} strokeWidth={2.5} aria-hidden />
                <span className="hidden sm:inline">Close</span>
                <span className="sr-only sm:hidden">Close</span>
              </button>
            </div>
          </div>

          <div className="relative mt-4 min-h-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <Image src={asset(open.full)} alt={open.title} fill sizes="100vw" className="object-contain" />
          </div>

          {visible.length > 1 ? (
            <>
              <NavButton side="left" onClick={() => step(-1)} />
              <NavButton side="right" onClick={() => step(1)} />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous" : "Next"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/25 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? (
        <ChevronLeft size={24} strokeWidth={2.4} aria-hidden />
      ) : (
        <ChevronRight size={24} strokeWidth={2.4} aria-hidden />
      )}
    </button>
  );
}
