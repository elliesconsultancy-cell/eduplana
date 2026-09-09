import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, FileText } from "lucide-react";
import { AssetImage } from "@/components/asset-image";
import { asset, assetOrUndefined } from "@/lib/assets";
import { document as getDocument, allDocuments, formatBytes, relatedDocuments } from "@/lib/insights";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

/**
 * A page for one report.
 *
 * Every report used to link straight at the PDF on the asset domain, which
 * meant a link shared in a WhatsApp group opened a download on a URL that says
 * nothing about Eduplana, and there was no address for "this report" at all —
 * only "all reports" or "the file".
 *
 * So each document gets a page: what it is, how long it runs, its own opening
 * words where it has any, and the file. The cover is the first page rendered,
 * which for an archive of budget tables and scanned agreements says more than
 * any description would.
 */
const TOPIC_TONES: Record<string, string> = {
  Budget: "bg-brand-50 text-brand-800",
  Universities: "bg-career-50 text-career-700",
  States: "bg-amber-50 text-amber-800",
  Accountability: "bg-rose-50 text-rose-800",
  Access: "bg-teal-50 text-teal-800",
};

/**
 * What we can say about a document without inventing anything.
 *
 * Only the archive's own facts: the topic it is filed under, when it is from,
 * and how long it runs.
 */
function describe(doc: NonNullable<ReturnType<typeof getDocument>>): string {
  const bits = [`${doc.topic} · Nigerian education`];
  if (doc.year) bits.push(`${doc.year}`);
  if (doc.pages) bits.push(`${doc.pages} page${doc.pages === 1 ? "" : "s"}`);
  bits.push(formatBytes(doc.bytes));
  return bits.join(" · ");
}

export function generateStaticParams() {
  return allDocuments().map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocument(slug);
  if (!doc) return { title: "Report not found" };

  const description = doc.description ?? `${doc.title} — ${describe(doc)}. Free to read and free to cite.`;
  const image = assetOrUndefined(doc.cover) ?? "/brand/og-card.png";

  return {
    title: doc.title,
    description,
    alternates: { canonical: `/insights/reports/${doc.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "en_NG",
      url: absoluteUrl(`/insights/reports/${doc.slug}`),
      title: doc.title,
      description,
      images: [image],
    },
    twitter: { card: "summary_large_image", title: doc.title, description, images: [image] },
  };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDocument(slug);
  if (!doc) notFound();

  const related = relatedDocuments(doc);
  const href = asset(doc.file);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    name: doc.title,
    url: absoluteUrl(`/insights/reports/${doc.slug}`),
    ...(doc.year ? { datePublished: String(doc.year) } : {}),
    ...(doc.description ? { abstract: doc.description } : {}),
    ...(doc.pages ? { numberOfPages: doc.pages } : {}),
    inLanguage: "en-NG",
    encodingFormat: "application/pdf",
    isAccessibleForFree: true,
    publisher: { "@id": `${absoluteUrl("/")}#organization`.replace("//#", "/#") },
  };

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Link
        href="/insights/reports"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-colors hover:text-brand-900"
      >
        <ArrowLeft size={15} strokeWidth={2.4} aria-hidden />
        All reports
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)] lg:items-start">
        {/* The cover is the description. For an archive of budget tables and
            scanned agreements it tells a reader more than a paragraph would. */}
        <div className="mx-auto w-full max-w-[300px] lg:mx-0">
          {doc.cover ? (
            <AssetImage
              path={doc.cover}
              alt=""
              width={720}
              height={1018}
              className="w-full rounded-xl border border-ink-200 bg-white shadow-card"
            />
          ) : (
            <div className="grid aspect-[1/1.414] w-full place-items-center rounded-xl border border-ink-200 bg-ink-50 text-ink-300">
              <FileText size={40} strokeWidth={1.6} aria-hidden />
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                TOPIC_TONES[doc.topic] ?? "bg-ink-100 text-ink-700"
              }`}
            >
              {doc.topic}
            </span>
            {doc.year ? <span className="text-sm text-ink-500">{doc.year}</span> : null}
          </div>

          <h1 className="font-display mt-3 text-[1.75rem] leading-tight text-ink-950 sm:text-[2.15rem]">
            {doc.title}
          </h1>

          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
            <div className="flex gap-1.5">
              <dt className="text-ink-400">Format</dt>
              <dd className="font-medium text-ink-800">PDF</dd>
            </div>
            {doc.pages ? (
              <div className="flex gap-1.5">
                <dt className="text-ink-400">Length</dt>
                <dd className="font-medium text-ink-800">
                  {doc.pages.toLocaleString()} page{doc.pages === 1 ? "" : "s"}
                </dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt className="text-ink-400">Size</dt>
              <dd className="font-medium text-ink-800">{formatBytes(doc.bytes)}</dd>
            </div>
          </dl>

          {doc.description ? (
            <p className="mt-6 max-w-prose text-[15px] leading-relaxed text-ink-700">
              {doc.description}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={href}
              download
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-5 text-[15px] font-bold text-white shadow-[0_8px_20px_-8px_rgb(34_96_183_/_0.7)] transition-colors hover:bg-brand-700"
            >
              <Download size={17} strokeWidth={2.5} aria-hidden />
              Download PDF
            </a>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 text-[15px] font-semibold text-ink-800 transition-colors hover:bg-ink-50"
            >
              Open in a new tab
              <ArrowUpRight size={16} strokeWidth={2.4} aria-hidden />
            </a>
          </div>

          <p className="mt-4 text-xs text-ink-400">Free to read and free to cite.</p>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14 border-t border-ink-100 pt-8">
          <h2 className="font-display text-lg text-ink-950">More from the archive</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/insights/reports/${r.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-ink-100 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
                >
                  <span className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-ink-900 group-hover:text-brand-700">
                    {r.title}
                  </span>
                  <span className="mt-3 text-[11px] font-medium text-ink-400">
                    {r.topic}
                    {r.year ? ` · ${r.year}` : ""}
                    {r.pages ? ` · ${r.pages} pages` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
