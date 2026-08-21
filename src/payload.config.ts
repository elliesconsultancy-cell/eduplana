import path from "node:path";
import { fileURLToPath } from "node:url";

import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { buildConfig } from "payload";
import sharp from "sharp";

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
  },

  collections: [Users],

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
