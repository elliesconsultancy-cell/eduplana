import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MessageCircleQuestion } from "lucide-react";
import { PageBanner } from "@/components/page-banner";
import { SchoolCard } from "@/components/school-card";
import { SIGNALS, STRONG_THRESHOLD, careerProfile } from "@/lib/career";
import { allSchools, search } from "@/lib/schools";
import { CAREER_ICONS } from "@/lib/career-icons";

export const metadata: Metadata = {
  title: "Career education",
  description:
    "Which Nigerian schools are doing real work on career education — read from the facilities, activities and clubs each school publishes.",
};

/** What a parent should actually ask once the shortlist is down to three. */
const QUESTIONS = [
  {
    question: "Who owns careers here?",
    why: "A named member of staff means it is somebody's job. “All our teachers do it” usually means nobody does.",
  },
  {
    question: "What happened to last year's leavers?",
    why: "A school that tracks destinations can tell you. One that cannot has never measured whether any of this works.",
  },
  {
    question: "When does careers work start?",
    why: "Subject choices at JSS3 decide what is possible at SS3. Guidance that begins in the final year begins too late.",
  },
  {
    question: "Which employers do pupils actually meet?",
    why: "One careers day with a parent who happens to be a doctor is not industry exposure. Ask for names and frequency.",
  },
  {
    question: "What happens to the pupil who is not university-bound?",
    why: "Most Nigerian school leavers do not go straight to university. Ask what the school offers them.",
  },
  {
    question: "Can we see the timetable?",
    why: "Careers guidance either has time on the timetable or it does not. The document settles the question in seconds.",
  },
];

export default function CareerEducationPage() {
  const all = allSchools();
  const strong = all.filter((s) => careerProfile(s).tier === "strong");
  const featured = search({ careerReady: true, hasPhotos: true, sort: "career" }).slice(0, 6);

  const perSignal = SIGNALS.map((signal) => ({
    signal,
    count: all.filter((s) => careerProfile(s).matched.some((m) => m.signal.key === signal.key))
      .length,
  }));

  return (
    <>
      <PageBanner
        tone="career"
        title={
          <>
            Choose for the job after the exam,
            <br className="hidden sm:block" /> not just the exam.
          </>
        }
        standfirst="Nigerian families pick schools on fees, distance and reputation — because that is all anyone publishes. We added the question nobody was asking, and answered it using the schools' own words."
      >
        <Link
          href="/schools?careerReady=1&sort=career"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-career-900 transition-colors hover:bg-career-100"
        >
          Browse {strong.length.toLocaleString()} schools
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </Link>
        <a
          href="#signals"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          What we look for
        </a>
      </PageBanner>

      {/* Why this matters — the argument, before the mechanics. */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <div>
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              A school report tells you how a child did. It does not tell you where they can go.
            </h2>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-700">
            <p>
              Nigeria puts more young people into the labour market every year than almost anywhere
              on earth. Yet the questions families are given to judge a school by — fees, results,
              how close it is — say nothing about whether it prepares anyone for work.
            </p>
            <p>
              The gap is not that schools do nothing. Plenty run robotics clubs, farm plots, ICT
              rooms and entrepreneurship days. The gap is that none of it is published anywhere a
              parent can compare, so a school that invests in it gets no credit and a family
              choosing between two schools cannot tell them apart.
            </p>
            <p className="font-semibold text-ink-900">
              So we read all {all.length.toLocaleString()} schools in the directory for it, and put
              the answer on every profile.
            </p>
          </div>
        </div>
      </section>

      <section id="signals" className="border-y border-ink-100 bg-ink-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              Eight signals, read from what each school publishes
            </h2>
            <p className="mt-4 leading-relaxed text-ink-600">
              Every school in the directory published a list of its facilities, activities and
              clubs. We read those lists for eight career indicators. A school publishing{" "}
              <strong className="text-ink-900">{STRONG_THRESHOLD} or more</strong> carries the badge
              — and its profile lists the exact items that earned it, so you can judge them
              yourself rather than take our word for it.
            </p>
          </div>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perSignal.map(({ signal, count }) => {
              const Icon = CAREER_ICONS[signal.key];
              return (
                <li
                  key={signal.key}
                  className="rounded-2xl border border-ink-100 bg-white p-5 shadow-card"
                >
                  <span
                    aria-hidden
                    className="grid size-10 place-items-center rounded-xl bg-career-100 text-career-700"
                  >
                    <Icon size={19} strokeWidth={2.2} />
                  </span>
                  <p className="font-display mt-3.5 text-[15px] text-ink-950">{signal.label}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{signal.blurb}</p>
                  <p className="mt-3.5 border-t border-ink-100 pt-2.5 text-xs font-semibold text-career-700">
                    {count.toLocaleString()} schools publish this
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* The practical payload: what to do with the badge once you have it. */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-career-600">
            <MessageCircleQuestion size={14} strokeWidth={2.6} aria-hidden />
            On the school visit
          </p>
          <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
            Six questions worth asking
          </h2>
          <p className="mt-4 leading-relaxed text-ink-600">
            The badge narrows a list of seven thousand down to a handful. These are the questions
            that tell you which of the handful is real — and they work just as well on a school with
            no badge at all.
          </p>
        </div>

        <ol className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {QUESTIONS.map((item, index) => (
            <li key={item.question} className="flex gap-4">
              <span
                aria-hidden
                className="font-display grid size-8 shrink-0 place-items-center rounded-lg bg-career-100 text-sm text-career-700"
              >
                {index + 1}
              </span>
              <span>
                <span className="font-display block text-[15px] text-ink-950">
                  {item.question}
                </span>
                <span className="mt-1.5 block text-[13px] leading-relaxed text-ink-600">
                  {item.why}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {featured.length > 0 ? (
        <section className="border-y border-ink-100 bg-ink-50/70">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl">
                <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
                  Schools with the strongest signals
                </h2>
                <p className="mt-3 text-ink-600">
                  Ranked by how many of the eight indicators each school publishes.
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
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="overflow-hidden rounded-2xl banner-career banner-grid relative isolate">
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <h2 className="font-display text-[1.5rem] leading-tight text-white sm:text-[2rem]">
                Building career education, not just rating it
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">
                Rating schools is the first step. We also work with schools directly on careers
                programmes, employer links and pathway tracking — the things that would earn the
                badge rather than just measure it.
              </p>
            </div>
            <ul className="space-y-3">
              {[
                "Careers programmes built into the timetable",
                "Employer and alumni networks for placements",
                "Destination tracking, so schools know what worked",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/90">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-white/15"
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
