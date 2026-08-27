import type { CollectionConfig } from "payload";

/**
 * Everyone who can sign into the admin panel.
 *
 * Three roles:
 *   super-admin — manages people: creates accounts, resets passwords, and is
 *                 the only role that can grant super-admin to anyone else
 *   admin       — full control of content, including the `verified` flag
 *   editor      — writes and publishes content, but cannot assert verification
 *
 * The admin/editor split exists because "verified" is a factual claim to the
 * public that a human confirmed a school's details. It must not be something
 * an editor can tick while tidying copy.
 *
 * The super-admin split exists because account management is a different kind
 * of power from content management. An admin who could edit other accounts
 * could reset the super-admin's password and take the site over; keeping user
 * administration in one role closes that path.
 *
 * On passwords: nobody can read one, including a super-admin. Payload stores a
 * salted hash, so the original text is not in the database to show. When
 * someone is locked out, a super-admin sets them a new password on their user
 * record and passes it on.
 */

const SUPER_ADMIN = "super-admin";

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
    description:
      "Accounts that can sign in. Passwords cannot be read back — set a new one here if somebody is locked out.",
  },
  hooks: {
    beforeChange: [
      /**
       * The very first account must be able to invite everyone else, so it is
       * a super-admin. `defaultValue` below is "editor", which is right for
       * people added later — but the create-first-user screen uses the same
       * default, and an editor cannot manage users. Left alone, the first
       * person to sign up would lock themselves out of inviting anyone.
       */
      async ({ data, operation, req }) => {
        if (operation !== "create") return data;
        const { totalDocs } = await req.payload.count({ collection: "users", req });
        return totalDocs === 0 ? { ...data, role: SUPER_ADMIN } : data;
      },

      /**
       * Only a super-admin can create or promote one.
       *
       * Field-level access can say "you may not edit this field", but not "you
       * may edit it to some values and not others" — so the rule lives here.
       * Without it, an admin allowed to manage people could simply select
       * super-admin for themselves.
       */
      async ({ data, originalDoc, req }) => {
        const wants = data?.role;
        if (wants !== SUPER_ADMIN) return data;
        const already = originalDoc?.role === SUPER_ADMIN;
        if (already) return data;
        /*
         * No signed-in user means one of two trusted paths: the
         * create-first-user screen, or server-side code using the Local API.
         * It cannot mean an anonymous HTTP request — `access.update` and
         * `access.create` above run first and would already have rejected it.
         */
        if (!req.user || req.user.role === SUPER_ADMIN) return data;
        throw new Error("Only a super-admin can grant the super-admin role.");
      },
    ],

    beforeDelete: [
      /**
       * Never delete the last super-admin — that would leave the install with
       * nobody able to manage accounts, and no way to fix it from the UI.
       */
      async ({ id, req }) => {
        const doomed = await req.payload.findByID({ collection: "users", id, req, depth: 0 });
        if ((doomed as { role?: string })?.role !== SUPER_ADMIN) return;
        const { totalDocs } = await req.payload.count({
          collection: "users",
          req,
          where: { role: { equals: SUPER_ADMIN } },
        });
        if (totalDocs <= 1) {
          throw new Error("This is the only super-admin. Promote somebody else before deleting this account.");
        }
      },
    ],
  },
  access: {
    // Accounts are created and removed by super-admins only.
    create: ({ req }) => req.user?.role === SUPER_ADMIN,
    delete: ({ req }) => req.user?.role === SUPER_ADMIN,
    // Anyone signed in can read the list — "last edited by" needs the names.
    read: ({ req }) => Boolean(req.user),
    /**
     * A super-admin edits anyone, which is what makes resetting a forgotten
     * password possible. Everyone else may edit only their own account, so an
     * admin cannot change a colleague's password and sign in as them.
     */
    update: ({ req, id }) => req.user?.role === SUPER_ADMIN || req.user?.id === id,
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
        { label: "Super admin", value: SUPER_ADMIN },
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      // Nobody can promote themselves; the hook above enforces the same rule
      // for the super-admin value specifically.
      access: { update: ({ req }) => req.user?.role === SUPER_ADMIN },
      admin: {
        description:
          "Editors manage content. Admins additionally mark schools as verified. Super admins additionally manage accounts and passwords.",
      },
    },
  ],
};
