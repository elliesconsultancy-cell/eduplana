"use client";

import Link from "next/link";
import { SchoolCard } from "@/components/school-card";
import { useShortlist } from "@/components/shortlist-provider";
import { useSchoolList } from "@/components/use-school-list";

export default function ShortlistPage() {
  const { saved, ready } = useShortlist();
  const schools = useSchoolList(saved, ready);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
          Saved schools
        </h1>
        <p className="mt-1 text-ink-600">
          Kept on this device — no account needed. Share the list by sending the schools you like.
        </p>
      </header>

      {!ready || schools === null ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-[--radius-card] bg-white" />
          ))}
        </div>
      ) : schools.length === 0 ? (
        <div className="mt-8 rounded-[--radius-card] border border-dashed border-ink-300 bg-white p-10 text-center">
          <p className="font-display text-lg font-semibold text-ink-900">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
            Press “Save” on any school and it will appear here, ready for when you want to
            talk it over.
          </p>
          <Link
            href="/schools"
            className="mt-5 inline-block rounded-lg bg-brand-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Find schools
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-ink-500">
            {schools.length} school{schools.length === 1 ? "" : "s"} saved
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schools.map((school) => (
              <SchoolCard key={school.id} school={school} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
