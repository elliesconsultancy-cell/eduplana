import type { GlobalConfig } from "payload";

const isAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === "admin" || req.user?.role === "super-admin";

export const DEFAULT_SUBJECT = "{school} on Eduplana: please check your listing";

export const DEFAULT_BODY = `Dear {school} team,

My name is Babatunde Adegbite, and I am a co-founder of Eduplana (www.eduplana.org), a free directory that helps parents in Nigeria find and compare private schools on fees, curriculum, facilities and more.

{school} is already listed on Eduplana, based on information your school has published. Parents are using these listings to decide which schools to shortlist and visit, so we want to make sure yours is accurate and complete.

Could you take two minutes to check it? This private link lets you review and correct your details, including fees, contact information, facilities and photographs, without creating an account:

{link}

If everything is already correct, you can confirm it with one click and we will mark your listing as verified.

Thank you, and do reply to this email if you have any questions.

Warm regards,
Babatunde Adegbite
Co-founder, Eduplana`;

/**
 * The outreach email, editable from the admin.
 *
 * Plain text with three placeholders. Kept plain on purpose: a first email
 * from an unknown sender that looks like a newsletter gets filtered as one.
 */
export const OutreachSettings: GlobalConfig = {
  slug: "outreach-settings",
  label: "Outreach email",
  admin: {
    group: "Outreach",
    description:
      "The email schools receive. Placeholders: {school} is the school's name, {location} its town and state, and {link} its private link. A footer saying why they received it, with an unsubscribe link, is always added.",
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    update: isAdmin,
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          name: "fromName",
          type: "text",
          required: true,
          defaultValue: "Babatunde at Eduplana",
          admin: { width: "50%", description: "Shown as the sender." },
        },
        {
          name: "fromEmail",
          type: "email",
          required: true,
          defaultValue: "info@eduplana.org",
          admin: {
            width: "50%",
            description: "Must be an @eduplana.org address. Replies come back here.",
          },
          validate: (value: unknown) =>
            typeof value === "string" && /@eduplana\.org$/i.test(value.trim())
              ? true
              : "Use an @eduplana.org address — that is the domain set up to send.",
        },
      ],
    },
    { name: "subject", type: "text", required: true, defaultValue: DEFAULT_SUBJECT },
    {
      name: "body",
      type: "textarea",
      required: true,
      defaultValue: DEFAULT_BODY,
      admin: { rows: 22 },
      validate: (value: unknown) =>
        typeof value === "string" && value.includes("{link}")
          ? true
          : "The email must include {link}, or schools have no way to reach their listing.",
    },
    {
      name: "dailyLimit",
      type: "number",
      required: true,
      defaultValue: 80,
      min: 1,
      max: 95,
      admin: {
        description:
          "Most emails sent in any 24 hours. Resend's free plan allows 100 a day across everything, including the Gmail send-as addresses, so this leaves headroom. A new domain that sends hundreds at once gets marked as spam — ramp up slowly.",
      },
    },
  ],
};
