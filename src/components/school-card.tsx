import { AssetImage } from "@/components/asset-image";
import Link from "next/link";
import { BadgeCheck, Camera, MapPin } from "lucide-react";
import type { School } from "@/lib/types";
import { boardingLabel, locationLabel, shortFee } from "@/lib/format";
import { SaveButton, CompareButton } from "./school-actions";

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
  const verified = school.verified;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white transition-all duration-300 hover:-translate-y-1 ${
        verified
          ? // Verified: a brand frame and a blue glow, so the card reads as a
            // different kind of listing before any text is read.
            "border-2 border-brand-500 shadow-[0_14px_34px_-14px_rgb(34_96_183/0.55)] hover:border-brand-600 hover:shadow-[0_22px_46px_-16px_rgb(34_96_183/0.65)]"
          : "border border-ink-100 shadow-card hover:border-ink-200 hover:shadow-lift"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-ink-100">
        {photo ? (
          <AssetImage
            path={photo.thumb}
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
         * Level on the left; on a verified school, the seal on the right. The
         * career signal lives on the profile, where it is shown with its
         * workings — on a card it was one chip too many and read as a claim.
         */}
        <div className="absolute inset-x-3 top-3 flex items-center gap-1.5">
          <Chip tone="dark">{school.level === "primary" ? "Primary" : "Secondary"}</Chip>
        </div>

        {verified ? (
          <div
            title="Details confirmed with the school by Eduplana"
            className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-brand-950/95 via-brand-900/75 to-transparent px-4 pb-3 pt-12"
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white shadow-sm">
              <BadgeCheck size={17} strokeWidth={2.3} aria-hidden className="fill-brand-600 text-white" />
            </span>
            <span className="text-[13px] font-bold tracking-wide text-white">Verified by Eduplana</span>
          </div>
        ) : null}
      </div>

      <div
        className={`flex flex-1 flex-col p-5 ${verified ? "bg-gradient-to-b from-brand-50 via-brand-50/40 to-white" : ""}`}
      >
        <h3 className="font-display text-[17px] leading-snug text-ink-950">
          {/* Stretched link keeps the whole card clickable without nesting
              interactive elements inside an anchor. */}
          <Link
            href={`/schools/${school.slug}`}
            className="transition-colors before:absolute before:inset-0 group-hover:text-brand-700"
          >
            <NameWithCheck name={school.name} verified={verified} />
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
        <AssetImage
          path={school.images.logo}
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
  tone: "dark";
  title?: string;
}) {
  const tones = {
    dark: "bg-ink-950/70 text-white",
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

/**
 * The name, with the verified check bound to its last word: on a long name a
 * check left to wrap on its own reads as a stray mark rather than a badge.
 */
function NameWithCheck({ name, verified }: { name: string; verified: boolean }) {
  if (!verified) return <>{name}</>;
  const words = name.trim().split(/\s+/);
  const last = words.pop();
  return (
    <>
      {words.length ? `${words.join(" ")} ` : ""}
      <span className="whitespace-nowrap">
        {last}
        <BadgeCheck
          size={18}
          strokeWidth={2.4}
          aria-label="Verified"
          className="ml-1 inline-block -translate-y-px fill-brand-600 align-middle text-white"
        />
      </span>
    </>
  );
}
