import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ChevronDown,
  GraduationCap,
  Mail,
  Package,
  School,
  Users,
  type LucideIcon,
} from "lucide-react";
import { topStates, totalCount } from "@/lib/schools";
import { TEAM, type Person } from "@/lib/team";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About us",
  description:
    "Eduplana began in 2017 as a civic tech organisation turning education data into advocacy. Today it is building a platform that brings parents, schools and educators together across Nigeria. Meet the team.",
};

/** What the platform is meant to bring together, from the founders' own description. */
const CONNECTS: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Users, label: "Parents" },
  { icon: GraduationCap, label: "Students" },
  { icon: School, label: "Private schools" },
  { icon: BookOpen, label: "Teachers" },
  { icon: Briefcase, label: "Education consultants" },
  { icon: Package, label: "Educational product providers" },
];

const ADVOCACY = [
  "Education financing",
  "Public school needs assessment",
  "Education policy reform",
  "Teachers' welfare",
  "Universities' autonomy",
  "State education funding",
];

export default async function AboutPage() {
  const [total, states] = await Promise.all([totalCount(), topStates(40)]);

  /*
   * The team and the organisation, described to search engines. Every field is
   * one the page itself states: no ratings, no counts that are not shown.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "AboutPage",
        "@id": `${SITE_URL}/about#page`,
        url: absoluteUrl("/about"),
        name: "About Eduplana",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#organization` },
      },
      ...TEAM.map((p) => ({
        "@type": "Person",
        "@id": `${SITE_URL}/about#${p.slug}`,
        name: p.name,
        jobTitle: p.role,
        description: p.summary,
        image: absoluteUrl(p.photo),
        url: absoluteUrl(`/about#${p.slug}`),
        worksFor: { "@id": `${SITE_URL}/#organization` },
      })),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero: the headline, and the four people behind it. */}
      <section className="relative isolate overflow-hidden banner-brand banner-grid">
        <div
          aria-hidden
          className="absolute -right-32 -top-24 -z-10 size-[560px] rounded-full bg-brand-400/25 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-28 pt-14 sm:px-6 sm:pb-32 sm:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
          <div>
            <h1 className="font-display tracking-display text-[2.1rem] leading-[1.08] text-white sm:text-[3.15rem]">
              Making education easier to see, choose and improve
            </h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-white/75">
              Eduplana began in 2017 as a civic tech organisation that turned education data into
              public pressure for change. Today we are building a platform for the people who shape
              a child&rsquo;s education: parents, schools, teachers and the organisations that
              support them.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#team"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
              >
                Meet the team
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </a>
              <Link
                href="/schools"
                className="inline-flex items-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Explore Schoolsbase
              </Link>
            </div>
          </div>

          {/* Staggered, so the four faces read as a group rather than a grid. */}
          <ul className="mx-auto grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4 lg:max-w-none">
            {TEAM.map((p, i) => (
              <li key={p.slug} className={i % 2 === 1 ? "mt-8 sm:mt-12" : ""}>
                <a
                  href={`#${p.slug}`}
                  className={`group relative block aspect-square overflow-hidden bg-brand-900 ring-1 ring-white/15 ${
                    i === 0 ? "rounded-[2.25rem] rounded-tl-[3.5rem]" : i === 3 ? "rounded-[2.25rem] rounded-br-[3.5rem]" : "rounded-[2.25rem]"
                  }`}
                >
                  <Image
                    src={p.photo}
                    alt={`Portrait of ${p.name}`}
                    fill
                    unoptimized
                    priority
                    sizes="(max-width: 1024px) 220px, 280px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent"
                  />
                  <span className="absolute inset-x-3 bottom-3 truncate rounded-full bg-white/15 px-3 py-1.5 text-center text-[12px] font-semibold text-white ring-1 ring-white/20 backdrop-blur-md">
                    {p.name}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The numbers sit across the banner's lower edge, so the page opens on facts. */}
      <div className="relative z-10 mx-auto -mt-12 max-w-6xl px-4 sm:-mt-14 sm:px-6">
        <dl className="grid grid-cols-2 overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-lift lg:grid-cols-4">
          {[
            { label: "Founded", value: "2017" },
            { label: "Private schools on Schoolsbase", value: total.toLocaleString() },
            { label: "States and the FCT covered", value: String(states.length) },
            { label: "Based in", value: "Lagos, Nigeria" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className={`px-6 py-6 ${i % 2 ? "border-l border-ink-100" : ""} ${
                i >= 2 ? "border-t border-ink-100 lg:border-t-0" : ""
              } ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className="text-[13px] font-medium text-ink-500">{stat.label}</dt>
              <dd className="mt-1 font-display text-[1.7rem] leading-tight text-ink-950">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* What it is */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              More than an education website
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-3">
              {CONNECTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4 py-3.5 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
                >
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"
                  >
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-5 text-[17px] leading-[1.75] text-ink-700">
            <p>
              Eduplana is an education technology and commerce platform. Our ambition is to become a
              digital marketplace that connects parents, students, private schools, teachers,
              education consultants and educational product providers, so they can discover, access
              and buy the products and services they need.
            </p>
            <p>
              Our advantage is that we are not building another education website. We are building a
              digital commerce ecosystem for the education sector, where people can find solutions to
              their educational needs and complete transactions on one platform.
            </p>
          </div>
        </div>
      </section>

      {/* How we got here */}
      <section className="border-y border-ink-100 bg-ink-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              From advocacy to a platform
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
              We started by making education data impossible to ignore. We are now putting the same
              data to work for the families and schools who use it every day.
            </p>
          </div>

          <ol className="mt-12 grid gap-10 lg:grid-cols-4 lg:gap-8">
            {[
              {
                when: "2017",
                title: "A civic tech organisation",
                body: "Eduplana is founded in Lagos to promote accountability and transparency in Nigeria's education sector.",
              },
              {
                when: "Since then",
                title: "Data into action",
                body: "Infographics and campaigns, including #EducationFund, #SaveLautech, #StudentInjustice and #OutofSchoolChildren, published in newspapers and shared with radio partners.",
              },
              {
                when: "Today",
                title: "Schoolsbase",
                body: `A directory that helps parents find and compare ${total.toLocaleString()} private schools on fees, curriculum and facilities, and helps schools keep their own details right.`,
              },
              {
                when: "Next",
                title: "A marketplace for education",
                body: "One place for families, schools, teachers and providers to find what they need and complete the transaction.",
              },
            ].map((step, i, all) => (
              <li key={step.when} className="relative pt-8">
                <span
                  aria-hidden
                  className="absolute left-0 top-0 size-3.5 rounded-full bg-brand-600 ring-4 ring-brand-100"
                />
                {i < all.length - 1 ? (
                  <span aria-hidden className="absolute left-6 right-[-2rem] top-[6px] hidden h-px bg-brand-200 lg:block" />
                ) : null}
                <p className="text-sm font-bold text-brand-700">{step.when}</p>
                <h3 className="font-display mt-1.5 text-lg leading-snug text-ink-950">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>

          <div className="mt-14 border-t border-ink-200 pt-8">
            <p className="text-sm font-semibold text-ink-800">Areas our advocacy has covered</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {ADVOCACY.map((a) => (
                <li
                  key={a}
                  className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink-700 ring-1 ring-ink-200"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The team */}
      <section id="team" className="scroll-mt-24 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              The people behind Eduplana
            </h2>
            <p className="mt-3 text-[17px] leading-relaxed text-ink-600">
              Advocacy, engineering, strategy and communication: the four people leading the work.
            </p>
          </div>
          <nav aria-label="Jump to a profile">
            <ul className="flex flex-wrap gap-2">
              {TEAM.map((p) => (
                <li key={p.slug}>
                  <a
                    href={`#${p.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1.5 pl-1.5 pr-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
                  >
                    <span className="relative size-8 overflow-hidden rounded-full bg-ink-100">
                      <Image src={p.photo} alt="" fill unoptimized sizes="32px" className="object-cover" />
                    </span>
                    {p.name.split(" ")[0]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 space-y-6 sm:space-y-8">
          {TEAM.map((p) => (
            <Profile key={p.slug} person={p} />
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-3xl banner-brand banner-grid">
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-[1.6rem] leading-tight text-white sm:text-[2.1rem]">
                A school, a partner, or a parent with a question?
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">
                We are based in Lagos and read every message. If your school is already listed, you
                can correct its details yourself, without an account.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="mailto:info@eduplana.org"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
              >
                <Mail size={16} strokeWidth={2.4} aria-hidden />
                info@eduplana.org
              </a>
              <Link
                href="/manage"
                className="inline-flex items-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Update your school&rsquo;s listing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * One person, on a card of their own: the portrait on the left with their role
 * across it, the story on the right. The portrait stays in view while a longer
 * bio scrolls past it, and the profile has its own address so it can be linked
 * to directly. The first two paragraphs are always visible; the rest open with
 * a native <details>, which works without JavaScript and is readable to search
 * engines either way.
 *
 * The card clips with overflow-clip, not overflow-hidden: hidden makes it a
 * scroll container, and the portrait's `sticky` would then stick to the card
 * instead of the page.
 */
function Profile({ person }: { person: Person }) {
  const shown = person.paragraphs.slice(0, 2);
  const more = person.paragraphs.slice(2);

  return (
    <article
      id={person.slug}
      className="scroll-mt-28 overflow-clip rounded-[2rem] border border-ink-100 bg-white shadow-card lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]"
    >
      <div className="p-3 sm:p-4 lg:p-5">
        <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-brand-950 lg:sticky lg:top-[88px]">
          {/* Already sized and compressed, so the optimizer has nothing to add. */}
          <Image
            src={person.photo}
            alt={`Portrait of ${person.name}`}
            fill
            unoptimized
            sizes="(max-width: 1024px) 90vw, 416px"
            className="object-cover"
          />
          {/* A cool blue wash at the foot: the role needs a surface to sit on. */}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-950/85 to-transparent"
          />
          {person.group === "co-founder" ? (
            <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-[12px] font-bold text-brand-800 shadow-sm">
              Co-founder
            </span>
          ) : null}
          <p className="absolute inset-x-4 bottom-4 text-[15px] font-semibold leading-snug text-white">
            {person.role}
          </p>
        </div>
      </div>

      <div className="min-w-0 p-6 sm:p-8 lg:py-10 lg:pl-4 lg:pr-12">
        <h3 className="font-display text-[2rem] leading-[1.1] tracking-display text-ink-950 sm:text-[2.5rem]">
          {person.name}
        </h3>

        <p className="mt-5 text-[1.12rem] leading-[1.7] text-ink-800">{shown[0]}</p>
        {shown.slice(1).map((para) => (
          <p key={para} className="mt-4 text-[16px] leading-[1.8] text-ink-600">
            {para}
          </p>
        ))}

        {more.length > 0 ? (
          <details className="group mt-4">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-800 transition-colors hover:bg-brand-100 [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Read the full profile</span>
              <span className="hidden group-open:inline">Show less</span>
              <ChevronDown
                size={16}
                strokeWidth={2.6}
                aria-hidden
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mt-5 space-y-4">
              {more.map((para) => (
                <p key={para} className="text-[16px] leading-[1.8] text-ink-600">
                  {para}
                </p>
              ))}
            </div>
          </details>
        ) : null}

        <div className="mt-8 border-t border-ink-100 pt-6">
          <ul className="flex flex-wrap gap-2">
            {person.expertise.map((e) => (
              <li key={e} className="rounded-full bg-brand-50 px-3 py-1 text-[13px] font-semibold text-brand-800">
                {e}
              </li>
            ))}
          </ul>

          {person.workedWith?.length ? (
            <p className="mt-5 text-sm leading-relaxed text-ink-500">
              <span className="font-semibold text-ink-700">Has worked with </span>
              {person.workedWith.join(", ")}.
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
