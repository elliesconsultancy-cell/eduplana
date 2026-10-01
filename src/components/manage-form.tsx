"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";

import { asset } from "@/lib/assets";
import type { Listing } from "@/lib/outreach/listing";

/**
 * The form a school uses to correct its own listing.
 *
 * Inputs are kept as the strings people type; the server does all the
 * interpreting (see lib/outreach/normalize.ts), so there is one set of rules
 * and the browser cannot be talked out of them. Lists are one item per line,
 * because that is how a school's prospectus already reads.
 */

type Problems = Record<string, string | undefined>;
type Kind = "update" | "confirm" | "removal";

interface Draft {
  tagline: string;
  summary: string;
  scope: string;
  yearFounded: string;
  curricula: string;
  faith: string;
  state: string;
  area: string;
  address: string;
  busStop: string;
  phone: string;
  email: string;
  admissionsOfficer: string;
  admissionsRole: string;
  website: string;
  fee: { min: string; max: string };
  feeItems: Array<{ label: string; amount: string }>;
  scholarship: string;
  siblingsDiscount: string;
  day: boolean;
  boarding: boolean;
  maxClassSize: string;
  facilities: string;
  activities: string;
  clubs: string;
  images: Listing["images"];
}

const str = (v: string | number | null | undefined) => (v == null ? "" : String(v));

function toDraft(l: Listing): Draft {
  return {
    tagline: str(l.tagline),
    summary: str(l.summary),
    scope: str(l.scope),
    yearFounded: str(l.yearFounded),
    curricula: l.curricula.join("\n"),
    faith: l.faith,
    state: str(l.state),
    area: str(l.area),
    address: str(l.address),
    busStop: str(l.busStop),
    phone: str(l.phone),
    email: str(l.email),
    admissionsOfficer: str(l.admissionsOfficer),
    admissionsRole: str(l.admissionsRole),
    website: str(l.website),
    fee: { min: str(l.fee.min), max: str(l.fee.max) },
    feeItems: l.feeItems.map((f) => ({ label: f.label, amount: String(f.amount) })),
    scholarship: str(l.scholarship),
    siblingsDiscount: str(l.siblingsDiscount),
    day: l.day,
    boarding: l.boarding,
    maxClassSize: str(l.maxClassSize),
    facilities: l.facilities.join("\n"),
    activities: l.activities.join("\n"),
    clubs: l.clubs.join("\n"),
    images: l.images,
  };
}

/** Phones send 10 MB photographs; 2000px JPEG is plenty and fits the upload limit. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
}

const input =
  "w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-[15px] text-ink-950 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500";

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

export function ManageForm({
  token,
  schoolId,
  schoolName,
  initial,
  states,
  defaultContactEmail,
  backHref,
}: {
  token: string;
  schoolId: string;
  schoolName: string;
  initial: Listing;
  states: string[];
  defaultContactEmail: string;
  backHref: string | null;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [contact, setContact] = useState({ name: "", role: "", email: defaultContactEmail });
  const [message, setMessage] = useState("");
  const [removalReason, setRemovalReason] = useState("");
  const [problems, setProblems] = useState<Problems>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Kind | null>(null);
  const [uploading, setUploading] = useState(0);
  const [done, setDone] = useState<{ kind: Kind; changed: number } | null>(null);
  const top = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const text = (key: keyof Draft) => ({
    value: draft[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, e.target.value as never),
  });

  async function upload(files: FileList | null, kind: "photo" | "logo") {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, kind === "logo" ? 1 : 24 - draft.images.gallery.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const body = new FormData();
        body.set("token", token);
        body.set("school", schoolId);
        body.set("kind", kind);
        body.set("file", await shrink(file), "upload.jpg");
        const res = await fetch("/api/manage/photo", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed.");
        setDraft((d) =>
          kind === "logo"
            ? { ...d, images: { ...d.images, logo: json.logo } }
            : { ...d, images: { ...d.images, gallery: [...d.images.gallery, { full: json.full, thumb: json.thumb }] } },
        );
      } catch (e) {
        setError(
          `${file.name}: ${e instanceof Error ? e.message : "upload failed"}. Try a JPEG or PNG under 4 MB.`,
        );
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit(kind: Kind) {
    setProblems({});
    setError(null);
    if (!contact.name.trim() || !contact.role.trim()) {
      setProblems({ contact: "Tell us your name and your role at the school." });
      top.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setBusy(kind);
    try {
      const res = await fetch("/api/manage/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          school: schoolId,
          kind,
          values: draft,
          contact,
          message: kind === "removal" ? removalReason : message,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone({ kind: json.kind, changed: json.changed });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setProblems(json.problems ?? {});
        setError(json.error ?? "A few details need attention — they are marked below.");
        top.current?.scrollIntoView({ behavior: "smooth" });
      }
    } catch {
      setError("We could not reach Eduplana. Check your connection and try again — nothing has been lost.");
    } finally {
      setBusy(null);
    }
  }

  if (done) {
    return (
      <div className="mt-8 rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-8" role="status">
        <p className="font-display text-xl font-semibold text-brand-900">Thank you</p>
        <p className="mt-2 text-[17px] leading-relaxed text-ink-700">
          {done.kind === "removal"
            ? `We have your request to remove ${schoolName}. We will review it and reply to you by email.`
            : done.kind === "confirm"
              ? `Thank you for confirming ${schoolName}'s details. Once we have reviewed them, your listing will show as verified.`
              : `We have received ${done.changed} change${done.changed === 1 ? "" : "s"} to ${schoolName}. We check every change before it goes live, usually within two working days, and your listing will then show as verified.`}
        </p>
        {backHref ? (
          <Link href={backHref} className="mt-5 inline-block font-semibold text-brand-700 underline">
            Review your other listings
          </Link>
        ) : null}
      </div>
    );
  }

  const busyAny = busy !== null || uploading > 0;

  return (
    <div ref={top} className="scroll-mt-24">
      {error ? (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <Section title="About you" note="So we know who sent these changes. Not shown on the listing.">
        <Field label="Your name" problem={problems.contact}>
          {(id) => (
            <input id={id} className={input} autoComplete="name" value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })} />
          )}
        </Field>
        <Field label="Your role at the school" hint="e.g. Head Teacher, Admissions Officer">
          {(id) => (
            <input id={id} className={input} value={contact.role}
              onChange={(e) => setContact({ ...contact, role: e.target.value })} />
          )}
        </Field>
        <Field label="Your email" hint="In case we have a question about a change." wide>
          {(id) => (
            <input id={id} type="email" className={input} autoComplete="email" value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })} />
          )}
        </Field>
      </Section>

      <Section title="Contact details" note="How parents reach the school. Leave a field empty rather than guess.">
        <Field label="Phone" problem={problems.phone}>
          {(id) => <input id={id} type="tel" className={input} {...text("phone")} />}
        </Field>
        <Field label="Email" problem={problems.email}>
          {(id) => <input id={id} type="email" className={input} {...text("email")} />}
        </Field>
        <Field label="Website" problem={problems.website} wide>
          {(id) => <input id={id} className={input} placeholder="https://" {...text("website")} />}
        </Field>
        <Field label="Admissions contact" hint="A named person parents can ask for.">
          {(id) => <input id={id} className={input} {...text("admissionsOfficer")} />}
        </Field>
        <Field label="Their role" hint="e.g. Admissions Manager">
          {(id) => <input id={id} className={input} {...text("admissionsRole")} />}
        </Field>
      </Section>

      <Section title="Location">
        <Field label="State" problem={problems.state}>
          {(id) => (
            <select id={id} className={input} {...text("state")}>
              <option value="">Choose a state</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Town or district" hint="e.g. Lekki, Wuse 2">
          {(id) => <input id={id} className={input} {...text("area")} />}
        </Field>
        <Field label="Address" wide>
          {(id) => <textarea id={id} rows={2} className={input} {...text("address")} />}
        </Field>
        <Field label="Nearest bus stop or landmark" wide>
          {(id) => <input id={id} className={input} {...text("busStop")} />}
        </Field>
      </Section>

      <Section title="About the school">
        <Field label="Strapline" hint="Your motto or one-line description." wide>
          {(id) => <input id={id} className={input} {...text("tagline")} />}
        </Field>
        <Field label="About the school" hint="A few sentences in your own words. Shown as “About this school”." wide>
          {(id) => <textarea id={id} rows={6} className={input} {...text("summary")} />}
        </Field>
        <Field label="Stages offered" hint="e.g. Creche, Nursery, Primary">
          {(id) => <input id={id} className={input} {...text("scope")} />}
        </Field>
        <Field label="Year founded" problem={problems.yearFounded}>
          {(id) => <input id={id} inputMode="numeric" className={input} {...text("yearFounded")} />}
        </Field>
        <Field label="Curriculum" hint="One per line, e.g. British, Nigerian, Montessori">
          {(id) => <textarea id={id} rows={3} className={input} {...text("curricula")} />}
        </Field>
        <Field label="Faith">
          {(id) => (
            <select id={id} className={input} {...text("faith")}>
              <option value="Secular">Not faith-based</option>
              <option value="Christian">Christian</option>
              <option value="Islamic">Islamic</option>
            </select>
          )}
        </Field>
        <Field label="Largest class size" hint="Pupils in your largest class." problem={problems.maxClassSize}>
          {(id) => <input id={id} inputMode="numeric" className={input} {...text("maxClassSize")} />}
        </Field>
        <div className="flex flex-wrap items-end gap-6 pb-1">
          <label className="flex items-center gap-2 text-[15px] text-ink-800">
            <input type="checkbox" className="size-4 accent-brand-600" checked={draft.day}
              onChange={(e) => set("day", e.target.checked)} />
            Day school
          </label>
          <label className="flex items-center gap-2 text-[15px] text-ink-800">
            <input type="checkbox" className="size-4 accent-brand-600" checked={draft.boarding}
              onChange={(e) => set("boarding", e.target.checked)} />
            Boarding
          </label>
        </div>
      </Section>

      <Section title="Fees" note="Per term, in naira. Parents filter by these, so a range is better than nothing.">
        <Field label="Fees start from" problem={problems.fee}>
          {(id) => (
            <input id={id} inputMode="numeric" className={input} placeholder="e.g. 350000" value={draft.fee.min}
              onChange={(e) => set("fee", { ...draft.fee, min: e.target.value })} />
          )}
        </Field>
        <Field label="Up to" hint="Leave empty if there is no upper figure.">
          {(id) => (
            <input id={id} inputMode="numeric" className={input} placeholder="e.g. 600000" value={draft.fee.max}
              onChange={(e) => set("fee", { ...draft.fee, max: e.target.value })} />
          )}
        </Field>
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-ink-800">Itemised fees</p>
          <p className="mt-0.5 text-[13px] text-ink-500">Optional: exact amounts, e.g. “Tuition, Year 7”.</p>
          {draft.feeItems.map((item, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_9rem_auto] gap-2">
              <input aria-label="Fee description" className={input} value={item.label}
                onChange={(e) => set("feeItems", draft.feeItems.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))} />
              <input aria-label="Amount in naira" inputMode="numeric" className={input} value={item.amount}
                onChange={(e) => set("feeItems", draft.feeItems.map((f, j) => (j === i ? { ...f, amount: e.target.value } : f)))} />
              <button type="button" className="rounded-xl px-3 text-sm font-semibold text-ink-500 hover:text-red-700"
                onClick={() => set("feeItems", draft.feeItems.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          ))}
          {problems.feeItems ? <p className="mt-1.5 text-sm font-semibold text-red-700">{problems.feeItems}</p> : null}
          <button type="button" className="mt-3 text-sm font-semibold text-brand-700 hover:underline"
            onClick={() => set("feeItems", [...draft.feeItems, { label: "", amount: "" }])}>
            + Add a fee line
          </button>
        </div>
        <Field label="Scholarships" hint="e.g. Partial scholarships for Year 7 entry">
          {(id) => <input id={id} className={input} {...text("scholarship")} />}
        </Field>
        <Field label="Sibling discount" hint="e.g. 10% off the second child">
          {(id) => <input id={id} className={input} {...text("siblingsDiscount")} />}
        </Field>
      </Section>

      <Section title="Facilities and activities" note="One per line. Each becomes a tag on your listing.">
        <Field label="Facilities" hint="e.g. Science laboratory, Swimming pool">
          {(id) => <textarea id={id} rows={6} className={input} {...text("facilities")} />}
        </Field>
        <Field label="Activities" hint="e.g. Football, Debate">
          {(id) => <textarea id={id} rows={6} className={input} {...text("activities")} />}
        </Field>
        <Field label="Clubs" hint="e.g. Coding club, Press club" wide>
          {(id) => <textarea id={id} rows={4} className={input} {...text("clubs")} />}
        </Field>
      </Section>

      <Section title="Logo and photographs" note="Clear photos of the school itself — buildings, classrooms, facilities. Up to 24.">
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-ink-800">Logo</p>
          <div className="mt-2 flex items-center gap-4">
            <div className="grid size-20 place-items-center overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
              {draft.images.logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- CDN asset, already sized
                <img src={asset(draft.images.logo)} alt="Current logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-xs text-ink-400">None</span>
              )}
            </div>
            <label className="cursor-pointer rounded-xl border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-800 hover:border-brand-400">
              {draft.images.logo ? "Replace logo" : "Upload logo"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files, "logo")} />
            </label>
            {draft.images.logo ? (
              <button type="button" className="text-sm font-semibold text-ink-500 hover:text-red-700"
                onClick={() => set("images", { ...draft.images, logo: null })}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="text-sm font-semibold text-ink-800">Photographs ({draft.images.gallery.length})</p>
          {problems.images ? <p className="mt-1 text-sm font-semibold text-red-700">{problems.images}</p> : null}
          <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {draft.images.gallery.map((g) => (
              <li key={g.full} className="group relative aspect-[3/2] overflow-hidden rounded-xl bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- CDN thumbnail, already sized */}
                <img src={asset(g.thumb)} alt="" className="size-full object-cover" />
                <button type="button"
                  className="absolute right-1.5 top-1.5 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-ink-800 shadow hover:text-red-700"
                  onClick={() => set("images", { ...draft.images, gallery: draft.images.gallery.filter((x) => x.full !== g.full) })}>
                  Remove
                </button>
              </li>
            ))}
            {draft.images.gallery.length < 24 ? (
              <li>
                <label className="grid aspect-[3/2] cursor-pointer place-items-center rounded-xl border-2 border-dashed border-ink-300 text-sm font-semibold text-brand-700 hover:border-brand-400">
                  {uploading > 0 ? `Uploading ${uploading}…` : "+ Add photos"}
                  <input type="file" accept="image/*" multiple className="sr-only"
                    onChange={(e) => upload(e.target.files, "photo")} />
                </label>
              </li>
            ) : null}
          </ul>
        </div>
      </Section>

      <Section title="Anything else?">
        <Field label="A note for the Eduplana team" hint="Optional. Not shown on your listing." wide>
          {(id) => <textarea id={id} rows={3} className={input} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </Section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={busyAny} onClick={() => submit("update")}
          className="h-[52px] rounded-2xl bg-brand-900 px-6 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60">
          {busy === "update" ? "Sending…" : "Submit changes"}
        </button>
        <button type="button" disabled={busyAny} onClick={() => submit("confirm")}
          className="h-[52px] rounded-2xl border border-ink-300 bg-white px-6 font-semibold text-ink-900 transition-colors hover:border-brand-400 disabled:opacity-60">
          {busy === "confirm" ? "Sending…" : "Everything is already correct"}
        </button>
      </div>
      <p className="mt-3 text-sm text-ink-500">
        Nothing changes on Eduplana until we have checked it.
      </p>

      <details className="mt-12 rounded-2xl border border-ink-200 bg-white p-5">
        <summary className="cursor-pointer font-semibold text-ink-700">Request removal of this listing</summary>
        <p className="mt-3 text-sm text-ink-600">
          If {schoolName} should not be listed — it has closed, or you would rather not appear — tell us why
          and we will review the request.
        </p>
        <label className="mt-3 block text-sm font-semibold text-ink-800" htmlFor="removal-reason">
          Reason
        </label>
        <textarea id="removal-reason" rows={3} className={`${input} mt-1.5`} value={removalReason}
          onChange={(e) => setRemovalReason(e.target.value)} />
        {problems.message ? <p className="mt-1.5 text-sm font-semibold text-red-700">{problems.message}</p> : null}
        <button type="button" disabled={busyAny} onClick={() => submit("removal")}
          className="mt-3 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">
          {busy === "removal" ? "Sending…" : "Request removal"}
        </button>
      </details>
    </div>
  );
}
