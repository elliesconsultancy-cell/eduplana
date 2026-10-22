import type { Metadata } from "next";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { ListSchoolForm } from "@/components/list-school-form";
import { resolveInvite } from "@/lib/outreach/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add your school to Eduplana",
  robots: { index: false, follow: false },
};

/**
 * Where a school invited to join Eduplana adds itself.
 *
 * By invitation only: there is no link to this page anywhere on the site, and
 * without a valid link in the address it says so and offers nothing. Whatever
 * is sent from here waits for a person to approve it before it is published.
 */
export default async function ListYourSchoolPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await resolveInvite(token);

  if (!invite) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-20">
        <h1 className="font-display text-3xl font-semibold text-ink-950 sm:text-4xl">This link is not valid</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
          Adding a school is by invitation, and this invitation has expired or does not exist. If you were invited,
          email{" "}
          <a className="font-semibold text-brand-700 underline" href="mailto:info@eduplana.org">
            info@eduplana.org
          </a>{" "}
          and we will send a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink-950 sm:text-4xl">
        Add your school to Eduplana
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
        You have been invited to list your school on Eduplana, a free directory that helps parents across Nigeria
        find and compare private schools. Tell us the basics and we will create your listing. We check every new
        school before it goes live, and nothing is published until we have.
      </p>
      <ListSchoolForm states={[...NIGERIAN_STATE_NAMES]} email={invite.email ?? ""} token={token} />
    </div>
  );
}
