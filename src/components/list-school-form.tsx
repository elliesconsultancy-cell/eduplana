"use client";

import { Check, CheckCircle2, ChevronDown, ImagePlus, X } from "lucide-react";
import { useId, useRef, useState, type ReactNode } from "react";

import { asset } from "@/lib/assets";

/**
 * The form a school invited to Eduplana uses to add itself.
 *
 * Inputs stay as the strings people type; the server does all the checking
 * (lib/outreach/submit.ts), so there is one set of rules and the browser
 * cannot be talked out of them. Photographs upload the moment they are chosen,
 * on their own, because a function accepts at most 4.5 MB a request.
 *
 * Hints sit under their field, not between the label and the input: with the
 * hint above, two fields in one row sit at different heights whenever only one
 * of them has a hint.
 */

type Problems = Record<string, string | undefined>;
type Gallery = Array<{ full: string; thumb: string }>;

const MAX_PHOTOS = 12;

const control =
  "w-full rounded-xl border border-ink-200 bg-white px-4 text-[15px] text-ink-950 outline-none transition-colors placeholder:text-ink-400 hover:border-ink-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";
const single = `${control} h-12`;
const multi = `${control} py-3 leading-relaxed`;

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

function Field({
  label,
  hint,
  problem,
  required,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  problem?: string;
  required?: boolean;
  wide?: boolean;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={wide ? "sm:col-span-2" : undefined} data-problem={problem ? "" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-900">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-brand-600">
            *
          </span>
        ) : null}
      </label>
      {children(id)}
      {problem ? (
        <p className="mt-1.5 text-sm font-semibold text-red-700" role="alert">
          {problem}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] leading-snug text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

function Section({
  step,
  title,
  note,
  children,
}: {
  step: number;
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-8">
      <header className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800"
        >
          {step}
        </span>
        <div>
          <h2 className="font-display text-xl font-semibold leading-snug text-ink-950">{title}</h2>
          {note ? <p className="mt-1 text-sm leading-relaxed text-ink-500">{note}</p> : null}
        </div>
      </header>
      <div className="mt-7 grid items-start gap-x-5 gap-y-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Select({
  id,
  value,
  onChange,
  children,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${single} appearance-none pr-11`}>
        {children}
      </select>
      <ChevronDown
        size={18}
        strokeWidth={2.2}
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-400"
      />
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label
      className={`flex h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 text-[15px] font-semibold transition-colors focus-within:ring-4 focus-within:ring-brand-100 ${
        checked ? "border-brand-500 bg-brand-50 text-brand-900" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
      }`}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span
        aria-hidden
        className={`grid size-5 place-items-center rounded-md border ${
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300 bg-white"
        }`}
      >
        {checked ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      {label}
    </label>
  );
}

export function ListSchoolForm({ states, email, token }: { states: string[]; email: string; token: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [startedAt] = useState(() => Date.now());
  const [school, setSchool] = useState({
    name: "",
    level: "",
    scope: "",
    yearFounded: "",
    faith: "Secular",
    curricula: "",
    summary: "",
    day: true,
    boarding: false,
    state: "",
    area: "",
    address: "",
    busStop: "",
    phone: "",
    email: "",
    website: "",
    admissionsOfficer: "",
    admissionsRole: "",
    fee: { min: "", max: "" },
    facilities: "",
  });
  const [logo, setLogo] = useState<string | null>(null);
  const [gallery, setGallery] = useState<Gallery>([]);
  const [uploading, setUploading] = useState(0);
  const [contact, setContact] = useState({ name: "", role: "", email });
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [problems, setProblems] = useState<Problems>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = <K extends keyof typeof school>(key: K, value: (typeof school)[K]) =>
    setSchool((s) => ({ ...s, [key]: value }));
  const text = (key: "name" | "scope" | "yearFounded" | "curricula" | "summary" | "area" | "address" | "busStop" | "phone" | "email" | "website" | "admissionsOfficer" | "admissionsRole" | "facilities") => ({
    value: school[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value),
  });

  async function upload(files: FileList | null, kind: "photo" | "logo") {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, kind === "logo" ? 1 : MAX_PHOTOS - gallery.length);
    setUploading((n) => n + list.length);
    for (const file of list) {
      try {
        const body = new FormData();
        body.set("token", token);
        body.set("kind", kind);
        body.set("file", await shrink(file), "upload.jpg");
        const res = await fetch("/api/list-school/photo", { method: "POST", body });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed.");
        if (kind === "logo") setLogo(json.logo);
        else setGallery((g) => [...g, { full: json.full, thumb: json.thumb }]);
      } catch (e) {
        setError(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}. Try a JPEG or PNG under 4 MB.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setProblems({});
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/list-school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          values: { ...school, images: { logo, gallery } },
          contact,
          message,
          website: trap,
          t: startedAt,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setProblems(json.problems ?? {});
        setError(json.error ?? "A few details need attention. They are marked below.");
        // Bring the first marked field into view once it has rendered.
        setTimeout(() => {
          const target = formRef.current?.querySelector("[data-problem]") ?? formRef.current;
          target?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    } catch {
      setError("We could not reach Eduplana. Check your connection and try again. Nothing has been lost.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-brand-200 bg-brand-50 p-8 text-center sm:p-12" role="status">
        <CheckCircle2 size={44} strokeWidth={1.8} aria-hidden className="mx-auto text-brand-600" />
        <h2 className="font-display mt-5 text-2xl font-semibold text-brand-950">Thank you. We have your school.</h2>
        <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-ink-700">
          We check every new listing before it goes live, usually within two working days. We will email{" "}
          <strong className="font-semibold text-ink-900">{contact.email || "you"}</strong> when it is up, with a
          private link to keep your fees and photographs up to date.
        </p>
      </div>
    );
  }

  const busyAny = busy || uploading > 0;

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-6">
      {error ? (
        <p className="rounded-2xl bg-red-50 px-5 py-4 font-semibold text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <p className="text-sm text-ink-500">
        Fields marked <span className="font-bold text-brand-600">*</span> are required. Everything else is
        optional: leave a field empty rather than guess.
      </p>

      <Section step={1} title="About the school">
        <Field label="School name" required problem={problems.name} wide>
          {(id) => <input id={id} className={single} autoComplete="organization" {...text("name")} />}
        </Field>
        <Field
          label="Level"
          required
          problem={problems.level}
          hint="A school with both can be added twice, once for each."
        >
          {(id) => (
            <Select id={id} value={school.level} onChange={(v) => set("level", v)}>
              <option value="">Choose a level</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </Select>
          )}
        </Field>
        <Field label="Stages offered" hint="e.g. Creche to Primary 6">
          {(id) => <input id={id} className={single} {...text("scope")} />}
        </Field>
        <Field label="Year founded" problem={problems.yearFounded}>
          {(id) => <input id={id} inputMode="numeric" placeholder="e.g. 1998" className={single} {...text("yearFounded")} />}
        </Field>
        <Field label="Faith">
          {(id) => (
            <Select id={id} value={school.faith} onChange={(v) => set("faith", v)}>
              <option value="Secular">Not faith-based</option>
              <option value="Christian">Christian</option>
              <option value="Islamic">Islamic</option>
            </Select>
          )}
        </Field>
        <Field label="Curriculum" hint="One per line, e.g. Nigerian, British" wide>
          {(id) => <textarea id={id} rows={3} className={multi} {...text("curricula")} />}
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-semibold text-ink-900">Day or boarding</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={school.day} onChange={(v) => set("day", v)} label="Day school" />
            <Toggle checked={school.boarding} onChange={(v) => set("boarding", v)} label="Boarding" />
          </div>
        </div>
        <Field label="About the school" hint="A few sentences in your own words. This is what parents read first." wide>
          {(id) => <textarea id={id} rows={5} className={multi} {...text("summary")} />}
        </Field>
      </Section>

      <Section step={2} title="Where it is" note="So parents can find you, and so we can place you on the right search.">
        <Field label="State" required problem={problems.state}>
          {(id) => (
            <Select id={id} value={school.state} onChange={(v) => set("state", v)}>
              <option value="">Choose a state</option>
              {states.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Town or district" required problem={problems.area} hint="e.g. Lekki, Wuse 2">
          {(id) => <input id={id} className={single} {...text("area")} />}
        </Field>
        <Field label="Address" required problem={problems.address} wide>
          {(id) => <input id={id} className={single} autoComplete="street-address" {...text("address")} />}
        </Field>
        <Field label="Nearest bus stop or landmark" wide>
          {(id) => <input id={id} className={single} {...text("busStop")} />}
        </Field>
      </Section>

      <Section step={3} title="How parents reach you" note="The school's own details, shown on the listing.">
        <Field label="Phone" problem={problems.phone} hint="The school's own number, e.g. 0803 123 4567">
          {(id) => <input id={id} type="tel" className={single} {...text("phone")} />}
        </Field>
        <Field label="Email" problem={problems.email}>
          {(id) => <input id={id} type="email" className={single} {...text("email")} />}
        </Field>
        <Field label="Website" problem={problems.website} wide>
          {(id) => <input id={id} className={single} placeholder="https://" {...text("website")} />}
        </Field>
        <Field label="Admissions contact" hint="A named person parents can ask for.">
          {(id) => <input id={id} className={single} {...text("admissionsOfficer")} />}
        </Field>
        <Field label="Their role" hint="e.g. Admissions Manager">
          {(id) => <input id={id} className={single} {...text("admissionsRole")} />}
        </Field>
      </Section>

      <Section step={4} title="Fees and facilities" note="Optional, but schools with fees and facilities listed are the ones parents shortlist.">
        <Field label="Fees per term: from" problem={problems.fee}>
          {(id) => (
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500">
                ₦
              </span>
              <input
                id={id}
                inputMode="numeric"
                placeholder="450000"
                className={`${single} pl-9`}
                value={school.fee.min}
                onChange={(e) => set("fee", { ...school.fee, min: e.target.value })}
              />
            </div>
          )}
        </Field>
        <Field label="Fees per term: up to" hint="Leave empty if it is a single figure.">
          {(id) => (
            <div className="relative">
              <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-500">
                ₦
              </span>
              <input
                id={id}
                inputMode="numeric"
                placeholder="650000"
                className={`${single} pl-9`}
                value={school.fee.max}
                onChange={(e) => set("fee", { ...school.fee, max: e.target.value })}
              />
            </div>
          )}
        </Field>
        <Field label="Facilities" hint="One per line, e.g. Library, Science laboratory, Playground" wide>
          {(id) => <textarea id={id} rows={4} className={multi} {...text("facilities")} />}
        </Field>
      </Section>

      <Section
        step={5}
        title="Logo and photographs"
        note={`Clear photographs of the school itself: buildings, classrooms, facilities. Up to ${MAX_PHOTOS}. JPEG or PNG, under 4 MB each.`}
      >
        <div className="sm:col-span-2" data-problem={problems.images ? "" : undefined}>
          <p className="mb-2 text-sm font-semibold text-ink-900">Logo</p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="grid size-24 place-items-center overflow-hidden rounded-2xl border border-ink-200 bg-ink-50">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element -- CDN asset, already sized
                <img src={asset(logo)} alt="Your logo" className="max-h-full max-w-full object-contain p-2" />
              ) : (
                <ImagePlus size={26} strokeWidth={1.6} aria-hidden className="text-ink-300" />
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex h-11 cursor-pointer items-center rounded-xl border border-ink-200 bg-white px-5 text-sm font-semibold text-ink-900 transition-colors focus-within:ring-4 focus-within:ring-brand-100 hover:border-brand-400">
                {logo ? "Replace logo" : "Upload logo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files, "logo")} />
              </label>
              {logo ? (
                <button type="button" onClick={() => setLogo(null)} className="text-sm font-semibold text-ink-500 hover:text-red-700">
                  Remove
                </button>
              ) : null}
            </div>
          </div>
          {problems.images ? <p className="mt-2 text-sm font-semibold text-red-700">{problems.images}</p> : null}
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink-900">
            Photographs{" "}
            <span className="font-normal text-ink-500">
              ({gallery.length} of {MAX_PHOTOS})
            </span>
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((g) => (
              <li key={g.full} className="group relative aspect-[3/2] overflow-hidden rounded-xl bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element -- CDN thumbnail, already sized */}
                <img src={asset(g.thumb)} alt="" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove this photograph"
                  onClick={() => setGallery((all) => all.filter((x) => x.full !== g.full))}
                  className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-full bg-white/95 text-ink-700 shadow transition-colors hover:text-red-700"
                >
                  <X size={15} strokeWidth={2.4} aria-hidden />
                </button>
              </li>
            ))}
            {gallery.length < MAX_PHOTOS ? (
              <li>
                <label className="flex aspect-[3/2] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink-300 bg-ink-50/60 text-center text-sm font-semibold text-brand-700 transition-colors focus-within:ring-4 focus-within:ring-brand-100 hover:border-brand-400 hover:bg-brand-50">
                  <ImagePlus size={22} strokeWidth={1.8} aria-hidden />
                  {uploading > 0 ? `Uploading ${uploading}…` : "Add photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => upload(e.target.files, "photo")}
                  />
                </label>
              </li>
            ) : null}
          </ul>
        </div>
      </Section>

      <Section step={6} title="About you" note="So we know who sent this. It is not shown on the listing.">
        <Field label="Your name" required problem={problems.contact}>
          {(id) => (
            <input
              id={id}
              className={single}
              autoComplete="name"
              value={contact.name}
              onChange={(e) => setContact({ ...contact, name: e.target.value })}
            />
          )}
        </Field>
        <Field label="Your role at the school" required hint="e.g. Head Teacher, Proprietor">
          {(id) => (
            <input
              id={id}
              className={single}
              value={contact.role}
              onChange={(e) => setContact({ ...contact, role: e.target.value })}
            />
          )}
        </Field>
        <Field label="Your email" required hint="We reply here, and send your private link here." wide>
          {(id) => (
            <input
              id={id}
              type="email"
              className={single}
              autoComplete="email"
              value={contact.email}
              onChange={(e) => setContact({ ...contact, email: e.target.value })}
            />
          )}
        </Field>
        <Field label="Anything else we should know?" hint="Optional. Not shown on the listing." wide>
          {(id) => <textarea id={id} rows={3} className={multi} value={message} onChange={(e) => setMessage(e.target.value)} />}
        </Field>
      </Section>

      {/* Hidden from people; bots tend to fill every field. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </label>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <p className="max-w-md text-sm leading-relaxed text-ink-600">
          Nothing is published until we have checked it. You will hear from us by email, usually within two
          working days.
        </p>
        <button
          type="submit"
          disabled={busyAny}
          className="h-[52px] shrink-0 rounded-2xl bg-brand-900 px-8 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Sending…" : uploading > 0 ? "Uploading photos…" : "Add my school"}
        </button>
      </div>
    </form>
  );
}
