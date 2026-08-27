import type { CollectionConfig } from "payload";

/**
 * Everyone who can sign into the admin panel.
 *
 * Two roles, deliberately few:
 *   admin  — full control, including the `verified` flag and user management
 *   editor — can write and publish content, but cannot assert verification
 *
 * The distinction matters because "verified" is a factual claim to the public
 * that a human confirmed a school's details. It must not be something an
 * editor can tick while tidying copy.
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    /**
     * Sessions expire an hour after signing in, whether or not the tab stayed
     * open. `admin.autoRefresh` is left off deliberately: with it on the token
     * renews silently and the session never actually ends, which is the thing
     * we are trying to avoid. Payload shows a "stay logged in" prompt a minute
     * before expiry, so someone mid-edit can extend on purpose rather than
     * losing work — but walking away from the machine does log you out.
     */
    tokenExpiration: 60 * 60,

    /**
     * Five wrong passwords locks the account for fifteen minutes. The admin
     * sits on a public URL, so without this the only thing between a guessed
     * password and the whole directory is how fast someone can send requests.
     */
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "role"],
    group: "System",
  },
  hooks: {
    beforeChange: [
      /**
       * The very first account must be an admin.
       *
       * `defaultValue` below is "editor", which is right for everyone invited
       * later — but the create-first-user screen uses the same default, and an
       * editor cannot manage users. Left alone, the first person to sign up
       * would lock themselves out of inviting anyone else.
       */
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const { totalDocs } = await req.payload.count({
          collection: "users",
          req,
        });
        return totalDocs === 0 ? { ...data, role: "admin" } : data;
      },
    ],
  },
  access: {
    // Only admins administer people.
    create: ({ req }) => req.user?.role === "admin",
    delete: ({ req }) => req.user?.role === "admin",
    // Anyone signed in can read the user list (needed to render "last edited by").
    read: ({ req }) => Boolean(req.user),
    // Admins edit anyone; everyone else may edit only themselves.
    update: ({ req, id }) => req.user?.role === "admin" || req.user?.id === id,
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: { description: "Shown on records this person creates or edits." },
    },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "editor",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      // Nobody can promote themselves.
      access: { update: ({ req }) => req.user?.role === "admin" },
      admin: {
        description:
          "Editors manage content. Admins additionally manage users and may mark schools as verified.",
      },
    },
  ],
};
