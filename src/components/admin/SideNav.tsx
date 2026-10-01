import { cookies } from "next/headers";
import type { Payload, SanitizedPermissions, TypedUser } from "payload";

import { RAIL_COOKIE } from "./nav-shared";
import { SideNavClient, type NavItem, type NavSection } from "./SideNavClient";
import "./shell.css";

/**
 * The admin sidebar, replacing Payload's.
 *
 * Payload's nav lists collections and nothing else, and below 1440px it starts
 * closed — which on most laptops meant the admin opened with no navigation at
 * all. This one is always present on a desktop, can fold down to icons, and
 * holds the custom screens (Overview, Analytics, Outreach) as first-class
 * destinations rather than links bolted above the collection list.
 *
 * The known destinations are laid out by hand, in the order the work happens.
 * Anything added to the config later lands under its own `admin.group`
 * automatically, so a new collection never needs this file touched to appear.
 */
type Props = {
  payload: Payload;
  user?: TypedUser | null;
  permissions?: SanitizedPermissions;
  visibleEntities?: { collections: string[]; globals: string[] };
};

const PLACED = new Set(["schools", "school-submissions", "school-contacts", "users", "outreach-settings"]);

export async function SideNav({ payload, user, permissions, visibleEntities }: Props) {
  const visible = new Set([...(visibleEntities?.collections ?? []), ...(visibleEntities?.globals ?? [])]);
  const canRead = (slug: string) =>
    visible.has(slug) &&
    Boolean(permissions?.collections?.[slug]?.read ?? permissions?.globals?.[slug]?.read ?? true);

  const pending = canRead("school-submissions")
    ? (
        await payload
          .count({ collection: "school-submissions", where: { status: { equals: "pending" } }, overrideAccess: true })
          .catch(() => ({ totalDocs: 0 }))
      ).totalDocs
    : 0;

  const only = (items: Array<NavItem | false>) => items.filter(Boolean) as NavItem[];

  const sections: NavSection[] = [
    {
      label: null,
      items: [
        { href: "/admin", label: "Overview", icon: "overview", exact: true },
        { href: "/admin/analytics", label: "Analytics", icon: "analytics" },
      ],
    },
    {
      label: "Directory",
      items: only([canRead("schools") && { href: "/admin/collections/schools", label: "Schools", icon: "schools" }]),
    },
    {
      label: "Outreach",
      items: only([
        canRead("school-submissions") && { href: "/admin/outreach", label: "Email schools", icon: "outreach" },
        canRead("school-submissions") && {
          href: "/admin/collections/school-submissions",
          label: "Submissions",
          icon: "submissions",
          badge: pending || undefined,
        },
        canRead("school-contacts") && { href: "/admin/collections/school-contacts", label: "Contacted schools", icon: "contacts" },
        canRead("outreach-settings") && { href: "/admin/globals/outreach-settings", label: "Email template", icon: "template" },
      ]),
    },
  ];

  // Everything not placed above, grouped the way the config groups it.
  const extra = new Map<string, NavItem[]>();
  for (const c of payload.config.collections) {
    if (PLACED.has(c.slug) || !canRead(c.slug) || c.admin?.hidden === true) continue;
    const group = typeof c.admin?.group === "string" ? c.admin.group : "More";
    const label = typeof c.labels?.plural === "string" ? c.labels.plural : c.slug;
    extra.set(group, [...(extra.get(group) ?? []), { href: `/admin/collections/${c.slug}`, label, icon: "collection" }]);
  }
  for (const g of payload.config.globals) {
    if (PLACED.has(g.slug) || !canRead(g.slug) || g.admin?.hidden === true) continue;
    const group = typeof g.admin?.group === "string" ? g.admin.group : "More";
    const label = typeof g.label === "string" ? g.label : g.slug;
    extra.set(group, [...(extra.get(group) ?? []), { href: `/admin/globals/${g.slug}`, label, icon: "collection" }]);
  }
  for (const [label, items] of extra) {
    const existing = sections.find((s) => s.label === label);
    if (existing) existing.items.push(...items);
    else sections.push({ label, items });
  }

  sections.push({
    label: "System",
    items: only([
      canRead("users") && { href: "/admin/collections/users", label: "People", icon: "people" },
      { href: "/admin/account", label: "Your account", icon: "account" },
    ]),
  });

  const u = user as { name?: string; email?: string; role?: string } | null | undefined;
  const rail = (await cookies()).get(RAIL_COOKIE)?.value === "1";

  return (
    <SideNavClient
      sections={sections.filter((s) => s.items.length > 0)}
      initialRail={rail}
      person={{
        name: u?.name || u?.email || "Signed in",
        role: (u?.role ?? "").replace("-", " "),
      }}
    />
  );
}
