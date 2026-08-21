import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

import { Schools } from "./collections/Schools";
import { Users } from "./collections/Users";

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
    components: {
      // Same artwork as the public site, so signing in does not feel like
      // leaving the product.
      graphics: {
        Logo: "@/components/admin/Logo#Logo",
        Icon: "@/components/admin/Icon#Icon",
      },
      // Replaces the stock "here are your collections" dashboard, which
      // repeats the sidebar, with live counts and the two actions people
      // actually arrive wanting.
      views: {
        dashboard: { Component: "@/components/admin/Dashboard#Dashboard" },
      },
    },
  },

  collections: [Schools, Users],

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
