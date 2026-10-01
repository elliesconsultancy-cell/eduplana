import { APIError, type CollectionConfig } from "payload";

const isAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === "admin" || req.user?.role === "super-admin";

/**
 * Changes a school has sent in about its own listing, waiting for a person.
 *
 * Nothing a school submits reaches the public site until an admin approves it
 * here. Approving writes the changes to the school, publishes it, and marks it
 * verified — the school itself has confirmed the details, which is exactly what
 * `verified` claims. Rejecting leaves the listing as it was.
 *
 * A decision is final: once a submission is approved or rejected it cannot be
 * flipped, because "approved" means "these changes went live" and re-deciding
 * would make that untrue.
 */
export const SchoolSubmissions: CollectionConfig = {
  slug: "school-submissions",
  labels: { singular: "Submission", plural: "Submissions" },
  admin: {
    group: "Outreach",
    useAsTitle: "schoolName",
    defaultColumns: ["schoolName", "kind", "status", "contactName", "createdAt"],
    listSearchableFields: ["schoolName", "contactName", "contactEmail"],
    description:
      "Changes schools have sent in. Open one to compare it with the live listing, then set the status to Approved or Rejected and save.",
    pagination: { defaultLimit: 25 },
  },
  access: {
    // Created only by the public form, through the Local API.
    create: () => false,
    read: ({ req }) => Boolean(req.user),
    // Approving publishes and verifies a school, which only admins may do.
    update: isAdmin,
    delete: ({ req }) => req.user?.role === "super-admin",
  },
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req, operation }) => {
        if (operation !== "update") return data;
        const from = originalDoc?.status as string | undefined;
        const to = (data.status as string | undefined) ?? from;
        if (from === to) return data;

        if (from !== "pending") {
          throw new APIError("This submission has already been decided and cannot be changed.", 400);
        }
        // A newer submission for the same school replaces this one. Only the
        // public form does that, and it runs without a signed-in user.
        if (to === "superseded" && !req.user) return data;
        if (to !== "approved" && to !== "rejected") {
          throw new APIError("Set the status to Approved or Rejected.", 400);
        }

        data.reviewedBy = req.user?.id;
        data.reviewedAt = new Date().toISOString();

        if (to === "approved") {
          const id = String(originalDoc.school);
          if (originalDoc.kind === "removal") {
            // Unpublished rather than deleted: the record and its history stay,
            // so a removal can be reversed if it turns out not to be the school.
            await req.payload.update({
              collection: "schools",
              id,
              data: { _status: "draft" },
              req,
              overrideAccess: true,
            });
          } else {
            const changes = (originalDoc.changes ?? {}) as Record<string, unknown>;
            await req.payload.update({
              collection: "schools",
              id,
              data: { ...changes, verified: true, _status: "published" },
              req,
              overrideAccess: true,
            });
          }
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation }) => {
        if (operation !== "update" || previousDoc?.status === doc.status || doc.status !== "approved") return doc;
        await req.payload.update({
          collection: "school-contacts",
          where: { school: { equals: String(doc.school) } },
          data: { status: "approved" },
          req,
          overrideAccess: true,
        });
        return doc;
      },
    ],
  },
  fields: [
    {
      name: "review",
      type: "ui",
      admin: { components: { Field: "@/components/admin/SubmissionDiff#SubmissionDiff" } },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      index: true,
      options: [
        { label: "Waiting for review", value: "pending" },
        { label: "Approved — live on the site", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Replaced by a later submission", value: "superseded" },
      ],
      admin: {
        position: "sidebar",
        description: "Approving publishes these changes and marks the school verified.",
      },
    },
    {
      name: "reviewNote",
      type: "textarea",
      admin: { position: "sidebar", description: "For the team. Not sent to the school." },
    },
    {
      name: "kind",
      type: "select",
      required: true,
      options: [
        { label: "Corrections", value: "update" },
        { label: "Confirmed as correct", value: "confirm" },
        { label: "Asked to be removed", value: "removal" },
      ],
      admin: { readOnly: true, position: "sidebar" },
    },
    { name: "school", type: "text", required: true, index: true, admin: { readOnly: true, position: "sidebar" } },
    { name: "schoolName", type: "text", admin: { readOnly: true } },
    { name: "schoolSlug", type: "text", admin: { readOnly: true, hidden: true } },
    {
      type: "row",
      fields: [
        { name: "contactName", type: "text", admin: { readOnly: true, width: "33%" } },
        { name: "contactRole", type: "text", admin: { readOnly: true, width: "33%" } },
        { name: "contactEmail", type: "text", admin: { readOnly: true, width: "33%" } },
      ],
    },
    {
      name: "message",
      type: "textarea",
      admin: { readOnly: true, description: "Anything the school wanted to tell us." },
    },
    { name: "changes", type: "json", admin: { readOnly: true, hidden: true } },
    { name: "before", type: "json", admin: { readOnly: true, hidden: true } },
    { name: "reviewedBy", type: "relationship", relationTo: "users", admin: { readOnly: true, position: "sidebar" } },
    { name: "reviewedAt", type: "date", admin: { readOnly: true, position: "sidebar" } },
  ],
};
