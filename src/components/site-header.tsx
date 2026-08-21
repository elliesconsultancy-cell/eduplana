"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useShortlist } from "./shortlist-provider";

interface NavLink {
  href: string;
  label: string;
  /** One line of context in dropdowns; ignored for flat links. */
  hint?: string;
}

interface NavGroup {
  label: string;
  items: NavLink[];
}

type NavEntry = NavLink | NavGroup;

const NAV: NavEntry[] = [
  { href: "/schools", label: "Find schools" },
  {
    label: "Services",
    items: [
      {
        href: "/career-education",
        label: "Career education",
        hint: "How we read schools for career signals",
      },
      {
        href: "/for-schools",
        label: "For schools",
        hint: "The management platform behind the profile",
      },
    ],
  },
  {
    label: "Insights",
    items: [
      { href: "/insights/infographics", label: "Infographics", hint: "Education data, visualised" },
      { href: "/insights/reports", label: "Reports & data", hint: "Budget analyses and datasets" },
    ],
  },
  { href: "/compare", label: "Compare" },
  { href: "/shortlist", label: "Saved" },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { saved, ready } = useShortlist();
  // The panel is remembered against the route it was opened on, so any
  // navigation — including back and forward — closes it without an effect.
  const [menu, setMenu] = useState({ open: false, at: pathname });
  const menuOpen = menu.open && menu.at === pathname;

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Eduplana — home">
          <Image
            src="/brand/eduplana-logo.png"
            alt="Eduplana"
            width={538}
            height={108}
            priority
            className="h-7 w-auto sm:h-8"
          />
        </Link>

        {/* No overflow container here: `overflow-x` also clips vertically, which
            would cut the dropdown panels off at the header's edge. Below `lg`
            the row cannot fit, so it is replaced by a panel rather than a
            horizontal scroller nobody discovers. */}
        <nav className="ml-auto hidden min-w-0 items-center gap-0.5 lg:flex">
          {NAV.map((entry) =>
            isGroup(entry) ? (
              <NavDropdown key={entry.label} group={entry} pathname={pathname} />
            ) : (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={isActive(pathname, entry.href) ? "page" : undefined}
                className={`shrink-0 rounded-full px-2 py-2 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm ${
                  isActive(pathname, entry.href)
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                {entry.label}
                {entry.href === "/shortlist" && ready && saved.length > 0 ? (
                  <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                    {saved.length}
                  </span>
                ) : null}
              </Link>
            ),
          )}
        </nav>

        <button
          type="button"
          onClick={() => setMenu({ open: !menuOpen, at: pathname })}
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          className="ml-auto grid size-10 place-items-center rounded-full text-ink-700 transition-colors hover:bg-ink-50 lg:hidden"
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? (
            <X size={20} strokeWidth={2.3} aria-hidden />
          ) : (
            <Menu size={20} strokeWidth={2.3} aria-hidden />
          )}
        </button>
      </div>

      {menuOpen ? (
        <div
          id="site-menu"
          className="border-t border-ink-100 bg-white px-4 pb-5 pt-3 sm:px-6 lg:hidden"
        >
          <ul className="space-y-1">
            {NAV.map((entry) =>
              isGroup(entry) ? (
                <li key={entry.label} className="pt-3 first:pt-0">
                  <p className="px-3 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-ink-400">
                    {entry.label}
                  </p>
                  <ul>
                    {entry.items.map((item) => (
                      <li key={item.href}>
                        <MobileLink href={item.href} pathname={pathname} hint={item.hint}>
                          {item.label}
                        </MobileLink>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : (
                <li key={entry.href}>
                  <MobileLink href={entry.href} pathname={pathname}>
                    {entry.label}
                    {entry.href === "/shortlist" && ready && saved.length > 0 ? (
                      <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[11px] font-bold text-white tabular-nums">
                        {saved.length}
                      </span>
                    ) : null}
                  </MobileLink>
                </li>
              ),
            )}
          </ul>
        </div>
      ) : null}
    </header>
  );
}

function MobileLink({
  href,
  pathname,
  hint,
  children,
}: {
  href: string;
  pathname: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive(pathname, href) ? "page" : undefined}
      className={`block rounded-lg px-3 py-2.5 transition-colors ${
        isActive(pathname, href) ? "bg-brand-50 text-brand-800" : "text-ink-800 hover:bg-ink-50"
      }`}
    >
      <span className="text-[15px] font-semibold">{children}</span>
      {hint ? <span className="mt-0.5 block text-xs text-ink-500">{hint}</span> : null}
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Opens on hover for mice and on click/Enter for everything else, so it works
 * without a pointer. Escape closes and returns focus to the trigger.
 */
function NavDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // A mouse user hovers before they click, so the menu is already open by the
  // time the click lands. Toggling on that click would slam shut the thing
  // they just pointed at.
  const openedByHover = useRef(false);
  const menuId = useId();
  const active = group.items.some((item) => isActive(pathname, item.href));

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => {
        openedByHover.current = true;
        setOpen(true);
      }}
      onMouseLeave={() => {
        openedByHover.current = false;
        setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => {
          if (openedByHover.current) {
            // Already open from the hover; leave it, and let the next click close it.
            openedByHover.current = false;
            return;
          }
          setOpen((o) => !o);
        }}
        className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-2 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm ${
          active || open
            ? "bg-brand-50 text-brand-800"
            : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
        }`}
      >
        {group.label}
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          id={menuId}
          className="absolute right-0 top-full z-50 w-72 pt-2"
        >
          <ul className="overflow-hidden rounded-xl border border-ink-100 bg-white p-1.5 shadow-float">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 transition-colors ${
                    isActive(pathname, item.href) ? "bg-brand-50" : "hover:bg-ink-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-ink-900">{item.label}</span>
                  {item.hint ? (
                    <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                      {item.hint}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
