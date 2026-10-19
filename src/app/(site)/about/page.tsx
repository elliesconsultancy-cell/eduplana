import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, Mail, Search, Users } from "lucide-react";
import { NigeriaMap } from "@/components/nigeria-map";
import { TeamGrid } from "@/components/team-grid";
import { topStates, totalCount } from "@/lib/schools";
import { TEAM } from "@/lib/team";
import { SITE_URL, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About us",
  description:
    "Eduplana began in 2017 as a civic tech organisation turning education data into advocacy. Today it is building a platform that brings parents, schools and educators together across Nigeria. Meet the team.",
};

const WHY = [
  {
    icon: Search,
    title: "Find the right school",
    body: "Access reliable information about schools across Nigeria.",
  },
  {
    icon: BarChart3,
    title: "Make informed decisions",
    body: "Compare, explore and choose with confidence.",
  },
  {
    icon: Users,
    title: "Help education improve",
    body: "Greater visibility drives better standards and more opportunities for every learner.",
  },
];

export default async function AboutPage() {
  const [total, states] = await Promise.all([totalCount(), topStates(40)]);
  const counts = new Map(states.map((s) => [s.value, s.count]));
  // Nigeria is 36 states and the Federal Capital Territory; the directory lists
  // the FCT among its states, so it is counted apart rather than as a 37th.
  const hasFct = states.some((s) => s.value.startsWith("FCT"));
  const coverage = `${states.length - (hasFct ? 1 : 0)}${hasFct ? " + FCT" : ""}`;

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

      {/* Hero: the promise, and the country it is made in. */}
      <section className="relative isolate overflow-hidden banner-brand banner-grid">
        <div
          aria-hidden
          className="absolute -right-24 top-0 -z-10 size-[620px] rounded-full bg-brand-500/25 blur-3xl"
        />
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-12 lg:py-24">
          <div>
            <h1 className="font-display tracking-display text-[2.3rem] leading-[1.06] text-white sm:text-[3.4rem]">
              Making education easier to see, choose and improve
            </h1>
            <p className="mt-6 max-w-lg text-[18px] leading-relaxed text-white/80">
              From education advocacy to everyday decisions. We help families and schools turn
              information into opportunity.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#story"
                className="inline-flex items-center rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
              >
                Our story
              </a>
              <a
                href="#team"
                className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 transition-colors hover:text-white"
              >
                Meet the team
                <ArrowRight size={16} strokeWidth={2.4} aria-hidden />
              </a>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[34rem] lg:max-w-none">
            <NigeriaMap counts={counts} />
          </div>
        </div>
      </section>

      {/* Three facts, on white. */}
      <section aria-label="Eduplana in numbers" className="border-b border-ink-100 bg-white">
        <dl className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-ink-100 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6">
          {[
            { value: "2017", label: "Founded in Lagos" },
            { value: total.toLocaleString(), label: "Schools on Schoolsbase" },
            { value: coverage, label: "Nationwide coverage" },
          ].map((stat) => (
            <div key={stat.label} className="px-4 py-7 text-center sm:py-9">
              <dd className="font-display text-[2.2rem] leading-none text-brand-600 sm:text-[2.6rem]">{stat.value}</dd>
              <dt className="mt-2 text-[15px] text-ink-600">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Why we exist */}
      <section id="story" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-16">
          <h2 className="font-display text-[2rem] leading-[1.1] text-ink-950 sm:text-[2.75rem]">
            Better information.
            <br /> Better education.
          </h2>
          <div className="space-y-4 text-[16px] leading-[1.75] text-ink-600">
            <p>
              Eduplana is an education technology and commerce platform. Our ambition is to become a
              digital marketplace that connects parents, students, private schools, teachers,
              education consultants and educational product providers, so they can discover, access
              and buy the products and services they need.
            </p>
            <p>
              We are not building another education website. We are building a digital commerce
              ecosystem for the education sector, where people can find solutions to their
              educational needs and complete transactions on one platform.
            </p>
          </div>
        </div>

        <ul className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-ink-100">
          {WHY.map(({ icon: Icon, title, body }) => (
            <li key={title} className="sm:px-8 sm:first:pl-0 sm:last:pr-0">
              <Icon size={30} strokeWidth={1.8} aria-hidden className="text-brand-600" />
              <h3 className="font-display mt-4 text-[1.2rem] leading-snug text-ink-950">{title}</h3>
              <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-ink-600">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* The journey */}
      <section className="bg-brand-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <h2 className="font-display text-[2rem] leading-[1.1] text-ink-950 sm:text-[2.75rem]">
            The mission stays.
            <br /> The possibilities grow.
          </h2>

          <ol className="mt-14 grid gap-12 lg:grid-cols-3 lg:gap-10">
            {[
              {
                when: "2017",
                title: "Advocacy & accountability",
                body: "We started by championing greater transparency and accountability in Nigerian education. Our campaigns include #EducationFund, #SaveLautech, #StudentInjustice and #OutofSchoolChildren.",
                done: true,
              },
              {
                when: "Today",
                title: "Schoolsbase",
                body: `A comprehensive database helping families discover and compare ${total.toLocaleString()} private schools across Nigeria, on fees, curriculum and facilities.`,
                done: true,
              },
              {
                when: "Next",
                title: "An education marketplace",
                body: "Our ambition is a marketplace that connects families, schools and providers, with everything they need in one place.",
                done: false,
              },
            ].map((step, i, all) => (
              <li key={step.when} className="relative pt-9">
                <span
                  aria-hidden
                  className={`absolute left-0 top-0 size-4 rounded-full ring-4 ring-brand-50 ${
                    step.done ? "bg-brand-600" : "border-2 border-brand-600 bg-white"
                  }`}
                />
                {i < all.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute left-6 right-[-2.5rem] top-[7px] hidden h-0 lg:block"
                    style={{
                      borderTop: `2px ${all[i + 1].done ? "solid" : "dotted"} var(--color-brand-${all[i + 1].done ? "600" : "400"})`,
                    }}
                  />
                ) : null}
                <p className="font-display text-[1.15rem] text-ink-950">{step.when}</p>
                <h3 className="mt-1 text-[1.02rem] font-semibold text-brand-800">{step.title}</h3>
                <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The team. A profile opens in a panel from the right. */}
      <section id="team" className="scroll-mt-20 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <h2 className="font-display text-[2rem] leading-[1.1] text-ink-950 sm:text-[2.75rem]">
          The people behind the work
        </h2>
        <p className="mt-3 text-[17px] text-ink-600">A shared belief in what education can become.</p>
        <TeamGrid people={TEAM} />
      </section>

      {/* Closing call */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="relative isolate overflow-hidden rounded-[1.75rem] banner-brand banner-grid">
          <div className="relative flex flex-wrap items-center justify-between gap-6 p-8 sm:px-12 sm:py-10">
            <div>
              <h2 className="font-display text-[1.6rem] leading-tight text-white sm:text-[2.1rem]">
                Help us shape better education.
              </h2>
              <p className="mt-2 max-w-xl leading-relaxed text-white/75">
                For families, schools and organisations moving education forward.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href="mailto:info@eduplana.org"
                className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
              >
                <Mail size={16} strokeWidth={2.4} aria-hidden />
                Get in touch
                <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
              </a>
              <Link href="/manage" className="text-sm font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline">
                Update your school&rsquo;s listing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
