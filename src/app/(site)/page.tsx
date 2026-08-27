import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ClipboardList,
  Coins,
  GraduationCap,
  MessagesSquare,
  Route,
  Search,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { SchoolCard } from "@/components/school-card";
import { SIGNALS, careerProfile } from "@/lib/career";
import { allSchools, search, topStates, totalCount } from "@/lib/schools";
import { archiveStats } from "@/lib/insights";

/**
 * The five cities parents ask about most. Each tile links to its whole state
 * rather than the city alone: area names are recorded a dozen ways
 * ("Port-harcourt", "Port Harcourt", "Portharcourt"), so a state link is the
 * one that reliably returns everything nearby.
 */
const CITIES = [
  { name: "Lagos", state: "Lagos", image: "/images/cities/lagos.webp" },
  { name: "Abuja", state: "FCT (Abuja)", image: "/images/cities/abuja.webp" },
  { name: "Port Harcourt", state: "Rivers", image: "/images/cities/port-harcourt.webp" },
  { name: "Kano", state: "Kano", image: "/images/cities/kano.webp" },
  { name: "Enugu", state: "Enugu", image: "/images/cities/enugu.webp" },
];

const PILLARS: Array<{ icon: LucideIcon; title: string; body: string }> = [
  {
    icon: Coins,
    title: "Financial management",
    body: "Keep the school's finances healthy and transparent. Fees, budgets and collections in one ledger, with an arrears list you can act on.",
  },
  {
    icon: Settings2,
    title: "Operational oversight",
    body: "Run the term like clockwork. Timetables, facilities, transport and compliance returns — the invisible work that decides whether a term runs smoothly.",
  },
  {
    icon: GraduationCap,
    title: "Student development",
    body: "Support every pupil's journey. Attainment, attendance, wellbeing and career pathways on one record, so progress is a picture rather than a pile of result slips.",
  },
  {
    icon: MessagesSquare,
    title: "Parent engagement",
    body: "Build stronger relationships with families. Reports, fees and announcements handled properly, instead of scattered across informal group chats.",
  },
  {
    icon: Users,
    title: "Teacher efficiency",
    body: "Give teachers their time back. Lesson planning, marking, cover and CPD tracking — less admin per teacher, more of the job only a teacher can do.",
  },
  {
    icon: ClipboardList,
    title: "Streamlined administration",
    body: "Cut the paperwork. Admissions, enrolment, records and statutory returns — and your public profile updates from the same source of truth.",
  },
];

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  const states = topStates(40);
  const total = totalCount();
  const counts = new Map(states.map((s) => [s.value, s.count]));
  const careerCount = allSchools().filter((s) => careerProfile(s).tier === "strong").length;
  const featured = search({ careerReady: true, hasPhotos: true, sort: "career" }).slice(0, 6);
  const archive = archiveStats();

  return (
    <>
      <Hero total={total} states={states} careerCount={careerCount} />
      <PopularLocations counts={counts} />
      <FeaturedSchools featured={featured} careerCount={careerCount} />
      <ManagementPillars />
      <Heritage archive={archive} />
      <Doors />
    </>
  );
}

function Hero({
  total,
  states,
  careerCount,
}: {
  total: number;
  states: Array<{ value: string; count: number }>;
  careerCount: number;
}) {
  return (
    <section className="relative isolate">
      {/*
       * The photograph is a background layer that stops short of the section's
       * bottom edge, so the search panel below overlaps it by exactly that gap
       * at every width — no negative margins to keep in sync with the copy.
       */}
      <div aria-hidden className="absolute inset-x-0 bottom-16 top-0 -z-10 overflow-hidden">
        <Image
          src="/images/hero-students.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_35%]"
        />
        <div className="hero-scrim absolute inset-0" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <h1 className="font-display tracking-display text-[2.15rem] font-extrabold leading-[1.06] text-white sm:text-[3.4rem]">
            Plan quality education
            <br className="hidden sm:block" /> for your child
          </h1>

          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/85 sm:text-[17px]">
            The right school is a partner in your child’s education, not just a place to send
            them. Compare every school in Nigeria on fees, curriculum, class sizes and facilities —
            and see what each one publishes about{" "}
            <span className="font-semibold text-career-200">career education</span>, so you choose
            for the job after the exam, not just the exam.
          </p>

          <dl className="mt-8 flex flex-wrap items-center gap-x-9 gap-y-3 text-white">
            {/* Rounded rather than exact: the precise count changes with every
                import and invites a reader to audit it. */}
            <HeroStat value={`${Math.floor(total / 1000).toLocaleString()},000+`} label="Schools" />
            <HeroStat value="36" label="States + FCT" />
            <HeroStat value={careerCount.toLocaleString()} label="Career signals" accent />
          </dl>
        </div>

        {/* The career card is the one thing no other Nigerian directory has. */}
        <aside className="rounded-[1.5rem] bg-white/95 p-6 shadow-float ring-1 ring-white/60 backdrop-blur">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-700"
          >
            <Route size={21} strokeWidth={2.3} />
          </span>
          <h2 className="font-display mt-4 text-lg text-ink-950">
            What we look for in career education
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
            Eight indicators, read from what each school publishes.
          </p>
          <ul className="mt-4 space-y-2.5">
            {SIGNALS.slice(0, 5).map((signal) => (
              <li key={signal.key} className="flex items-start gap-2.5 text-sm text-ink-800">
                <span
                  aria-hidden
                  className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700"
                >
                  <Check size={11} strokeWidth={3} />
                </span>
                {signal.label}
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="glass-panel rounded-[1.75rem] p-2 shadow-float ring-1 ring-white/60">
          <div className="rounded-[1.35rem] bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg text-ink-950 sm:text-xl">Where are you looking?</h2>
            <div className="mt-4">
              <SearchForm states={states} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div>
      <dd className={`font-display text-xl ${accent ? "text-career-200" : "text-white"}`}>{value}</dd>
      <dt className="text-[12px] uppercase tracking-wide text-white/60">{label}</dt>
    </div>
  );
}

function PopularLocations({ counts }: { counts: Map<string, number> }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="text-center">
        <h2 className="font-display text-2xl text-ink-950 sm:text-3xl">Popular locations</h2>
        <p className="mt-2 text-ink-600">Start where most families do.</p>
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {CITIES.map((city) => {
          const count = counts.get(city.state) ?? 0;
          return (
            <li key={city.name}>
              <Link
                href={`/schools?state=${encodeURIComponent(city.state)}`}
                className="group flex flex-col items-center text-center"
              >
                <span className="relative block aspect-square w-full max-w-[148px] overflow-hidden rounded-full ring-1 ring-ink-200 transition-all duration-300 group-hover:ring-4 group-hover:ring-brand-500/35">
                  <Image
                    src={city.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 45vw, 160px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </span>
                <span className="mt-3.5 font-display text-[15px] text-ink-950 transition-colors group-hover:text-brand-700">
                  {city.name}
                </span>
                <span className="mt-0.5 text-[13px] text-ink-500">
                  {city.state !== city.name ? `${city.state} · ` : ""}
                  {count.toLocaleString()} schools
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function FeaturedSchools({
  featured,
  careerCount,
}: {
  featured: React.ComponentProps<typeof SchoolCard>["school"][];
  careerCount: number;
}) {
  if (featured.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-career-600">
            <Sparkles size={13} strokeWidth={2.6} aria-hidden />
            Discover schools
          </p>
          <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
            Explore top schools near you
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            Finding the right fit does not have to be hard. Browse a directory of{" "}
            {careerCount.toLocaleString()} schools that publish four or more career indicators, and
            find one that matches your child&rsquo;s goals as well as your family&rsquo;s budget.
          </p>
        </div>
        <Link
          href="/schools?careerReady=1&sort=career"
          className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 hover:bg-ink-50"
        >
          Explore directory
          <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
        </Link>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((school, index) => (
          <SchoolCard key={school.id} school={school} priority={index < 3} />
        ))}
      </div>
    </section>
  );
}

function ManagementPillars() {
  return (
    <section className="border-y border-ink-100 bg-ink-50/70">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
            For schools
          </p>
          <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
            More than a directory.
            <br className="hidden sm:block" /> A complete management system.
          </h2>
          <p className="mt-4 leading-relaxed text-ink-600">
            Behind every great school profile is a well-run institution. Eduplana provides the
            underlying tools to help schools manage everything from finances to parent
            communication, seamlessly.
          </p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <li key={pillar.title} className="flex items-start gap-4">
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-card"
                >
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span>
                  <span className="font-display block text-[15px] text-ink-950">
                    {pillar.title}
                  </span>
                  <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-600">
                    {pillar.body}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="mt-12 text-center">
          <Link
            href="/for-schools"
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            See how we support schools
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * The advocacy history, reframed as evidence rather than as an origin story:
 * it sits late on the page and explains why anyone should trust the analysis
 * above it.
 */
function Heritage({ archive }: { archive: ReturnType<typeof archiveStats> }) {
  return (
    <section className="bg-brand-950">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-400">
              Our foundation
            </p>
            <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-white sm:text-[2.25rem]">
              Built on deep expertise in education data.
            </h2>
            <p className="mt-4 leading-relaxed text-brand-100">
              Eduplana is rooted in a long history of understanding education systems. We began by
              analysing budgets, tracking projects and evaluating classroom conditions across all 36
              states. That experience with real education data is the foundation — and the
              credibility — behind the platform today.
            </p>
            <Link
              href="/insights"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
            >
              <BarChart3 size={16} strokeWidth={2.5} aria-hidden />
              Learn more
            </Link>
          </div>

          <dl className="flex gap-12 sm:gap-16">
            <Metric value={archive.total.toString()} label="Publications" />
            <Metric value={archive.documents.toString()} label="Reports & datasets" />
          </dl>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="font-display text-[2.75rem] leading-none text-white sm:text-[3.25rem]">
        {value}
      </dd>
      <dt className="mt-3 text-[13px] text-brand-200">{label}</dt>
    </div>
  );
}

/**
 * Parents, school leaders and policy people want completely different things,
 * so the page ends by splitting cleanly rather than compromising on one call
 * to action — which also quietly tells each audience the other two exist.
 */
function Doors() {
  const doors = [
    {
      icon: Search,
      title: "For Parents",
      body: "Search every school in Nigeria, compare them side by side, and see which ones take career education seriously. No account needed.",
      href: "/schools",
      cta: "Find the right school",
      tone: "brand" as const,
    },
    {
      icon: Building2,
      title: "For Schools",
      body: "Claim your profile to stand out, then see what the management platform does for your finances, staff, parents and admissions.",
      href: "/for-schools",
      cta: "Manage your school",
      tone: "ink" as const,
    },
    {
      icon: BarChart3,
      title: "For Policy & Media",
      body: "Use our open education data — budget analyses, state datasets and infographics, all free to read and free to cite.",
      href: "/insights",
      cta: "Access insights",
      tone: "career" as const,
    },
  ];

  const styles = {
    brand: { icon: "bg-brand-50 text-brand-700", button: "bg-brand-600 hover:bg-brand-700" },
    ink: { icon: "bg-ink-100 text-ink-800", button: "bg-ink-900 hover:bg-ink-800" },
    career: { icon: "bg-career-100 text-career-700", button: "bg-career-600 hover:bg-career-700" },
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
          Explore Eduplana
        </h2>
        <p className="mt-4 leading-relaxed text-ink-600">
          Whether you are looking for a school, running one, or studying how education is funded,
          there is a way in.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {doors.map((door) => {
          const Icon = door.icon;
          const style = styles[door.tone];
          return (
            <div
              key={door.title}
              className="flex flex-col rounded-2xl border border-ink-100 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
            >
              <span
                aria-hidden
                className={`grid size-12 place-items-center rounded-xl ${style.icon}`}
              >
                <Icon size={21} strokeWidth={2.2} />
              </span>
              <h3 className="font-display mt-5 text-lg text-ink-950">{door.title}</h3>
              <p className="mt-2.5 flex-1 text-sm leading-relaxed text-ink-600">{door.body}</p>
              <Link
                href={door.href}
                className={`mt-7 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold text-white transition-colors ${style.button}`}
              >
                {door.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
