import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Briefcase,
  GraduationCap,
  Mail,
  Package,
  School,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NigeriaMap } from "@/components/nigeria-map";
import { TeamGrid } from "@/components/team-grid";
import { topStates, totalCount } from "@/lib/schools";
import { TEAM } from "@/lib/team";
import { SITE_URL, absoluteUrl } from "@/lib/site";
import "./about.css";

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

/** Who the platform is meant to bring together, from the founders' own description. */
const AUDIENCES: Array<{ icon: LucideIcon; label: string }> = [
  { icon: Users, label: "Parents" },
  { icon: GraduationCap, label: "Students" },
  { icon: School, label: "Private schools" },
  { icon: BookOpen, label: "Teachers" },
  { icon: Briefcase, label: "Education consultants" },
  { icon: Package, label: "Educational product providers" },
];

/** Where each group sits on the ring, as a share of the diagram: 35% out from the centre. */
const ORBIT_RADIUS = 35;
const orbitAt = (i: number) => {
  const angle = (i / AUDIENCES.length) * Math.PI * 2;
  return { left: 50 + ORBIT_RADIUS * Math.sin(angle), top: 50 - ORBIT_RADIUS * Math.cos(angle), deg: (i / AUDIENCES.length) * 360 };
};

const CAMPAIGNS = ["EducationFund", "SaveLautech", "StudentInjustice", "OutofSchoolChildren"];

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
            <h1 className="ab-rise font-display tracking-display text-[2.3rem] leading-[1.06] text-white sm:text-[3.4rem]">
              Making education easier to see, choose and improve
            </h1>
            <p style={{ "--d": "120ms" } as React.CSSProperties} className="ab-rise mt-6 max-w-lg text-[18px] leading-relaxed text-white/80">
              From education advocacy to everyday decisions. We help families and schools turn
              information into opportunity.
            </p>
            <div style={{ "--d": "240ms" } as React.CSSProperties} className="ab-rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
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

      {/* What we are building: the groups the platform brings together, and where it starts. */}
      <section id="story" className="scroll-mt-20 relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-brand-100)_1.2px,transparent_1.2px)] [background-size:26px_26px] [mask-image:linear-gradient(180deg,#000_0%,transparent_70%)]"
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
            <div>
              <h2 className="font-display text-[2rem] leading-[1.1] text-ink-950 sm:text-[2.75rem]">
                Bringing everyone who shapes a child&rsquo;s education together
              </h2>
              <div className="mt-6 space-y-4 text-[16.5px] leading-[1.75] text-ink-600">
                <p>
                  Eduplana is an education technology and commerce platform. Our ambition is to
                  become a digital marketplace that connects parents, students, private schools,
                  teachers, education consultants and educational product providers, so they can
                  discover, access and buy the products and services they need.
                </p>
                <p>
                  We are not building another education website. We are building a digital commerce
                  ecosystem for the education sector, where people can find solutions to their
                  educational needs and complete transactions on one platform.
                </p>
              </div>
            </div>

            {/* Six groups around Eduplana. The ring turns; the chips turn back so the words stay upright. */}
            <div className="eco relative mx-auto aspect-square w-full max-w-[34rem]">
              <div
                aria-hidden
                className="absolute inset-[4%] rounded-full bg-[radial-gradient(circle,var(--color-brand-100),transparent_68%)]"
              />
              <div aria-hidden className="absolute inset-[15%] rounded-full border border-dashed border-brand-300/80" />
              <div aria-hidden className="absolute inset-[3%] rounded-full border border-brand-100" />
              <ul className="eco-orbit absolute inset-0">
                {AUDIENCES.map(({ icon: Icon, label }, i) => {
                  const at = orbitAt(i);
                  return (
                    <li key={label}>
                      <span
                        aria-hidden
                        className="eco-spoke"
                        style={{ transform: `rotate(${at.deg - 90}deg)` }}
                      />
                      <span
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${at.left}%`, top: `${at.top}%` }}
                      >
                        <span className="eco-chip flex w-[7.4rem] items-center gap-2 rounded-2xl bg-white py-1.5 pl-1.5 pr-2.5 text-[12px] font-semibold leading-tight text-ink-800 shadow-[0_8px_24px_-10px_rgb(14_42_83/0.35)] ring-1 ring-ink-100 sm:w-[9.4rem] sm:text-[13px]">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 sm:size-9">
                            <Icon size={17} strokeWidth={2.1} aria-hidden />
                          </span>
                          {label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="eco-hub absolute inset-[35%] grid place-items-center rounded-full bg-white shadow-[0_18px_50px_-14px_rgb(34_96_183/0.55)] ring-1 ring-brand-100">
                <Image src="/brand/eduplana-mark.png" alt="Eduplana" width={387} height={365} className="h-auto w-[58%]" />
              </div>
            </div>
          </div>

          {/* Where it starts. */}
          <div className="mt-16 sm:mt-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h3 className="font-display text-[1.5rem] leading-tight text-ink-950 sm:text-[1.9rem]">Starting with Schoolsbase</h3>
              <Link
                href="/schools"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900"
              >
                Explore the directory
                <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
              </Link>
            </div>
            <ul className="mt-6 grid gap-4 sm:grid-cols-3">
              {WHY.map(({ icon: Icon, title, body }) => (
                <li
                  key={title}
                  className="group rounded-3xl border border-ink-100 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift sm:p-7"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                    <Icon size={22} strokeWidth={2} aria-hidden />
                  </span>
                  <h4 className="font-display mt-5 text-[1.15rem] leading-snug text-ink-950">{title}</h4>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The campaigns, in the open. */}
      <section aria-label="Our major advocacy campaigns" className="ab-band relative overflow-hidden bg-brand-950 py-10 sm:py-14">
        <div aria-hidden className="absolute -left-24 top-1/2 size-[420px] -translate-y-1/2 rounded-full bg-brand-600/25 blur-3xl" />
        <p className="relative text-center text-sm font-semibold text-brand-200">Our major advocacy campaigns</p>
        <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_7%,#000_93%,transparent)]">
          <div className="ab-marquee">
            {[false, true].map((loop) => (
              <ul
                key={String(loop)}
                {...(loop ? { "aria-hidden": true, "data-loop": "" } : {})}
                className="flex shrink-0 items-center"
              >
                {CAMPAIGNS.map((c) => (
                  <li key={c} className="flex items-center whitespace-nowrap">
                    <span className="font-display px-5 text-[2.2rem] leading-none text-white sm:px-8 sm:text-[3.8rem]">
                      <span className="text-brand-400">#</span>
                      {c}
                    </span>
                    <span aria-hidden className="size-2 rounded-full bg-brand-500" />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
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
                body: "We started by championing greater transparency and accountability in Nigerian education, and by turning education data into public pressure for change.",
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
                  } ${step.when === "Today" ? "ab-here" : ""}`}
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
