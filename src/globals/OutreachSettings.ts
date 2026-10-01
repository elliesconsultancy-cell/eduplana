import type { GlobalConfig } from "payload";

const isAdmin = ({ req }: { req: { user?: { role?: string } | null } }) =>
  req.user?.role === "admin" || req.user?.role === "super-admin";

export const DEFAULT_SUBJECT = "How {school} appears to parents on Eduplana";

export const DEFAULT_BODY = `Dear {school} team,

Eduplana (www.eduplana.org) is an education management platform built for Nigerian schools. Its school directory, Eduplana Schoolsbase, lists more than 7,000 private schools. Parents use it to find schools in their city, compare up to four side by side on fees, curriculum, class sizes and facilities, and contact the school directly.

{school} is already on Schoolsbase. This is how parents see it today:

{listing}

Families choose which schools to visit from what they read here, so it matters that it is right. If anything is missing or out of date, such as your fees, contact details, facilities or photographs, you can correct it in a few minutes. No account is needed, and nothing changes until we have checked it.

{link}

If everything is already correct, one click confirms it and your listing earns a Verified badge that parents can see.

Our goal is to help schools grow their enrolment from a digital platform, and an accurate listing is the first step.

Warm regards,
The Eduplana team`;

export const DEFAULT_GENERAL_SUBJECT = "List your school on Eduplana, free";

export const DEFAULT_GENERAL_BODY = `Hello,

We are Eduplana (www.eduplana.org), a free directory that helps parents in Nigeria find and compare private schools on fees, curriculum, facilities and more.

Parents across Nigeria use Eduplana to shortlist schools to visit. We would like to include your school, at no cost to you.

If you would like to be listed, simply reply to this email with your school's name and address, and we will send you a private link to add your fees, facilities and photographs.

Warm regards,
The Eduplana team`;

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
      "The email schools receive. Placeholders: {school} is the school's name and {location} its town and state. A paragraph that is just {listing} becomes a panel linking to each of the school's pages on Eduplana; one that is just {link} becomes the button to their private edit page. The logo, and a footer saying why they received it with an unsubscribe link, are always added.",
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
          defaultValue: "Eduplana",
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
      type: "collapsible",
      label: "Email for schools not on Eduplana",
      admin: {
        initCollapsed: true,
        description:
          "Sent from \u201cSend to specific addresses\u201d when an address does not belong to any listing, so there is no private link to give. No placeholders.",
      },
      fields: [
        { name: "generalSubject", type: "text", required: true, defaultValue: DEFAULT_GENERAL_SUBJECT },
        {
          name: "generalBody",
          type: "textarea",
          required: true,
          defaultValue: DEFAULT_GENERAL_BODY,
          admin: { rows: 14 },
        },
      ],
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
