import type { Metadata } from "next";
import { AssetImage } from "@/components/asset-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronRight,
  Church,
  Coins,
  Compass,
  ExternalLink,
  FileDown,
  Globe,
  GraduationCap,
  Info,
  MapPin,
  Phone,
  Signpost,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Gallery } from "@/components/gallery";
import { SchoolCard } from "@/components/school-card";
import { CompareButton, SaveButton } from "@/components/school-actions";
import { IconChipList } from "@/components/icon-chip";
import {
  CareerBadge,
  CareerBreakdown,
  VerifiedBadge,
} from "@/components/career-badge";
import { allSchools, getSchool, relatedSchools } from "@/lib/schools";
import {
  boardingLabel,
  displayPhone,
  formatFee,
  formatNaira,
  locationLabel,
  telHref,
} from "@/lib/format";
import { summaryTeaser } from "@/lib/summary";
import type { School } from "@/lib/types";
import { asset, assetOrUndefined } from "@/lib/assets";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) return { title: "School not found" };

  const description =
    summaryTeaser(school.summary, 155) ??
    `${school.name} — ${locationLabel(school)}. Fees, curriculum and facilities.`;
  // A school with no photograph of its own still needs a share card, or the
  // link renders bare; fall back to the site card rather than nothing.
  const image =
    assetOrUndefined(school.images.gallery[0]?.full ?? school.images.logo) ?? "/brand/og-card.png";

  return {
    title: school.name,
    description,
    alternates: { canonical: `/schools/${school.slug}` },
    openGraph: {
      type: "profile",
      siteName: SITE_NAME,
      locale: "en_NG",
      url: absoluteUrl(`/schools/${school.slug}`),
      title: `${school.name} — ${locationLabel(school)}`,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${school.name} — ${locationLabel(school)}`,
      description,
      images: [image],
    },
  };
}

/**
 * Pre-render the richest profiles at build time; the long tail renders on
 * demand and is cached thereafter. Building all 7,000 would slow every build
 * for pages almost nobody opens directly.
 */
export function generateStaticParams() {
  return allSchools()
    .filter((s) => s.images.gallery.length > 0)
    .map((s) => ({ slug: s.slug }));
}

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = getSchool(slug);
  if (!school) notFound();

  const related = relatedSchools(school);
  const summary = school.summary;
  const phone = displayPhone(school.phone);
  const tel = telHref(school.phone);

  // Some listings paste the same block into both fields; showing a club twice
  // under two headings reads as padding.
  const listed = new Set(school.activities.map((a) => a.toLowerCase()));
  const clubs = school.clubs.filter((c) => !listed.has(c.toLowerCase()));

  /*
   * Describes this one school to search engines. Only fields the record
   * actually holds are emitted — an empty address or a telephone we do not
   * have would be a claim, and structured data that contradicts the page is
   * worse than none. Deliberately no aggregateRating: there are no reviews,
   * and inventing stars is exactly the kind of thing that earns a penalty.
   */
  const schoolJsonLd = {
    "@context": "https://schema.org",
    "@type": "School",
    name: school.name,
    url: absoluteUrl(`/schools/${school.slug}`),
    ...(summary ? { description: summary } : {}),
    ...(school.phone ? { telephone: school.phone } : {}),
    ...(school.website ? { sameAs: [school.website] } : {}),
    ...(school.yearFounded ? { foundingDate: String(school.yearFounded) } : {}),
    ...(assetOrUndefined(school.images.gallery[0]?.full ?? school.images.logo)
      ? { image: assetOrUndefined(school.images.gallery[0]?.full ?? school.images.logo) }
      : {}),
    address: {
      "@type": "PostalAddress",
      ...(school.address ? { streetAddress: school.address } : {}),
      ...(school.area ? { addressLocality: school.area } : {}),
      ...(school.state ? { addressRegion: school.state } : {}),
      addressCountry: "NG",
    },
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  return (
    <article className="pb-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
      />
      <ProfileBar school={school} tel={tel} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Breadcrumb school={school} />
        <Masthead school={school} />

        {school.images.gallery.length > 0 ? (
          <div className="mt-7">
            <Gallery images={school.images.gallery} name={school.name} />
          </div>
        ) : null}

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
          <div className="min-w-0 space-y-12">
            <AtAGlance school={school} />

            <Section title="Career education" icon={Compass}>
              <CareerBreakdown school={school} />
            </Section>

            {summary ? (
              <Section title="About this school" icon={Sparkles}>
                <div className="rounded-card border border-ink-100 bg-ink-50/60 p-6">
                  <p className="whitespace-pre-line text-[15px] leading-[1.75] text-ink-700">
                    {summary}
                  </p>
                  <p className="mt-4 border-t border-ink-200 pt-3 text-xs text-ink-500">
                    In the school’s own words.
                  </p>
                </div>
              </Section>
            ) : null}

            <FeeBreakdown school={school} />

            <Downloads school={school} />

            {school.facilities.length > 0 ? (
              <Section
                title="Facilities"
                icon={Building2}
                count={school.facilities.length}
              >
                <IconChipList items={school.facilities} />
              </Section>
            ) : null}

            {school.activities.length > 0 ? (
              <Section
                title="Extracurricular activities"
                icon={Sparkles}
                count={school.activities.length}
              >
                <IconChipList items={school.activities} />
              </Section>
            ) : null}

            {clubs.length > 0 ? (
              <Section
                title="Clubs and societies"
                icon={Users}
                count={clubs.length}
              >
                <IconChipList items={clubs} />
              </Section>
            ) : null}
          </div>

          <ContactAside school={school} phone={phone} tel={tel} />
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-20 border-t border-ink-100 bg-ink-50/70">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl text-ink-950">
                  Other schools nearby
                </h2>
                <p className="mt-1.5 text-ink-600">
                  In {school.area ?? school.state ?? "the same area"}, at a
                  similar fee level.
                </p>
              </div>
              {school.state ? (
                <Link
                  href={`/schools?state=${encodeURIComponent(school.state)}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 ring-1 ring-ink-200 transition-colors hover:bg-brand-50 hover:ring-brand-200"
                >
                  All schools in {school.state}
                  <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
                </Link>
              ) : null}
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((s: School) => (
                <SchoolCard key={s.id} school={s} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}

/** Sticky bar so the name and the three actions stay reachable while reading. */
function ProfileBar({ school, tel }: { school: School; tel: string | null }) {
  return (
    <div className="sticky top-[68px] z-30 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <p className="min-w-0 flex-1 truncate font-display text-[15px] text-ink-950">
          {school.name}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <SaveButton slug={school.slug} compact />
          <CompareButton slug={school.slug} compact />
          {tel ? (
            <a
              href={tel}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-3.5 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <Phone size={14} strokeWidth={2.5} aria-hidden />
              <span className="hidden sm:inline">Call school</span>
              <span className="sm:hidden">Call</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Breadcrumb({ school }: { school: School }) {
  return (
    <nav aria-label="Breadcrumb" className="pt-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-500">
        <li>
          <Link href="/schools" className="hover:text-brand-700">
            Schools
          </Link>
        </li>
        {school.state ? (
          <>
            <ChevronRight size={14} aria-hidden className="text-ink-300" />
            <li>
              <Link
                href={`/schools?state=${encodeURIComponent(school.state)}`}
                className="hover:text-brand-700"
              >
                {school.state}
              </Link>
            </li>
          </>
        ) : null}
        <ChevronRight size={14} aria-hidden className="text-ink-300" />
        <li className="truncate font-medium text-ink-800">{school.name}</li>
      </ol>
    </nav>
  );
}

function Masthead({ school }: { school: School }) {
  const tags = [
    school.level === "primary" ? "Primary" : "Secondary",
    ...school.curricula.slice(0, 3),
    school.faith && school.faith !== "Secular" ? school.faith : null,
  ].filter(Boolean) as string[];

  return (
    <header className="mt-5 flex flex-wrap items-start gap-5">
      {school.images.logo ? (
        <AssetImage
          path={school.images.logo}
          alt=""
          width={112}
          height={112}
          priority
          className="size-16 shrink-0 rounded-2xl border border-ink-100 bg-white object-contain p-2 shadow-card sm:size-20"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <h1 className="font-display tracking-display text-[1.75rem] leading-[1.12] text-ink-950 sm:text-[2.6rem]">
          {school.name}
        </h1>
        {school.tagline ? (
          <p className="mt-1.5 text-[15px] text-brand-700">{school.tagline}</p>
        ) : null}
        <p className="mt-2.5 flex items-center gap-1.5 text-ink-600">
          <MapPin
            size={16}
            strokeWidth={2.2}
            aria-hidden
            className="shrink-0 text-ink-400"
          />
          {locationLabel(school)}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <VerifiedBadge school={school} />
          <CareerBadge school={school} />
        </div>

        {tags.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-800"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </header>
  );
}

/** The eight facts a parent checks first, each with its own icon and tint. */
function AtAGlance({ school }: { school: School }) {
  const facts: Array<{
    icon: LucideIcon;
    label: string;
    value: string | null;
    tint: string;
    feature?: boolean;
    /**
     * Drop the card entirely when there is no value, rather than saying "not
     * provided". Used where absence is the overwhelming norm and the row would
     * be noise on nearly every page — scholarships are published by 74 schools
     * out of 7,375, so the other 7,301 would carry a card that says nothing.
     */
    omitWhenEmpty?: boolean;
  }> = [
    {
      icon: Coins,
      label: "Fees per term",
      value:
        school.fee.min == null && school.fee.max == null
          ? null
          : formatFee(school),
      tint: "bg-amber-50 text-amber-700",
      feature: true,
    },
    {
      icon: BookOpen,
      label: "Curriculum",
      value: school.curricula.join(", ") || null,
      tint: "bg-sky-50 text-sky-700",
    },
    {
      icon: Users,
      label: "Maximum class size",
      value: school.maxClassSize ? `${school.maxClassSize} students` : null,
      tint: "bg-violet-50 text-violet-700",
    },
    {
      icon: Building2,
      label: "Day or boarding",
      value: boardingLabel(school),
      tint: "bg-teal-50 text-teal-700",
    },
    {
      icon: GraduationCap,
      label: "Education level",
      value: school.scope,
      tint: "bg-indigo-50 text-indigo-700",
    },
    {
      icon: CalendarDays,
      label: "Year founded",
      value: school.yearFounded?.toString() ?? null,
      tint: "bg-rose-50 text-rose-700",
    },
    {
      icon: Church,
      label: "Faith",
      value: school.faith,
      tint: "bg-lime-50 text-lime-700",
    },
    {
      icon: BadgeCheck,
      label: "Scholarships",
      value: school.scholarship,
      tint: "bg-emerald-50 text-emerald-700",
      omitWhenEmpty: true,
    },
    {
      icon: Sparkles,
      label: "Siblings’ discount",
      value: school.siblingsDiscount,
      tint: "bg-pink-50 text-pink-700",
    },
  ];

  return (
    <Section title="At a glance" icon={Info}>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts
          .filter((fact) => fact.value || !fact.omitWhenEmpty)
          .map((fact) => {
            const Icon = fact.icon;
            return (
              <div
                key={fact.label}
                className="rounded-card border border-ink-100 bg-white p-4 shadow-card transition-shadow hover:shadow-lift"
              >
                <span
                  aria-hidden
                  className={`grid size-9 place-items-center rounded-xl ${fact.tint}`}
                >
                  <Icon size={17} strokeWidth={2.2} />
                </span>
                <dt className="mt-3 text-[13px] font-medium text-ink-500">
                  {fact.label}
                </dt>
                <dd
                  className={
                    fact.value
                      ? fact.feature
                        ? "font-display mt-0.5 text-[17px] text-brand-700"
                        : "mt-0.5 font-semibold text-ink-900"
                      : "mt-0.5 text-ink-400"
                  }
                >
                  {/* Missing values say so explicitly — never a blank or a dash. */}
                  {fact.value || "Not provided"}
                </dd>
              </div>
            );
          })}
      </dl>
    </Section>
  );
}

function ContactAside({
  school,
  phone,
  tel,
}: {
  school: School;
  phone: string | null;
  tel: string | null;
}) {
  const rows: Array<{
    icon: LucideIcon;
    label: string;
    node: React.ReactNode;
  }> = [];

  if (phone) {
    rows.push({
      icon: Phone,
      label: "Phone",
      node: (
        <a
          href={tel ?? "#"}
          className="font-semibold text-brand-800 hover:underline"
        >
          {phone}
        </a>
      ),
    });
  }
  // The directory names a real person for admissions enquiries — worth showing
  // beside the number, since it tells a parent who they are about to reach.
  if (school.admissionsOfficer) {
    rows.push({
      icon: UserRound,
      label: "Admissions contact",
      node: (
        <>
          {school.admissionsOfficer}
          {school.admissionsRole ? (
            <span className="block text-ink-500">{school.admissionsRole}</span>
          ) : null}
        </>
      ),
    });
  }
  if (school.address) {
    rows.push({ icon: MapPin, label: "Address", node: school.address });
  }
  if (school.busStop) {
    rows.push({
      icon: Signpost,
      label: "Nearest landmark",
      node: school.busStop,
    });
  }
  if (school.website) {
    rows.push({
      icon: Globe,
      label: "Website",
      node: (
        <a
          href={school.website}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 break-all font-semibold text-brand-800 hover:underline"
        >
          {school.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          <ExternalLink
            size={13}
            strokeWidth={2.4}
            aria-hidden
            className="shrink-0"
          />
        </a>
      ),
    });
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-[136px] lg:self-start">
      <div className="overflow-hidden rounded-card border border-ink-100 bg-white shadow-card">
        <div className="bg-gradient-to-br from-brand-900 to-brand-700 px-5 py-5 text-white">
          <h2 className="font-display text-base">Get in touch</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-brand-100">
            Contact {school.name} directly to confirm fees and admissions.
          </p>
        </div>

        {rows.length > 0 ? (
          <dl className="space-y-4 px-5 py-5 text-sm">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-ink-50 text-ink-500"
                  >
                    <Icon size={15} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[12px] font-medium text-ink-500">
                      {row.label}
                    </dt>
                    <dd className="mt-0.5 leading-relaxed text-ink-800">
                      {row.node}
                    </dd>
                  </div>
                </div>
              );
            })}
          </dl>
        ) : (
          <p className="px-5 py-5 text-sm text-ink-500">
            This school has not published contact details.
          </p>
        )}

        {tel ? (
          <div className="px-5 pb-5">
            <a
              href={tel}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-700"
            >
              <Phone size={15} strokeWidth={2.5} aria-hidden />
              Call {phone}
            </a>
          </div>
        ) : null}
      </div>

      <div className="rounded-card border border-gold-200 bg-gold-100/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900">
          <BadgeCheck
            size={16}
            strokeWidth={2.3}
            aria-hidden
            className="text-gold-600"
          />
          Before you apply
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
          Fees and admissions requirements change between sessions. Confirm the
          current session’s details with the school directly before you apply.
        </p>
      </div>
    </aside>
  );
}

function Section({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2.5 font-display text-xl text-ink-950">
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-lg bg-brand-50 text-brand-700"
        >
          <Icon size={16} strokeWidth={2.3} />
        </span>
        {title}
        {count != null ? (
          <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-500 tabular-nums">
            {count}
          </span>
        ) : null}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Exact tuition lines, when the school published them.
 *
 * Most schools only give the directory's coarse band ("N1 000 000+"), which is
 * all `fee` can represent. Where a school itemised its fees per stage, those
 * figures are both more precise and more useful — a parent with one child
 * starting nursery needs the infant number, not the whole-school range.
 */
function FeeBreakdown({ school }: { school: School }) {
  if (!school.feeItems?.length) return null;

  return (
    <Section title="Fees breakdown" icon={Coins} count={school.feeItems.length}>
      <div className="overflow-hidden rounded-card border border-ink-100">
        <table className="w-full">
          <caption className="sr-only">Published tuition fees per term</caption>
          <tbody>
            {school.feeItems.map((item, index) => (
              <tr
                key={`${item.label}-${item.amount}`}
                className={index % 2 ? "bg-white" : "bg-ink-50/60"}
              >
                <th
                  scope="row"
                  className="border-b border-ink-100 p-4 text-left text-sm font-medium text-ink-700"
                >
                  {item.label}
                </th>
                <td className="border-b border-ink-100 p-4 text-right text-[15px] font-bold tabular-nums text-ink-950">
                  {formatNaira(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ink-500">
        Published by the school per term. Confirm the current session&rsquo;s
        fees directly — these change between sessions and may exclude
        registration, uniform and other charges.
      </p>
    </Section>
  );
}

/** Admission forms the school made downloadable. */
function Downloads({ school }: { school: School }) {
  if (!school.admissionForm) return null;

  return (
    <Section title="Downloads" icon={FileDown}>
      <a
        href={asset(school.admissionForm)}
        download
        className="group flex items-center gap-4 rounded-card border border-ink-200 bg-white p-4 transition-colors hover:border-brand-500 hover:bg-brand-50/40"
      >
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <FileDown size={20} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink-950">
            Admission form
          </span>
          <span className="block text-sm text-ink-600">
            PDF, published by {school.name}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-brand-700 group-hover:text-brand-900">
          Download
        </span>
      </a>
    </Section>
  );
}
