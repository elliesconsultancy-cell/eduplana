import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NIGERIAN_STATE_NAMES } from "@/collections/Schools";
import { ManageForm } from "@/components/manage-form";
import { toListing } from "@/lib/outreach/listing";
import { db, loadSchool, resolveLink } from "@/lib/outreach/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Update your listing",
  robots: { index: false, follow: false },
};

export default async function ManageSchoolPage({
  params,
}: {
  params: Promise<{ token: string; school: string }>;
}) {
  const { token, school: id } = await params;
  const access = await resolveLink(token);
  if (!access) redirect("/manage?expired=1");
  if (!access.schools.includes(id)) notFound();

  const school = await loadSchool(id);
  if (!school) notFound();

  const payload = await db();
  const { docs: pending } = await payload.find({
    collection: "school-submissions",
    where: { and: [{ school: { equals: id } }, { status: { equals: "pending" } }] },
    sort: "-createdAt",
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      {access.schools.length > 1 ? (
        <Link href={`/manage/${token}`} className="text-sm font-semibold text-brand-700 hover:underline">
          ← All your listings
        </Link>
      ) : null}
      <h1 className="mt-2 font-display text-3xl font-semibold text-ink-950 sm:text-4xl">{school.name}</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
        This is your listing as parents see it on Eduplana. Correct anything that is wrong or
        missing, then submit. We check every change before it goes live, usually within two working
        days.{" "}
        <Link href={`/schools/${school.slug}`} target="_blank" className="font-semibold text-brand-700 underline">
          See the public page
        </Link>
      </p>

      {pending[0] ? (
        <p className="mt-6 rounded-xl bg-gold-100 px-4 py-3 text-ink-800">
          We received changes for this listing on{" "}
          {new Date(String(pending[0].createdAt)).toLocaleDateString("en-NG", { day: "numeric", month: "long" })}{" "}
          and they are waiting for review. Submitting again replaces them.
        </p>
      ) : null}

      <ManageForm
        token={token}
        schoolId={school.id}
        schoolName={school.name}
        initial={toListing(school)}
        states={[...NIGERIAN_STATE_NAMES]}
        defaultContactEmail={access.email}
        backHref={access.schools.length > 1 ? `/manage/${token}` : null}
      />
    </div>
  );
}
