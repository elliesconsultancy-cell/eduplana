import type { TypedUser } from "payload";

/**
 * The account chip in the header: initials and first name, in place of a
 * Gravatar silhouette that showed the same grey ghost for everybody.
 */
export function Avatar({ user }: { user?: TypedUser | null }) {
  const u = user as { name?: string; email?: string } | null | undefined;
  const name = u?.name || u?.email || "";
  const first = name.split(/[\s@]/)[0] ?? "";
  const initials = name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
  return (
    <span className="ep-me">
      <span className="ep-me__badge" aria-hidden>
        {initials || "·"}
      </span>
      <span className="ep-me__name">{first}</span>
    </span>
  );
}
