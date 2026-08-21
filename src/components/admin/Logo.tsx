import Image from "next/image";

/**
 * Full lock-up, shown on the login and create-first-user screens.
 *
 * Uses the same asset as the public site so the two never drift apart. The
 * admin is a different audience but the same product — signing in should not
 * feel like leaving Eduplana.
 */
export function Logo() {
  return (
    <Image
      src="/brand/eduplana-logo.png"
      alt="Eduplana"
      width={538}
      height={108}
      priority
      style={{ height: 44, width: "auto" }}
    />
  );
}
