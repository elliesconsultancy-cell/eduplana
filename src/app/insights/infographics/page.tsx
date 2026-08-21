import type { Metadata } from "next";
import { PageBanner } from "@/components/page-banner";
import { InfographicGrid } from "@/components/infographic-grid";
import { allInfographics } from "@/lib/insights";

export const metadata: Metadata = {
  title: "Infographics",
  description:
    "Education budget, funding and access data from across Nigeria, visualised — free to read and free to cite.",
};

export default function InfographicsPage() {
  const infographics = allInfographics();

  return (
    <>
      <PageBanner
        title="Education data, visualised"
        standfirst={`${infographics.length} infographics on how Nigerian education is funded — federal and state allocations, university and polytechnic budgets, strikes and access. Free to read, free to cite.`}
      />
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <InfographicGrid items={infographics} />
      </section>
    </>
  );
}
