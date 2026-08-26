import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { CompareTray } from "@/components/compare-tray";
import { ShortlistProvider } from "@/components/shortlist-provider";

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

/**
 * School pages set relative Open Graph images, which Next resolves against
 * this base. Without it every share card in production points at
 * http://localhost:3000 and renders blank.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://www.eduplana.org");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Eduplana — Find schools across Nigeria",
    template: "%s · Eduplana",
  },
  description:
    "Search, compare and shortlist primary and secondary schools across all 36 states and the FCT. Fees, curriculum, facilities and contact details in one place.",
  keywords: ["Nigeria schools", "primary school", "secondary school", "school fees", "admissions"],
  icons: {
    icon: "/brand/icon.png",
    apple: "/brand/icon.png",
  },
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
