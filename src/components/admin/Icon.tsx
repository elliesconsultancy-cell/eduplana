import Image from "next/image";

/** Compact mark for the admin sidebar and browser chrome. */
export function Icon() {
  return (
    <Image
      src="/brand/eduplana-mark.png"
      alt=""
      width={256}
      height={256}
      style={{ height: 26, width: 26 }}
    />
  );
}
