import type { Metadata } from "next";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { ListSchoolForm } from "@/components/list-school-form";

export const metadata: Metadata = {
  title: "Add your school to Eduplana",
  description: "Is your school missing from Eduplana? Add it for free. We check every listing before it goes live.",
};

/**
 * Where a school that is not in the directory asks to be added.
 *
 * Open to anyone, because a school has no listing to hold a private link to.
 * That is why nothing sent here is published until a person has reviewed it.
 * The outreach email links here with the school's address filled in.
 */
export default async function ListYourSchoolPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const prefill = typeof email === "string" && /^[^\s@]{1,80}@[^\s@]{1,80}\.[^\s@]{2,}$/.test(email) ? email : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink-950 sm:text-4xl">
        Add your school to Eduplana
      </h1>
      <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
        Eduplana is a free directory that helps parents across Nigeria find and compare private schools. Tell us
        the basics and we will create your listing. We check every new school before it goes live, and nothing is
        published until we have.
      </p>
      <p className="mt-3 text-sm text-ink-500">
        Already listed? Request your private link at{" "}
        <a className="font-semibold text-brand-700 underline" href="/manage">
          eduplana.org/manage
        </a>{" "}
        instead.
      </p>
      <ListSchoolForm states={[...NIGERIAN_STATE_NAMES]} email={prefill} />
    </div>
  );
}
