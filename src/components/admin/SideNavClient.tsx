"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNav } from "@payloadcms/ui";
import {
  ChartColumn,
  CircleUserRound,
  ClipboardCheck,
  FileText,
  LayoutGrid,
  LogOut,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  School,
  Send,
  Users,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

import { RAIL_COOKIE } from "./nav-shared";

const ICONS: Record<string, LucideIcon> = {
  overview: LayoutGrid,
  analytics: ChartColumn,
  schools: School,
  outreach: Send,
  submissions: ClipboardCheck,
  contacts: Mail,
  template: FileText,
  people: Users,
  account: CircleUserRound,
  collection: Folder,
};

export interface NavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
  /** Something waiting on a person, e.g. submissions to review. */
  badge?: number;
}
export interface NavSection {
  label: string | null;
  items: NavItem[];
}

const initials = (name: string) =>
  name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

export function SideNavClient({
  sections,
  initialRail,
  person,
}: {
  sections: NavSection[];
  initialRail: boolean;
  person: { name: string; role: string };
}) {
  const pathname = usePathname();
  // Payload's own context drives the drawer on small screens, so its header
  // button keeps opening and closing it. On a desktop the sidebar ignores it.
  const { navOpen, setNavOpen } = useNav();
  const [rail, setRail] = useState(initialRail);

  const toggleRail = () => {
    const next = !rail;
    setRail(next);
    // A cookie rather than local storage, so the server renders the right
    // width and the layout does not jump on load.
    document.cookie = `${RAIL_COOKIE}=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`;
  };

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <>
      <aside
        className={["ep-side", rail && "ep-side--rail", navOpen && "ep-side--open"].filter(Boolean).join(" ")}
        aria-label="Admin navigation"
      >
        <div className="ep-side__brand">
          <Link href="/admin" className="ep-side__logo" aria-label="Eduplana admin, overview">
            <Image className="ep-side__lockup ep-only-light" src="/brand/eduplana-logo.png" alt="Eduplana"
              width={1624} height={365} priority />
            <Image className="ep-side__lockup ep-only-dark" src="/brand/eduplana-logo-reversed.png" alt=""
              aria-hidden width={1624} height={365} priority />
            <Image className="ep-side__mark" src="/brand/eduplana-mark.png" alt="" aria-hidden width={387} height={365} />
          </Link>
          <button type="button" className="ep-side__collapse" onClick={toggleRail}
            aria-label={rail ? "Expand the sidebar" : "Collapse the sidebar to icons"}
            aria-pressed={rail} title={rail ? "Expand" : "Collapse"}>
            {rail ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
          </button>
        </div>

        <nav className="ep-side__nav">
          {sections.map((section) => (
            <div key={section.label ?? "main"} className="ep-side__section">
              {section.label ? <p className="ep-side__group">{section.label}</p> : null}
              <ul>
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Folder;
                  const active = isActive(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch={false}
                        className={active ? "ep-side__link is-active" : "ep-side__link"}
                        aria-current={active ? "page" : undefined}
                        title={rail ? item.label : undefined}
                        onClick={() => navOpen && window.matchMedia("(max-width: 1023px)").matches && setNavOpen(false)}
                      >
                        <Icon size={20} strokeWidth={1.8} aria-hidden className="ep-side__icon" />
                        <span className="ep-side__label">{item.label}</span>
                        {item.badge ? (
                          <span className="ep-side__badge" aria-label={`${item.badge} waiting`}>
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="ep-side__foot">
          <span className="ep-side__avatar" aria-hidden>
            {initials(person.name)}
          </span>
          <span className="ep-side__who">
            <span className="ep-side__name">{person.name}</span>
            {person.role ? <span className="ep-side__role">{person.role}</span> : null}
          </span>
          <Link href="/admin/logout" className="ep-side__logout" aria-label="Sign out" title="Sign out" prefetch={false}>
            <LogOut size={18} aria-hidden />
          </Link>
        </div>
      </aside>
      {navOpen ? (
        <button type="button" className="ep-side__scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      ) : null}
    </>
  );
}
