import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  Coins,
  GraduationCap,
  MessagesSquare,
  Settings2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { PageBanner } from "@/components/page-banner";
import { totalCount } from "@/lib/schools";

export const metadata: Metadata = {
  alternates: { canonical: "/for-schools" },
  title: "For schools",
  description:
    "Eduplana's education management platform — finance, operations, student development, parent engagement, teacher efficiency and administration in one system.",
};

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
  features: string[];
}

/**
 * The six areas Eduplana covers. Deliberately framed as the head teacher's
 * problems rather than as modules — a school leader should recognise their own
 * week in the labels.
 */
const PILLARS: Pillar[] = [
  {
    icon: Coins,
    title: "Financial management",
    body: "Fees, invoicing and collection in one ledger, so the question “who has actually paid?” takes a second rather than an afternoon. Budget against actuals term by term, and work an arrears list that updates itself.",
    features: ["Fee schedules", "Invoicing & receipts", "Arrears tracking", "Budget vs actual", "Payroll", "Audit trail"],
  },
  {
    icon: Settings2,
    title: "Operational oversight",
    body: "The invisible work that decides whether a term runs smoothly or lurches: building a timetable that survives contact with staff absence, keeping transport and facilities accounted for, and filing returns on time.",
    features: ["Timetabling", "Cover & absence", "Facilities", "Transport", "Inventory", "Compliance returns"],
  },
  {
    icon: GraduationCap,
    title: "Student development",
    body: "Attainment, attendance, behaviour, wellbeing and career pathways on a single record, so a child's progress is a picture you can act on rather than a pile of result slips nobody reads together.",
    features: ["Attainment", "Attendance", "Wellbeing", "Career pathways", "Reports", "Destinations"],
  },
  {
    icon: MessagesSquare,
    title: "Parent engagement",
    body: "Reports, fee notices, attendance alerts and announcements delivered properly, with a record of who was told what. Fewer group chats, and far fewer conversations that begin “nobody informed me”.",
    features: ["Parent portal", "Termly reports", "Fee notices", "Announcements", "Consent forms", "Meeting booking"],
  },
  {
    icon: Users,
    title: "Teacher efficiency",
    body: "Give teachers their time back. Lesson planning, marking, cover arrangements and CPD tracking in one place, so the administrative load per teacher falls and the part only a teacher can do gets the hours.",
    features: ["Lesson planning", "Marking & grading", "Cover", "CPD tracking", "Workload view", "Resource library"],
  },
  {
    icon: ClipboardList,
    title: "Administration",
    body: "Admissions from enquiry to enrolment, student records that survive a change of registrar, and statutory data returns generated rather than assembled. Your public Eduplana profile updates from the same source.",
    features: ["Admissions", "Enrolment", "Student records", "Staff records", "Data returns", "Profile sync"],
  },
];

const STEPS = [
  {
    title: "Claim your profile",
    body: "Find your school in the directory and take ownership of the listing. Correct anything wrong, add what is missing, and the changes go live on the page families already see.",
  },
  {
    title: "Start with the area that hurts",
    body: "Most schools begin with fees or admissions. One area, one term, running properly — rather than six systems replaced at once in the week before resumption.",
  },
  {
    title: "Add the rest at your pace",
    body: "Each area shares the same records, so the second is quicker to adopt than the first. Nothing is re-keyed and nothing has to be migrated twice.",
  },
];

export default function ForSchoolsPage() {
  const total = totalCount();

  return (
    <>
      <PageBanner
        title={
          <>
            A directory shows you the school.
            <br className="hidden sm:block" /> We help you run it.
          </>
        }
        standfirst="Behind every good profile is a school with its house in order. Eduplana is the education management system underneath — six areas, one set of records, one set of numbers everybody trusts."
      >
        <Link
          href="/schools"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
        >
          Find your school&rsquo;s profile
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </Link>
        <span className="inline-flex items-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-medium text-white/80">
          {total.toLocaleString()} schools already listed
        </span>
      </PageBanner>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
            Most school software solves one problem and creates two.
          </h2>
          <div className="space-y-4 text-[15px] leading-relaxed text-ink-700">
            <p>
              A fees package that does not know the enrolment list. A results system that cannot
              tell you who is absent. A parent app with its own copy of every phone number, already
              out of date. Each one works, and none of them agree with the other.
            </p>
            <p>
              Eduplana is built the other way round: one set of records about pupils, staff and
              money, with six areas of work sitting on top of it. Change a child&rsquo;s class once
              and the register, the report, the invoice and the parent&rsquo;s app all know.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              Six areas, one system
            </h2>
            <p className="mt-4 leading-relaxed text-ink-600">
              Each area works on its own and gets better alongside the others.
            </p>
          </div>

          <ol className="mt-10 grid gap-5 lg:grid-cols-2">
            {PILLARS.map((pillar, index) => {
              const Icon = pillar.icon;
              return (
                <li
                  key={pillar.title}
                  className="relative rounded-2xl border border-ink-100 bg-white p-7 shadow-card"
                >
                  <span className="font-display absolute right-6 top-6 text-sm tabular-nums text-ink-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    aria-hidden
                    className="grid size-11 place-items-center rounded-xl bg-brand-600 text-white"
                  >
                    <Icon size={20} strokeWidth={2.2} />
                  </span>
                  <h3 className="font-display mt-4 text-lg text-ink-950">{pillar.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{pillar.body}</p>
                  <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-ink-100 pt-4">
                    {pillar.features.map((feature) => (
                      <li
                        key={feature}
                        className="rounded-md bg-ink-50 px-2.5 py-1 text-xs font-semibold text-ink-600"
                      >
                        {feature}
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="font-display text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
            How schools come on board
          </h2>
        </div>
        <ol className="mt-10 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span
                aria-hidden
                className="font-display grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"
              >
                {index + 1}
              </span>
              <h3 className="font-display mt-4 text-[15px] text-ink-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="relative isolate overflow-hidden rounded-2xl banner-brand banner-grid">
          <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_auto] lg:items-center">
            <div>
              <h2 className="font-display text-[1.5rem] leading-tight text-white sm:text-[2rem]">
                Your profile is already live
              </h2>
              <p className="mt-4 max-w-xl leading-relaxed text-white/75">
                Every school in the directory has a page that families can find today. Claiming it
                is free, takes minutes, and is the first step to everything above.
              </p>
            </div>
            <Link
              href="/schools"
              className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100 lg:self-auto"
            >
              Find your school
              <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
