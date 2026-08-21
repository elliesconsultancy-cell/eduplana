import { CHIP_ICON_TONES, CHIP_TONES, chipFor } from "@/lib/taxonomy";

/**
 * A facility / activity / club, rendered with an icon and a colour drawn from
 * the label itself. Colour here is informational: a parent scanning forty tags
 * can spot "sport" or "science" without reading every word.
 */
export function IconChip({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  const { icon: Icon, tone } = chipFor(label);
  const small = size === "sm";

  return (
    <li
      className={`inline-flex items-center gap-2 rounded-full ring-1 ring-inset ${CHIP_TONES[tone]} ${
        small ? "py-1 pl-1 pr-2.5 text-xs" : "py-1.5 pl-1.5 pr-3.5 text-sm"
      }`}
    >
      <span
        aria-hidden
        className={`grid shrink-0 place-items-center rounded-full ${CHIP_ICON_TONES[tone]} ${
          small ? "size-5" : "size-7"
        }`}
      >
        <Icon size={small ? 12 : 15} strokeWidth={2.1} />
      </span>
      <span className="font-medium leading-tight">{label}</span>
    </li>
  );
}

export function IconChipList({
  items,
  size = "md",
}: {
  items: string[];
  size?: "sm" | "md";
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => (
        <IconChip key={item} label={item} size={size} />
      ))}
    </ul>
  );
}
