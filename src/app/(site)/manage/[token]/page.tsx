import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { loadSchool, markOpened, resolveLink } from "@/lib/outreach/server";
import type { School } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your listings",
  robots: { index: false, follow: false },
};

/**
 * Where a private link lands.
 *
 * A link covering one listing goes straight to it. A link covering several —
 * a school's primary and secondary records, or a group's campuses — lists them
 * so the person can work through each.
 */
export default async function LinkPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const access = await resolveLink(token);
  if (!access) redirect("/manage?expired=1");

  await markOpened(access.schools).catch((error) => console.error("[manage] could not record opening", error));

  const schools = (await Promise.all(access.schools.map(loadSchool))).filter((s): s is School => Boolean(s));
  if (schools.length === 1) redirect(`/manage/${token}/${schools[0].id}`);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl font-semibold text-ink-950 sm:text-4xl">Your listings</h1>
      <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
        {schools.length === 0
          ? "None of the listings this link was issued for are on Eduplana any more."
          : `This link covers ${schools.length} listings that use ${access.email}. Check each one — they are separate pages on Eduplana.`}
      </p>
      <ul className="mt-8 grid gap-3">
        {schools.map((s) => (
          <li key={s.id}>
            <Link
              href={`/manage/${token}/${s.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white p-5 transition-colors hover:border-brand-400"
            >
              <span>
                <span className="block font-semibold text-ink-950">{s.name}</span>
                <span className="mt-0.5 block text-sm text-ink-500">
                  {s.level === "primary" ? "Primary" : "Secondary"}
                  {[s.area, s.state].filter(Boolean).length ? ` · ${[s.area, s.state].filter(Boolean).join(", ")}` : ""}
                  {s.verified ? " · Verified" : ""}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-brand-700">Review →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
