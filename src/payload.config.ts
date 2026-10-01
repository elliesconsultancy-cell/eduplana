import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { AccessLinks } from "./collections/AccessLinks";
import { Events } from "./collections/Events";
import { SchoolContacts } from "./collections/SchoolContacts";
import { Schools } from "./collections/Schools";
import { SchoolSubmissions } from "./collections/SchoolSubmissions";
import { Users } from "./collections/Users";
import { OutreachSettings } from "./globals/OutreachSettings";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  /**
   * The REST API is moved off `/api` on purpose.
   *
   * The public site already serves `/api/schools` and `/api/suggest`, and those
   * paths are baked into shipped client JavaScript. Letting Payload mount its
   * catch-all there would put two routers on the same prefix for no benefit.
   */
  routes: {
    api: "/payload-api",
  },

  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    meta: {
      titleSuffix: " · Eduplana admin",
    },
    /*
     * Both themes. Forcing dark removed the switcher entirely, which is not a
     * decision anyone asked for — somebody working in a bright room should be
     * able to choose. Both scales are defined in custom.css and the dashboard
     * reads its colours from Payload's tokens, so neither is an afterthought.
     */
    theme: "all",
    // Initials and first name instead of a Gravatar silhouette.
    avatar: { Component: "@/components/admin/Avatar#Avatar" },
    components: {
      // Same artwork as the public site, so signing in does not feel like
      // leaving the product.
      graphics: {
        Logo: "@/components/admin/Logo#Logo",
        Icon: "@/components/admin/Icon#Icon",
      },
      // Our own sidebar: always present on a desktop, foldable to icons, and
      // holding the custom screens alongside the collections. See SideNav.tsx.
      Nav: "@/components/admin/SideNav#SideNav",
      // The header's right side: find a school, switch theme, and the bell for
      // submissions waiting on a reviewer.
      actions: [
        "@/components/admin/HeaderSearch#HeaderSearch",
        "@/components/admin/ThemeToggle#ThemeToggle",
        "@/components/admin/Notifications#Notifications",
      ],
      // Replaces the stock "here are your collections" dashboard, which
      // repeats the sidebar, with live counts and the two actions people
      // actually arrive wanting.
      views: {
        dashboard: { Component: "@/components/admin/Dashboard#Dashboard" },
        // Our own analytics, at /admin/analytics. Vercel reports how many
        // people arrive; this reports what they were looking for, which is
        // the half that changes what gets built next.
        analytics: {
          Component: "@/components/admin/Analytics#Analytics",
          path: "/analytics",
          exact: true,
          meta: { title: "Analytics" },
        },
        // Emailing schools to check their listings, at /admin/outreach.
        outreach: {
          Component: "@/components/admin/Outreach#Outreach",
          path: "/outreach",
          exact: true,
          meta: { title: "Outreach" },
        },
      },
    },
  },

  collections: [Schools, SchoolSubmissions, SchoolContacts, Users, Events, AccessLinks],

  globals: [OutreachSettings],

  editor: lexicalEditor(),

  // Fails fast and loudly if the secret is missing, rather than silently
  // signing sessions with `undefined`.
  secret: process.env.PAYLOAD_SECRET || "",

  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || "" },
  }),

  // Payload uses sharp for image resizing on upload.
  sharp,
});
