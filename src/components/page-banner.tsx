/**
 * The banner for pages that have no photograph of their own.
 *
 * Deliberately plain in structure: a heading, a standfirst and optional
 * actions. No eyebrow label and no statistics — both were adding a row of
 * furniture above the only line anyone reads.
 */
export function PageBanner({
  title,
  standfirst,
  tone = "brand",
  children,
}: {
  title: React.ReactNode;
  standfirst: React.ReactNode;
  tone?: "brand" | "career";
  /** Buttons or links, rendered under the standfirst. */
  children?: React.ReactNode;
}) {
  return (
    <section
      className={`relative isolate overflow-hidden banner-grid ${
        tone === "career" ? "banner-career" : "banner-brand"
      }`}
    >
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-4xl">
          <h1 className="font-display tracking-display text-[2rem] leading-[1.08] text-white sm:text-[3.15rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-white/75">{standfirst}</p>
          {children ? <div className="mt-9 flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
