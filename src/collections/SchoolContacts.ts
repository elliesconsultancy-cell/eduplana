import type { CollectionConfig } from "payload";

/**
 * Where each school stands in outreach: emailed, opened, replied, approved.
 *
 * Kept apart from the schools themselves on purpose. The public site reads
 * only records saved since its bundled snapshot (see lib/schools.ts), so every
 * write to a school costs every server instance a re-read. Stamping "emailed"
 * on 3,709 schools would turn the whole directory into a change set and undo
 * that — here it costs nothing.
 */
export const SchoolContacts: CollectionConfig = {
  slug: "school-contacts",
  labels: { singular: "School contact", plural: "School contacts" },
  admin: {
    group: "Outreach",
    useAsTitle: "name",
    defaultColumns: ["name", "email", "status", "lastSentAt", "openedAt"],
    listSearchableFields: ["name", "email"],
    description: "Every school we have emailed, and how far it has got. Updated automatically.",
    pagination: { defaultLimit: 50 },
  },
  access: {
    // Written by the outreach tools, never by hand: a status somebody typed
    // would no longer say what actually happened.
    create: () => false,
    read: ({ req }) => Boolean(req.user),
    update: () => false,
    delete: ({ req }) => req.user?.role === "super-admin",
  },
  fields: [
    { name: "school", type: "text", required: true, unique: true, index: true },
    { name: "name", type: "text" },
    { name: "email", type: "text", required: true, index: true },
    {
      name: "status",
      type: "select",
      required: true,
      index: true,
      defaultValue: "sent",
      options: [
        { label: "Not emailed", value: "none" },
        { label: "Emailed", value: "sent" },
        { label: "Link opened", value: "opened" },
        { label: "Changes sent in", value: "submitted" },
        { label: "Approved", value: "approved" },
      ],
    },
    {
      name: "optedOut",
      type: "checkbox",
      defaultValue: false,
      index: true,
      admin: { description: "Asked not to be emailed again. Never contacted while this is set." },
    },
    { name: "sends", type: "number", defaultValue: 0 },
    { name: "firstSentAt", type: "date" },
    { name: "lastSentAt", type: "date", index: true },
    {
      name: "openedAt",
      type: "date",
      admin: {
        description:
          "First time the link was opened. Some email security filters open links to scan them, so this can be early.",
      },
    },
    { name: "submittedAt", type: "date" },
  ],
};
