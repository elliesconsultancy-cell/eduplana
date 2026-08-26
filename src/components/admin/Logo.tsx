import Image from "next/image";

const SIZE = { width: 1624, height: 365 } as const;
const RENDERED = { height: 44, width: "auto" } as const;

/**
 * Full lock-up, shown on the login and create-first-user screens.
 *
 * Uses the same assets as the public site so the two never drift apart. The
 * admin is a different audience but the same product — signing in should not
 * feel like leaving Eduplana.
 *
 * Both variants render and CSS hides one (see custom.css). Picking the asset
 * here would mean reading the theme in JS, and Payload resolves it from a
 * cookie that can flip after mount — so the blue mark would paint onto the
 * dark card for a frame before swapping.
 */
export function Logo() {
  return (
    <span className="brand-lockup">
      <Image
        {...SIZE}
        src="/brand/eduplana-logo.png"
        alt="Eduplana"
        priority
        className="brand-lockup__light"
        style={RENDERED}
      />
      <Image
        {...SIZE}
        src="/brand/eduplana-logo-reversed.png"
        alt=""
        aria-hidden
        priority
        className="brand-lockup__dark"
        style={RENDERED}
      />
    </span>
  );
}
