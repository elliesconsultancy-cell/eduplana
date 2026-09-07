import Image from "next/image";
import Link from "next/link";

/**
 * The two destinations Payload's nav has no idea about.
 *
 * Payload builds its sidebar from collections, so a custom view — the
 * dashboard, the analytics screen — is reachable only by typing the URL or by
 * finding a link somewhere on the page. Adding them here puts them where
 * somebody would actually look for them.
 *
 * Rendered above the collection groups because they are whole-product views
 * rather than one collection among several.
 */
const LINKS = [
  {
    href: "/admin",
    label: "Overview",
    // Inline rather than an icon package: two icons is not worth a dependency,
    // and these inherit currentColor so they follow the nav's own states.
    path: "M3 3h7v7H3zM14 3h7v4h-7zM14 11h7v10h-7zM3 14h7v7H3z",
  },
  { href: "/admin/analytics", label: "Analytics", path: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

export function NavLinks() {
  return (
    <div className="ep-nav">
      {/* The masthead. Payload puts its mark in the breadcrumb, where it read as
          a stray graphic next to the trail; the sidebar is where a person looks
          to know what product they are in. */}
      <Link href="/admin" className="ep-nav__brand" aria-label="Eduplana admin — overview">
        {/*
          * Both lock-ups ship and CSS picks one. Filtering the blue mark to
          * white does not work: the bulb inside the tile is already white, so
          * inverting turns the whole thing into a blank square.
          */}
        <Image
          className="ep-nav__brand-light"
          src="/brand/eduplana-logo.png"
          alt="Eduplana"
          width={1624}
          height={365}
          priority
        />
        <Image
          className="ep-nav__brand-dark"
          src="/brand/eduplana-logo-reversed.png"
          alt=""
          aria-hidden
          width={1624}
          height={365}
          priority
        />
      </Link>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="ep-nav__link">
          <svg viewBox="0 0 24 24" aria-hidden width="15" height="15" fill="none"
            stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d={link.path} />
          </svg>
          {link.label}
        </Link>
      ))}
    </div>
  );
}
