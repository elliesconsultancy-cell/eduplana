import Image from "next/image";
import Link from "next/link";
import { Camera, Compass, MapPin, ShieldCheck } from "lucide-react";
import type { School } from "@/lib/types";
import { boardingLabel, locationLabel, shortFee } from "@/lib/format";
import { careerProfile } from "@/lib/career";
import { SaveButton, CompareButton } from "./school-actions";
import { asset } from "@/lib/assets";

/**
 * A result card answers four questions at a glance: what is it, where is it,
 * what does it cost, can I act on it. Everything above the fold of the card is
 * the answer; the actions sit below a rule so they never compete with it.
 */
export function SchoolCard({ school, priority = false }: { school: School; priority?: boolean }) {
  const photo = school.images.gallery[0];
  // Clamped visually rather than cut in the string: CSS's ellipsis reads as
  // "there is more", a cut sentence reads as broken data.
  const teaser = school.summary?.replace(/\s+/g, " ").trim();
  const career = careerProfile(school);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-ink-200 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        {photo ? (
          <Image
            src={asset(photo.thumb)}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <LogoPlaceholder school={school} />
        )}

        {/*
         * One row, no photo count. The count chip sat on the right and pushed
         * the career badge onto a second line at three-column widths — and it
         * was telling you something the gallery on the profile shows anyway.
         */}
        <div className="absolute inset-x-3 top-3 flex items-center gap-1.5">
          <Chip tone="dark">{school.level === "primary" ? "Primary" : "Secondary"}</Chip>
          {career.tier === "strong" ? (
            <Chip tone="career" title={`${career.count} of 8 career indicators published`}>
              <Compass size={10} strokeWidth={3} aria-hidden />
              Career signals
            </Chip>
          ) : null}
          {school.verified ? (
            <Chip tone="verified">
              <ShieldCheck size={10} strokeWidth={3} aria-hidden />
              Verified
            </Chip>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[17px] leading-snug text-ink-950">
          {/* Stretched link keeps the whole card clickable without nesting
              interactive elements inside an anchor. */}
          <Link
            href={`/schools/${school.slug}`}
            className="transition-colors before:absolute before:inset-0 group-hover:text-brand-700"
          >
            {school.name}
          </Link>
        </h3>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-500">
          <MapPin size={14} strokeWidth={2.2} aria-hidden className="shrink-0" />
          <span className="truncate">{locationLabel(school)}</span>
        </p>

        {teaser ? (
          <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-ink-600">{teaser}</p>
        ) : null}

        <dl className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <dt className="sr-only">Fees</dt>
          <dd className="font-display text-[17px] text-brand-700">{shortFee(school)}</dd>
          <dt className="sr-only">Model</dt>
          <dd className="text-[13px] text-ink-500">{boardingLabel(school)}</dd>
        </dl>

        {school.curricula.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {school.curricula.slice(0, 3).map((c) => (
              <li
                key={c}
                className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-800"
              >
                {c}
              </li>
            ))}
          </ul>
        ) : null}

        {/* z-10 lifts the buttons above the stretched link. */}
        <div className="relative z-10 mt-auto flex items-center gap-2 border-t border-ink-100 pt-4">
          <SaveButton slug={school.slug} compact />
          <CompareButton slug={school.slug} compact />
        </div>
      </div>
    </article>
  );
}

function LogoPlaceholder({ school }: { school: School }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-50 via-white to-ink-100">
      {school.images.logo ? (
        <Image
          src={asset(school.images.logo)}
          alt=""
          width={96}
          height={96}
          className="h-16 w-16 rounded-xl object-contain"
        />
      ) : (
        <span className="flex flex-col items-center gap-1.5 text-brand-700/35">
          <Camera size={22} strokeWidth={2} aria-hidden />
          <span className="font-display text-xl">{school.name.slice(0, 2).toUpperCase()}</span>
        </span>
      )}
    </div>
  );
}

function Chip({
  children,
  tone,
  title,
}: {
  children: React.ReactNode;
  tone: "dark" | "career" | "verified";
  title?: string;
}) {
  const tones = {
    dark: "bg-ink-950/70 text-white",
    career: "bg-career-600 text-white",
    verified: "bg-brand-600 text-white",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
