"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import type { Person } from "@/lib/team";
import "./team-drawer.css";

/**
 * The team: a grid of cards, and a profile panel for each person.
 *
 * Every panel is rendered into the page's HTML up front and only shown on
 * request, so the full bios are there for search engines and for anyone without
 * JavaScript. With JavaScript the card's link opens the panel instead of
 * jumping, and the person's address (/about#their-name) is kept in the URL so
 * a profile can be shared, and opens straight to the panel when followed.
 */
export function TeamGrid({ people }: { people: Person[] }) {
  const panels = useRef(new Map<string, HTMLDialogElement>());

  const unlock = useCallback(() => {
    // Only when nothing is left open: moving between two profiles closes one
    // as it opens the other.
    if (document.querySelector("dialog.td[open]")) return;
    document.documentElement.style.overflow = "";
    document.body.style.paddingRight = "";
  }, []);

  const open = useCallback((slug: string) => {
    const panel = panels.current.get(slug);
    if (!panel || panel.open) return;
    // Hiding the page's scrollbar would widen the page by its width and shift
    // everything; pad by the same amount to keep it still.
    const bar = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.overflow = "hidden";
    if (bar > 0) document.body.style.paddingRight = `${bar}px`;
    panel.showModal();
    panel.scrollTop = 0;
    history.replaceState(null, "", `#${slug}`);
  }, []);

  const close = useCallback((slug: string) => {
    panels.current.get(slug)?.close();
  }, []);

  /** Close this profile and open another, so the two slide past each other. */
  const goTo = useCallback(
    (from: string, to: string) => {
      close(from);
      open(to);
    },
    [close, open],
  );

  // A shared link, or the browser's back button, opens the matching profile.
  useEffect(() => {
    const fromHash = () => {
      const slug = decodeURIComponent(location.hash.slice(1));
      if (panels.current.has(slug)) open(slug);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [open]);

  return (
    <>
      <ul className="mt-10 grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
        {people.map((p) => (
          <li key={p.slug}>
            <a
              href={`#${p.slug}`}
              onClick={(e) => {
                e.preventDefault();
                open(p.slug);
              }}
              className="group flex h-full flex-col"
            >
              <div className="relative aspect-[4/4.4] overflow-hidden rounded-2xl bg-brand-950">
                <Image
                  src={p.photo}
                  alt={`Portrait of ${p.name}`}
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 260px"
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
              </div>
              <h3 className="font-display mt-4 text-[1.1rem] leading-snug text-ink-950">{p.name}</h3>
              <p className="mt-0.5 text-sm text-ink-500">{p.role}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{p.tagline}</p>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
                Read profile
                <ArrowUpRight size={15} strokeWidth={2.4} aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>

      {people.map((p, i) => {
        const prev = people[(i + people.length - 1) % people.length];
        const next = people[(i + 1) % people.length];
        const titleId = `${p.slug}-title`;
        return (
          <dialog
            key={p.slug}
            id={p.slug}
            ref={(el) => {
              if (el) panels.current.set(p.slug, el);
              else panels.current.delete(p.slug);
            }}
            className="td"
            aria-labelledby={titleId}
            onClose={() => {
              // Back to the bare page address, so the URL is not left pointing
              // at a panel that is no longer open.
              if (location.hash === `#${p.slug}`) history.replaceState(null, "", location.pathname + location.search);
              unlock();
            }}
            onClick={(e) => {
              // The panel fills its own box, so a click that lands on the
              // dialog itself is a click on the dimmed page behind it.
              if (e.target === e.currentTarget) close(p.slug);
            }}
          >
            {/* Stays on screen while the story scrolls beneath it. */}
            <div className="sticky top-0 z-10 h-0">
              <button
                type="button"
                onClick={() => close(p.slug)}
                aria-label={`Close ${p.name}'s profile`}
                className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white text-ink-900 shadow-[0_6px_20px_-4px_rgb(7_24_48/0.5)] transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:right-5 sm:top-5"
              >
                <X size={20} strokeWidth={2.4} aria-hidden />
              </button>
            </div>

            <div className="relative aspect-[1/0.92] bg-brand-950">
              <Image
                src={p.photo}
                alt={`Portrait of ${p.name}`}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 576px"
                className="object-cover object-[50%_22%]"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/35 to-transparent"
              />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                {p.group === "co-founder" ? (
                  <span className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-[12px] font-bold text-brand-800">
                    Co-founder
                  </span>
                ) : null}
                <h3
                  id={titleId}
                  className="font-display tracking-display text-[2rem] leading-[1.08] text-white sm:text-[2.4rem]"
                >
                  {p.name}
                </h3>
                <p className="mt-1.5 text-[16px] font-semibold text-brand-200">{p.role}</p>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {p.paragraphs.map((para, n) => (
                <p
                  key={para}
                  className={
                    n === 0
                      ? "text-[1.1rem] leading-[1.7] text-ink-900"
                      : "mt-4 text-[15.5px] leading-[1.8] text-ink-600"
                  }
                >
                  {para}
                </p>
              ))}

              <div className="mt-8 border-t border-ink-100 pt-6">
                <p className="text-sm font-semibold text-ink-800">Expertise</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {p.expertise.map((e) => (
                    <li key={e} className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-800">
                      {e}
                    </li>
                  ))}
                </ul>

                {p.workedWith?.length ? (
                  <>
                    <p className="mt-6 text-sm font-semibold text-ink-800">Has worked with</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {p.workedWith.map((w) => (
                        <li key={w} className="rounded-full px-3 py-1 text-[13px] font-medium text-ink-700 ring-1 ring-ink-200">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>

              {/* On to the next person without closing the panel. */}
              <nav aria-label="Other profiles" className="mt-10 grid grid-cols-2 gap-3 border-t border-ink-100 pt-6">
                {[
                  { person: prev, dir: "prev" as const },
                  { person: next, dir: "next" as const },
                ].map(({ person, dir }) => (
                  <button
                    key={dir}
                    type="button"
                    onClick={() => goTo(p.slug, person.slug)}
                    className={`group flex items-center gap-3 rounded-2xl border border-ink-100 p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60 ${
                      dir === "next" ? "flex-row-reverse text-right" : ""
                    }`}
                  >
                    <span className="relative size-11 shrink-0 overflow-hidden rounded-full bg-ink-100">
                      <Image src={person.photo} alt="" fill unoptimized sizes="44px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`flex items-center gap-1 text-[12px] font-medium text-ink-500 ${dir === "next" ? "justify-end" : ""}`}>
                        {dir === "prev" ? <ArrowLeft size={13} aria-hidden /> : null}
                        {dir === "prev" ? "Previous" : "Next"}
                        {dir === "next" ? <ArrowRight size={13} aria-hidden /> : null}
                      </span>
                      <span className="block truncate text-sm font-semibold text-ink-900">{person.name}</span>
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </dialog>
        );
      })}
    </>
  );
}
