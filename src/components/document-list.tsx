"use client";

import { useState } from "react";
import { ArrowDownToLine, FileText } from "lucide-react";
import { asset } from "@/lib/assets";

interface Doc {
  slug: string;
  title: string;
  year: number | null;
  file: string;
  topic: string;
  size: string;
}

const TOPIC_TONES: Record<string, string> = {
  Budget: "bg-brand-50 text-brand-800",
  Universities: "bg-career-50 text-career-700",
  States: "bg-amber-50 text-amber-800",
  Accountability: "bg-rose-50 text-rose-800",
  Access: "bg-teal-50 text-teal-800",
};

const FALLBACK_TONE = "bg-ink-100 text-ink-700";

export function DocumentList({ items }: { items: Doc[] }) {
  const [topic, setTopic] = useState("All");
  const topics = ["All", ...[...new Set(items.map((i) => i.topic))].sort()];
  const visible = topic === "All" ? items : items.filter((i) => i.topic === topic);

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
                  onClick={() => setTopic(t)}
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

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((doc) => (
          <li key={doc.slug} className="h-full">
            <a
              href={asset(doc.file)}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift hover:ring-brand-200"
            >
              <span className="flex items-start justify-between gap-3">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white"
                >
                  <FileText size={20} strokeWidth={2.2} />
                </span>
                <ArrowDownToLine
                  size={16}
                  strokeWidth={2.3}
                  aria-hidden
                  className="mt-1 shrink-0 text-ink-300 transition-colors group-hover:text-brand-600"
                />
              </span>

              {/* Two lines reserved — the longest title in the archive runs to
                  two at this width, and reserving three left a visible hole
                  under the many one-line titles. flex-1 pins the footer down. */}
              <span className="mt-4 line-clamp-2 min-h-[2.6em] flex-1 text-[15px] font-semibold leading-snug text-ink-900">
                {doc.title}
              </span>

              <span className="mt-4 flex items-center gap-2 border-t border-ink-100 pt-3">
                <span
                  className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                    TOPIC_TONES[doc.topic] ?? FALLBACK_TONE
                  }`}
                >
                  {doc.topic}
                </span>
                <span className="text-[11px] font-medium text-ink-400">
                  PDF · {doc.size}
                  {doc.year ? ` · ${doc.year}` : ""}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
