import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CompareTray } from "@/components/compare-tray";
import { ShortlistProvider } from "@/components/shortlist-provider";
import {
  FOUNDERS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_PROFILES,
  SITE_URL,
  absoluteUrl,
} from "@/lib/site";

/**
 * One family across the whole product. Plus Jakarta Sans has enough weight
 * range to carry display headings and body copy without a second typeface,
 * which keeps the page quiet and the font payload small.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Eduplana — Find and compare schools in Nigeria",
    template: "%s · Eduplana",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "schools in Nigeria",
    "school fees Nigeria",
    "primary schools Nigeria",
    "secondary schools Nigeria",
    "school directory Nigeria",
    "admissions Nigeria",
  ],
  authors: FOUNDERS.map((person) => ({ name: person.name })),
  icons: {
    icon: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
  /*
   * Open Graph and Twitter tags were absent entirely, so a link pasted into
   * WhatsApp or LinkedIn rendered as a bare URL. Child pages override title,
   * description and image; everything else is inherited from here.
   */
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    url: SITE_URL,
    title: "Eduplana — Find and compare schools in Nigeria",
    description: SITE_DESCRIPTION,
    images: [{ url: "/brand/og-card.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eduplana — Find and compare schools in Nigeria",
    description: SITE_DESCRIPTION,
    images: ["/brand/og-card.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

/**
 * Structured data, so search engines read the site as an organisation with a
 * directory rather than as loose pages.
 *
 * The WebSite entry declares how to search the directory, which is what lets
 * Google offer a search box directly in the result. Both blocks live in the
 * root layout because they describe the site as a whole; a school page adds its
 * own entry describing that one school.
 */
const organisationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: absoluteUrl("/brand/eduplana-logo.png"),
      image: absoluteUrl("/brand/og-card.png"),
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Nigeria" },
      founder: FOUNDERS.map((person) => ({
        "@type": "Person",
        name: person.name,
        jobTitle: person.jobTitle,
      })),
      sameAs: SITE_PROFILES,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en-NG",
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/schools?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#2260b7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={jakarta.variable}>
      <body className="flex min-h-screen flex-col bg-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <ShortlistProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-lg focus:bg-brand-900 focus:px-4 focus:py-2 focus:text-white"
          >
            Skip to content
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CompareTray />
        </ShortlistProvider>
      </body>
    </html>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200 bg-ink-50">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Image
              src="/brand/eduplana-logo.png"
              alt="Eduplana"
              width={1624}
              height={365}
              className="h-8 w-auto"
            />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-600">
              Education data and management for Nigeria — from choosing a school to running one
              well.
            </p>
          </div>
          <FooterColumn
            title="Find schools"
            links={[
              { href: "/schools?level=primary", label: "Primary schools" },
              { href: "/schools?level=secondary", label: "Secondary schools" },
              { href: "/schools?state=Lagos", label: "Schools in Lagos" },
              { href: "/schools?state=FCT+%28Abuja%29", label: "Schools in Abuja" },
            ]}
          />
          <FooterColumn
            title="Career education"
            links={[
              { href: "/career-education", label: "How the signals work" },
              { href: "/schools?careerReady=1", label: "Schools with strong signals" },
              { href: "/insights/infographics", label: "Infographics" },
            ]}
          />
          <FooterColumn
            title="More"
            links={[
              { href: "/for-schools", label: "For schools" },
              { href: "/insights/reports", label: "Reports & data" },
              { href: "/shortlist", label: "Saved schools" },
              { href: "/compare", label: "Compare schools" },
            ]}
          />
        </div>
        <p className="mt-12 border-t border-ink-200 pt-6 text-xs leading-relaxed text-ink-500">
          Fees and admissions details change between academic sessions. Always confirm the current
          session’s details with a school directly before applying.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="text-sm text-ink-600 transition-colors hover:text-brand-700"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
