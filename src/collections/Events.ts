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
 * No cookie is set and no IP is stored. `visitor` is a hash of the address, the
 * user agent and a salt that changes every day: it lets three page views by one
 * person count as one visitor, and by tomorrow the same person hashes to
 * something else, so the table cannot be assembled into a history of anybody.
 * This is the approach privacy-first analytics tools use, and it is why none of
 * this needs a consent banner under the NDPR.
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
    {
      name: "referrer",
      type: "text",
      index: true,
      admin: { description: "Hostname only, never the full URL — google.com, not the query." },
    },
    {
      name: "device",
      type: "select",
      index: true,
      options: [
        { label: "Phone", value: "phone" },
        { label: "Tablet", value: "tablet" },
        { label: "Computer", value: "computer" },
      ],
    },
    {
      name: "visitor",
      type: "text",
      index: true,
      admin: {
        description:
          "A per-day anonymous token. Lets one person's three page views count as one visitor, and stops being linkable to them tomorrow.",
      },
    },
  ],
  timestamps: true,
};
