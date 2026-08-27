import type { Metadata } from "next";
import { AssetImage } from "@/components/asset-image";
import Link from "next/link";
import { ArrowRight, ExternalLink, FileText, Images } from "lucide-react";
import { PageBanner } from "@/components/page-banner";
import { allDocuments, allInfographics, archiveStats, formatBytes, topics } from "@/lib/insights";
import { asset } from "@/lib/assets";

export const metadata: Metadata = {
  alternates: { canonical: "/insights" },
  title: "Insights & data",
  description:
    "Education budget analyses, state datasets and infographics from Eduplana's research on Nigerian education.",
};

export default function InsightsPage() {
  const stats = archiveStats();
  const previewImages = allInfographics().slice(0, 4);
  const previewDocs = allDocuments().slice(0, 5).map((d) => ({ ...d, size: formatBytes(d.bytes) }));
  const topicList = topics();

  return (
    <>
      <PageBanner
        title="The research behind the ratings"
        standfirst="Before Eduplana was a directory it was a research project — counting what nobody else was counting in Nigerian education. Budget analyses, state datasets and infographics, all free to read and free to cite."
      >
        <Link
          href="/insights/infographics"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-brand-900 transition-colors hover:bg-brand-100"
        >
          Browse infographics
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
        </Link>
        <Link
          href="/insights/reports"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
        >
          Reports &amp; data
        </Link>
      </PageBanner>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
          <Stat label="Publications" value={stats.total.toString()} />
          <Stat label="Infographics" value={stats.infographics.toString()} />
          <Stat label="Reports & datasets" value={stats.documents.toString()} />
          <Stat label="Data covering" value={`${stats.coversFrom}–${stats.coversTo}`} />
        </dl>

        <ul className="mt-8 flex flex-wrap gap-2">
          {topicList.map((t) => (
            <li
              key={t.topic}
              className="rounded-full bg-ink-50 px-3.5 py-1.5 text-sm font-medium text-ink-700"
            >
              {t.topic}
              <span className="ml-1.5 text-ink-400 tabular-nums">{t.count}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Infographics preview */}
      <section className="border-y border-ink-100 bg-ink-50/70">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
                <Images size={14} strokeWidth={2.6} aria-hidden />
                Infographics
              </p>
              <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
                Education data, visualised
              </h2>
              <p className="mt-3 text-ink-600">
                {stats.infographics} charts on how Nigerian education is funded — federal and state
                allocations, universities and polytechnics, strikes and access.
              </p>
            </div>
            <Link
              href="/insights/infographics"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 hover:bg-ink-50"
            >
              See all {stats.infographics}
              <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
            </Link>
          </div>

          <ul className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {previewImages.map((item) => (
              <li key={item.slug}>
                <Link
                  href="/insights/infographics"
                  className="group block overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
                >
                  <span className="relative block aspect-[3/4] overflow-hidden bg-ink-50">
                    <AssetImage
                      path={item.thumb}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 45vw, 260px"
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </span>
                  <span className="block p-3.5">
                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink-900">
                      {item.title}
                    </span>
                    <span className="mt-1.5 block text-[11px] font-medium uppercase tracking-wide text-ink-400">
                      {item.topic}
                      {item.year ? ` · ${item.year}` : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Reports preview */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-600">
              <FileText size={14} strokeWidth={2.6} aria-hidden />
              Reports &amp; data
            </p>
            <h2 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.25rem]">
              The long-form work
            </h2>
            <p className="mt-3 text-ink-600">
              Budget analyses, state datasets and research reports, going back to the earliest
              federal education budgets we could obtain.
            </p>
          </div>
          <Link
            href="/insights/reports"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:border-ink-300 hover:bg-ink-50"
          >
            See all {stats.documents}
            <ArrowRight size={15} strokeWidth={2.4} aria-hidden />
          </Link>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previewDocs.map((doc) => (
            <li key={doc.slug}>
              <a
                href={asset(doc.file)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full items-start gap-3 rounded-2xl border border-ink-100 bg-white p-5 transition-all hover:-translate-y-1 hover:shadow-card"
              >
                <span
                  aria-hidden
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"
                >
                  <FileText size={18} strokeWidth={2.2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-snug text-ink-900">
                    {doc.title}
                  </span>
                  <span className="mt-1 block text-xs text-ink-500">
                    PDF · {doc.size}
                    {doc.year ? ` · ${doc.year}` : ""}
                  </span>
                </span>
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://medium.com/@eduplana_"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-full items-start gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-5 transition-colors hover:border-ink-300 hover:bg-ink-50"
            >
              <span
                aria-hidden
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-ink-700"
              >
                <ExternalLink size={18} strokeWidth={2.2} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug text-ink-900">
                  Long reads on Medium
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                  Investigations that did not fit in a chart
                </span>
              </span>
            </a>
          </li>
        </ul>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-ink-500">{label}</dt>
      <dd className="font-display mt-1 text-3xl text-brand-800">{value}</dd>
    </div>
  );
}
