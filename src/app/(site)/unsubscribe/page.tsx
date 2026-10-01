import type { Metadata } from "next";

import { unsubscribeAction } from "../manage/actions";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

/**
 * Stops outreach email to an address.
 *
 * A button rather than an automatic opt-out on arrival: email security filters
 * open every link in a message to scan it, and an address must not be
 * unsubscribed because a scanner looked.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; s?: string; done?: string; invalid?: string }>;
}) {
  const { e, s, done, invalid } = await searchParams;

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-display text-3xl font-semibold text-ink-950">
        {done ? "You are unsubscribed" : "Unsubscribe"}
      </h1>
      {done ? (
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
          We will not email this address about Eduplana listings again. To change or remove a listing
          itself, email{" "}
          <a className="font-semibold text-brand-700 underline" href="mailto:info@eduplana.org">
            info@eduplana.org
          </a>
          .
        </p>
      ) : invalid || !e || !s ? (
        <p className="mt-4 text-[17px] leading-relaxed text-ink-600">
          This unsubscribe link is incomplete. Use the link from the email itself, or reply to that email
          asking us to stop and we will.
        </p>
      ) : (
        <form action={unsubscribeAction} className="mt-6">
          <input type="hidden" name="e" value={e} />
          <input type="hidden" name="s" value={s} />
          <p className="text-[17px] leading-relaxed text-ink-600">
            Stop Eduplana emailing <strong className="text-ink-900">{e}</strong> about school listings?
          </p>
          <button
            type="submit"
            className="mt-6 h-[52px] rounded-2xl bg-brand-900 px-6 font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Unsubscribe
          </button>
        </form>
      )}
    </div>
  );
}
