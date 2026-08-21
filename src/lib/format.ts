import type { School } from "./types";

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(value: number): string {
  return naira.format(value).replace("NGN", "₦").replace(/\s/g, "");
}

/**
 * Fees in plain language.
 *
 * The blueprint asks for missing data to read as "not provided" rather than
 * something negative, so an absent band never renders as ₦0 or a dash.
 */
export function formatFee(school: School): string {
  const { min, max } = school.fee;
  if (min == null && max == null) return "Fees not provided";
  if (min != null && max == null) return `${formatNaira(min)}+ per term`;
  if (min === 0 && max != null) return `Under ${formatNaira(max)} per term`;
  if (min != null && max != null) {
    return min === max
      ? `${formatNaira(min)} per term`
      : `${formatNaira(min)} – ${formatNaira(max)} per term`;
  }
  return "Fees not provided";
}

export function shortFee(school: School): string {
  const { min, max } = school.fee;
  if (min == null && max == null) return "Fees n/a";
  if (min != null && max == null) return `${formatNaira(min)}+`;
  if (min === 0 && max != null) return `< ${formatNaira(max)}`;
  if (min != null && max != null) {
    return min === max ? formatNaira(min) : `${formatNaira(min)}–${formatNaira(max)}`;
  }
  return "Fees n/a";
}

export function locationLabel(school: School): string {
  return [school.area, school.state].filter(Boolean).join(", ") || "Location not provided";
}

export function boardingLabel(school: School): string {
  if (school.day && school.boarding) return "Day & boarding";
  if (school.boarding) return "Boarding";
  return "Day";
}

export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (!digits) return null;
  // Nigerian mobile numbers are stored locally (0803…); make them dialable
  // internationally so the link works from any handset.
  if (digits.startsWith("0")) return `tel:+234${digits.slice(1)}`;
  if (digits.startsWith("+")) return `tel:${digits}`;
  return `tel:${digits}`;
}

export function displayPhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export { summaryTeaser } from "./summary";

/**
 * Whether a school's fee figures were published exactly, rather than as one of
 * the directory's coarse bands. Worth saying out loud on the profile: an exact
 * ₦852,000 deserves more confidence than "N1 000 000+".
 */
export function hasExactFees(school: School): boolean {
  return school.feeItems.length > 0;
}
