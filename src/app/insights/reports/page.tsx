import type { Metadata } from "next";
import { PageBanner } from "@/components/page-banner";
import { DocumentList } from "@/components/document-list";
import { allDocuments, formatBytes } from "@/lib/insights";

export const metadata: Metadata = {
  title: "Reports & data",
  description:
    "Budget analyses, state datasets and research reports on Nigerian education — free to download and free to cite.",
};

export default function ReportsPage() {
  const documents = allDocuments().map((d) => ({ ...d, size: formatBytes(d.bytes) }));

  return (
    <>
      <PageBanner
        title="Reports & data"
        standfirst={`${documents.length} budget analyses, state datasets and research reports, going back to the earliest federal education budgets we could obtain. Every file downloads as a PDF.`}
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <DocumentList items={documents} />
      </section>
    </>
  );
}
