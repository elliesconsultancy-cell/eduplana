import type { CollectionConfig } from "payload";

/**
 * What visitors actually do, recorded on our own infrastructure.
 *
 * Vercel's analytics answers "how many people" — visitors, page views,
 * referrers. It cannot answer "what were they looking for", because behaviour
 * lives in query strings and actions rather than URLs, and custom events are a
 * Pro feature. This collection covers the gap:
 *
 *   search  every query run against the directory, with how many results came
 *           back. A search returning nothing is the single most useful record
 *           here — it is a school somebody wanted and we do not list.
 *   view    a school profile opened, so "which schools do people actually
 *           look at" has an answer.
 *
 * Nothing identifying is stored: no IP, no cookie, no fingerprint, no visitor
 * id. That is a deliberate limit rather than an omission — it means the table
 * cannot be turned into a profile of a person, needs no consent banner under
 * the NDPR, and can be handed to anyone without a privacy review. The cost is
 * that "unique visitors" is not answerable here; Vercel already answers it.
 */
export const Events: CollectionConfig = {
  slug: "events",
  admin: {
    // Raw rows are not for browsing. The Analytics view reads them; a person
    // scrolling a table of 50,000 page views learns nothing.
    hidden: true,
    useAsTitle: "path",
  },
  access: {
    // Written only by server-side code through the Local API, which bypasses
    // access control. Nothing may create one over HTTP.
    create: () => false,
    read: ({ req }) => Boolean(req.user),
    update: () => false,
    delete: ({ req }) => req.user?.role === "super-admin",
  },
  fields: [
    {
      name: "type",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Search", value: "search" },
        { label: "Profile view", value: "view" },
      ],
    },
    {
      name: "path",
      type: "text",
      index: true,
      admin: { description: "The page this happened on." },
    },
    {
      name: "slug",
      type: "text",
      index: true,
      admin: { description: "For a profile view, which school." },
    },
    {
      name: "query",
      type: "text",
      index: true,
      admin: { description: "For a search, what was typed. Lowercased and trimmed." },
    },
    {
      name: "filters",
      type: "text",
      admin: { description: "Filters applied alongside the query, as a readable summary." },
    },
    {
      name: "results",
      type: "number",
      index: true,
      admin: { description: "How many schools came back. Zero is the interesting case." },
    },
  ],
  timestamps: true,
};
