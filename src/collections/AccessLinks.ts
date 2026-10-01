import type { CollectionConfig } from "payload";

/**
 * The private links that let a school edit its own listing.
 *
 * One link covers every listing that shares an inbox — a primary and secondary
 * record of the same school, or a chain's campuses — because whoever reads that
 * inbox already speaks for all of them, and one email beats eight identical
 * ones. The schools a link opens are fixed when it is issued: changing a
 * listing's email later does not widen or narrow an existing link.
 *
 * Only the hash of the token is stored (see lib/outreach/tokens.ts), so this
 * table is not a list of working links.
 */
export const AccessLinks: CollectionConfig = {
  slug: "access-links",
  admin: { hidden: true },
  access: {
    // Issued and read only by server code through the Local API.
    create: () => false,
    read: ({ req }) => req.user?.role === "super-admin",
    update: () => false,
    delete: ({ req }) => req.user?.role === "super-admin",
  },
  fields: [
    { name: "tokenHash", type: "text", required: true, unique: true, index: true },
    { name: "email", type: "text", required: true, index: true },
    {
      name: "schools",
      type: "json",
      required: true,
      admin: { description: "Ids of the listings this link opens." },
    },
    { name: "expiresAt", type: "date", required: true },
    {
      name: "purpose",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Outreach email", value: "outreach" },
        { label: "Requested by the school", value: "requested" },
      ],
    },
    { name: "lastUsedAt", type: "date" },
  ],
};
