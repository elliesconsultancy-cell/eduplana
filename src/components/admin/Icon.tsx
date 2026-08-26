import Image from "next/image";

/** Compact mark for the admin sidebar and browser chrome. */
export function Icon() {
  return (
    <Image
      src="/brand/eduplana-mark.png"
      alt=""
      width={387}
      height={365}
      style={{ height: 26, width: "auto" }}
    />
  );
}
