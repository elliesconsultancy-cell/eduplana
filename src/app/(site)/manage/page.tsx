import type { Metadata } from "next";

import { requestLinkAction } from "./actions";

export const metadata: Metadata = {
  title: "Update your school's listing",
  description: "Schools listed on Eduplana can review and correct their own details.",
  robots: { index: false, follow: false },
};

/**
 * Where a school starts if it has no link, or its link has expired.
 *
 * There is no account and no password. The school proves who it is by
 * receiving an email at the address its listing already shows — the same test
 * the outreach email relies on, available whenever they need it.
 */
export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; expired?: string }>;
}) {
  const { sent, expired } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-20">
      <h1 className="font-display text-3xl font-semibold text-ink-950 sm:text-4xl">
        Update your school&rsquo;s listing
      </h1>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6" role="status">
          <p className="font-semibold text-brand-900">Check your inbox</p>
          <p className="mt-2 text-ink-700">
            If that address is on a listing, we have sent it a private link. It works for 48 hours.
            Nothing arriving? Check your spam folder, or email{" "}
            <a className="font-semibold text-brand-700 underline" href="mailto:info@eduplana.org">
              info@eduplana.org
            </a>{" "}
            from the school&rsquo;s address and we will help.
          </p>
        </div>
      ) : (
        <>
          {expired ? (
            <p className="mt-6 rounded-xl bg-gold-100 px-4 py-3 text-ink-800" role="alert">
              That link has expired or is not valid. Enter your school&rsquo;s email below and we will
              send a new one.
            </p>
          ) : null}
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
            Enter the email address shown on your school&rsquo;s Eduplana listing. We will send a
            private link there that lets you check and correct your details — no account or password
            needed.
          </p>
          <form action={requestLinkAction} className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label htmlFor="email" className="sr-only">
              School email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="admissions@yourschool.com"
              className="h-[52px] w-full rounded-2xl border border-ink-200 bg-white px-4 text-[15px] outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500"
            />
            <button
              type="submit"
              className="h-[52px] rounded-2xl bg-brand-900 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Email me a link
            </button>
          </form>
          <p className="mt-6 text-sm text-ink-500">
            Your listing has a different address, or none at all? Email{" "}
            <a className="font-semibold text-brand-700 underline" href="mailto:info@eduplana.org">
              info@eduplana.org
            </a>{" "}
            from your school&rsquo;s official address and we will update it.
          </p>
        </>
      )}
    </div>
  );
}
