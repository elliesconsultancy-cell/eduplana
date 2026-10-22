"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * The form a school uses to ask to be added to Eduplana.
 *
 * It asks only for the basics: enough to make a useful listing, not so much
 * that a busy head teacher gives up. Fees and photographs come afterwards,
 * through the same private link every listed school gets. The server does all
 * the checking (lib/outreach/submit.ts); this only collects and shows its
 * answers.
 */

type Problems = Record<string, string | undefined>;

const input =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-950 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500";

function Field({
  label,
  hint,
  problem,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  problem?: string;
  wide?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink-800">
        {label}
      </label>
      {hint ? <p className="mt-0.5 text-[13px] text-ink-500">{hint}</p> : null}
      <div className="mt-1.5">{children(id)}</div>
      {problem ? (
        <p className="mt-1.5 text-sm font-semibold text-red-700" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
      {note ? <p className="mt-1 text-sm text-ink-500">{note}</p> : null}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function ListSchoolForm({ states, email, token }: { states: string[]; email: string; token: string }) {
  const top = useRef<HTMLFormElement>(null);
  const [startedAt] = useState(() => Date.now());
  const [school, setSchool] = useState({
    name: "",
    level: "",
    state: "",
    area: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    summary: "",
    day: true,
    boarding: false,
  });
  const [contact, setContact] = useState({ name: "", role: "", email });
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [problems, setProblems] = useState<Problems>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const text = (key: keyof typeof school) => ({
    value: String(school[key]),
    onChange: (e: { target: { value: string } }) => setSchool({ ...school, [key]: e.target.value }),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setProblems({});
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/list-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, values: school, contact, message, website: trap, t: startedAt }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setProblems(json.problems ?? {});
        setError(json.error ?? "A few details need attention. They are marked below.");
        top.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setError("We could not reach Eduplana. Check your connection and try again. Nothing has been lost.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-8" role="status">
        <p className="font-display text-xl font-semibold text-brand-900">Thank you</p>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
          We have your school. We check every new listing before it goes live, usually within two working days,
          and we will email {contact.email || "you"} when it is up. After that you will get a private link to add
          your fees and photographs.
        </p>
      </div>
    );
  }

  return (
    <form ref={top} onSubmit={submit} className="scroll-mt-24" noValidate>
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <Section title="The school">
        <Field label="School name" problem={problems.name} wide>
          {(id) => <input id={id} className={input} autoComplete="organization" {...text("name")} />}
        </Field>
        <Field
          label="Level"
          problem={problems.level}
          hint="A school with both can be added twice, once for each."
        >
          {(id) => (
            <select id={id} className={input} {...text("level")}>
              <option value="">Choose a level</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
          )}
        </Field>
        <Field label="State" problem={problems.state}>
          {(id) => (
            <select id={id} className={input} {...text("state")}>
              <option value="">Choose a state</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Town or district" hint="e.g. Lekki, Wuse 2" problem={problems.area}>
          {(id) => <input id={id} className={input} {...text("area")} />}
        </Field>
        <Field label="Address" problem={problems.address}>
          {(id) => <input id={id} className={input} autoComplete="street-address" {...text("address")} />}
        </Field>
        <Field label="School phone" hint="Leave empty rather than guess." problem={problems.phone}>
          {(id) => <input id={id} type="tel" className={input} {...text("phone")} />}
        </Field>
        <Field label="School email" problem={problems.email}>
          {(id) => <input id={id} type="email" className={input} {...text("email")} />}
        </Field>
        <Field label="Website" problem={problems.website} wide>
          {(id) => <input id={id} className={input} placeholder="https://" {...text("website")} />}
        </Field>
        <Field label="About the school" hint="Optional. A few sentences in your own words." wide>
          {(id) => <textarea id={id} rows={4} className={input} {...text("summary")} />}
        </Field>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input type="checkbox" checked={school.day} onChange={(e) => setSchool({ ...school, day: e.target.checked })} />
            Day school
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink-800">
            <input
              type="checkbox"
              checked={school.boarding}
              onChange={(e) => setSchool({ ...school, boarding: e.target.checked })}
            />
            Boarding
          </label>
        </div>
      </Section>

      <Section title="About you" note="So we know who sent this. It is not shown on the listing.">
        <Field label="Your name" problem={problems.contact}>
          {(id) => (
            <input id={id} className={input} autoComplete="name" value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          )}
        </Field>
        <Field label="Your role at the school" hint="e.g. Head Teacher, Proprietor">
          {(id) => (
            <input id={id} className={input} value={contact.role}
              onChange={(e) => setContact({ ...contact, role: e.target.value })} />
          )}
        </Field>
        <Field label="Your email" hint="We reply here, and send your private link here." wide>
          {(id) => (
            <input id={id} type="email" className={input} autoComplete="email" value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          )}
        </Field>
        <Field label="Anything else we should know?" hint="Optional." wide>
          {(id) => <textarea id={id} rows={3} className={input} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </Section>

      {/* Hidden from people; bots tend to fill every field. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-8 h-[52px] rounded-2xl bg-brand-900 px-8 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Add my school"}
      </button>
    </form>
  );
}
