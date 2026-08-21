import type { CollectionConfig } from "payload";

/**
 * Nigeria's 36 states plus the Federal Capital Territory.
 *
 * A fixed list rather than free text on purpose: the directory previously held
 * both "Nasarawa" and "Nassarawa" with 36 schools under each, so the state
 * filter showed one state twice with half its schools missing from each entry.
 * A dropdown makes that class of mistake impossible to re-introduce by typing.
 */
export const NIGERIAN_STATE_NAMES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu",
  "FCT (Abuja)", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
  "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
  "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

const NIGERIAN_STATES = NIGERIAN_STATE_NAMES.map((state) => ({ label: state, value: state }));

const isAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === "admin";

export const Schools: CollectionConfig = {
  slug: "schools",
  admin: {
    useAsTitle: "name",
    // The columns a person actually scans when finding a school to edit.
    defaultColumns: ["name", "state", "level", "verified", "updatedAt"],
    listSearchableFields: ["name", "area", "slug"],
    group: "Directory",
    description:
      "Every school in the public directory. Changes go live once published.",
    pagination: { defaultLimit: 25 },
  },
  // Edits are staged until published, so a half-finished record never appears
  // on the public site. Version history also makes mistakes recoverable.
  versions: {
    drafts: true,
    maxPerDoc: 20,
  },
  access: {
    /**
     * The public sees published records only.
     *
     * `read: () => true` is not enough once drafts are enabled: it grants
     * access to the document regardless of status, so an anonymous request for
     * `?draft=true` returned an editor's unpublished work verbatim. Returning a
     * constraint instead of `true` pins the public to published rows at the
     * query level, while signed-in staff keep full visibility so the admin
     * panel and previews still work.
     */
    read: ({ req }) => {
      if (req.user) return true;
      return { _status: { equals: "published" } };
    },
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    // Deleting a school removes it from the public directory entirely;
    // editors unpublish instead.
    delete: isAdmin,
  },
  fields: [
    // Custom primary key: the records already carry stable ids that appear in
    // image paths and external references, so Payload reuses them rather than
    // minting new ones.
    {
      name: "id",
      type: "text",
      required: true,
      unique: true,
      admin: { readOnly: true, position: "sidebar", description: "Permanent identifier." },
    },
    {
      type: "tabs",
      tabs: [
        {
          label: "Profile",
          fields: [
            { name: "name", type: "text", required: true, index: true },
            {
              name: "slug",
              type: "text",
              required: true,
              unique: true,
              index: true,
              admin: { description: "The URL segment: /schools/<slug>. Changing it breaks existing links." },
            },
            {
              name: "level",
              type: "select",
              required: true,
              options: [
                { label: "Primary", value: "primary" },
                { label: "Secondary", value: "secondary" },
              ],
              index: true,
            },
            { name: "tagline", type: "text", admin: { description: "The school's own strapline, if it has one." } },
            {
              name: "summary",
              type: "textarea",
              admin: {
                description:
                  "Shown as “About this school”. Write in the school's own words, in complete sentences.",
              },
            },
            {
              name: "scope",
              type: "text",
              admin: { description: "Stages offered, e.g. “Creche, Primary”." },
            },
            {
              name: "yearFounded",
              type: "number",
              min: 1800,
              max: 2100,
              admin: { step: 1 },
            },
            {
              name: "curricula",
              type: "text",
              hasMany: true,
              admin: { description: "British, Nigerian, Montessori, and so on." },
            },
            {
              name: "faith",
              type: "select",
              options: ["Secular", "Christian", "Islamic"].map((v) => ({ label: v, value: v })),
              defaultValue: "Secular",
              index: true,
            },
          ],
        },
        {
          label: "Location & contact",
          fields: [
            {
              name: "state",
              type: "select",
              options: NIGERIAN_STATES,
              index: true,
              admin: { description: "Fixed list — pick the official spelling." },
            },
            { name: "area", type: "text", index: true, admin: { description: "Town or district, e.g. Lekki." } },
            { name: "address", type: "textarea" },
            { name: "busStop", type: "text", admin: { description: "Nearest landmark or bus stop." } },
            { name: "phone", type: "text" },
            { name: "website", type: "text", admin: { description: "Include https://" } },
          ],
        },
        {
          label: "Fees & admissions",
          fields: [
            {
              name: "fee",
              type: "group",
              admin: { description: "The headline band shown on cards and used by the budget filter." },
              fields: [
                { name: "label", type: "text", admin: { description: "As published, e.g. “N1 000 000+”." } },
                { name: "min", type: "number", admin: { description: "Lower bound per term, in naira." } },
                { name: "max", type: "number", admin: { description: "Upper bound per term. Leave empty for open-ended." } },
              ],
            },
            {
              name: "feeItems",
              type: "array",
              labels: { singular: "Fee line", plural: "Fee lines" },
              admin: {
                description:
                  "Exact published tuition lines, where the school itemised them. More precise than the band above.",
              },
              fields: [
                { name: "label", type: "text", required: true },
                { name: "amount", type: "number", required: true },
              ],
            },
            { name: "scholarship", type: "text" },
            { name: "siblingsDiscount", type: "text" },
            {
              name: "admissionForm",
              type: "text",
              admin: { description: "Path or URL to a downloadable admission form." },
            },
            {
              type: "row",
              fields: [
                { name: "day", type: "checkbox", label: "Offers day", defaultValue: true },
                { name: "boarding", type: "checkbox", label: "Offers boarding" },
              ],
            },
            { name: "maxClassSize", type: "number", admin: { description: "Maximum pupils per class." } },
          ],
        },
        {
          label: "Facilities & activities",
          description:
            "These lists drive the career-education signals. Each entry becomes a chip on the public profile.",
          fields: [
            { name: "facilities", type: "text", hasMany: true },
            { name: "activities", type: "text", hasMany: true },
            { name: "clubs", type: "text", hasMany: true },
          ],
        },
        {
          label: "Media",
          fields: [
            {
              name: "images",
              type: "group",
              fields: [
                { name: "logo", type: "text", admin: { description: "Path to the school's logo." } },
                {
                  name: "gallery",
                  type: "array",
                  labels: { singular: "Photograph", plural: "Photographs" },
                  fields: [
                    { name: "full", type: "text", required: true },
                    { name: "thumb", type: "text", required: true },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: "verified",
      type: "checkbox",
      defaultValue: false,
      // A public factual claim that a person confirmed this school's details.
      // Editors write content; only admins may assert verification.
      access: { update: isAdmin },
      admin: {
        position: "sidebar",
        description:
          "Only tick this once someone has confirmed these details with the school directly. Never from the school's own website alone.",
      },
    },
  ],
};
