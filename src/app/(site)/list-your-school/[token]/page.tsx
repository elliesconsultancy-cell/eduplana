import type { Metadata } from "next";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { ListSchoolForm } from "@/components/list-school-form";
import { resolveInvite } from "@/lib/outreach/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add your school to Eduplana",
  robots: { index: false, follow: false },
};

const STEPS = [
  { title: "Tell us about your school", body: "The basics, your fees and photographs. It takes about ten minutes." },
  { title: "We check it", body: "A person at Eduplana reviews every new school, usually within two working days." },
  { title: "You are listed", body: "Parents can find and compare you, and you get a private link to keep it up to date." },
];

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
      <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
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
    <>
      <section className="border-b border-ink-100 bg-gradient-to-b from-brand-50 to-white">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <h1 className="font-display text-[2rem] font-semibold leading-tight text-ink-950 sm:text-5xl">
            Add your school to Eduplana
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-ink-600 sm:text-lg">
            You have been invited to list your school on Eduplana, a free directory that helps parents across
            Nigeria find and compare private schools. Listing is free, and nothing goes live until we have checked
            it.
          </p>
          <ol className="mt-10 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, n) => (
              <li key={step.title} className="rounded-2xl bg-white/80 p-5 shadow-card ring-1 ring-ink-100">
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white"
                >
                  {n + 1}
                </span>
                <p className="font-display mt-4 font-semibold text-ink-950">{step.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <ListSchoolForm states={[...NIGERIAN_STATE_NAMES]} email={invite.email ?? ""} token={token} />
      </div>
    </>
  );
}
