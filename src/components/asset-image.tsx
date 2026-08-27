import Image, { type ImageProps } from "next/image";
import { asset, isRemoteAsset } from "@/lib/assets";

/**
 * An `<Image>` for anything living in the asset trees.
 *
 * Takes the repo-relative `path` the data actually stores, resolves it to the
 * CDN, and skips the optimizer for anything served from there — see
 * `isRemoteAsset`. Centralising it means a new image added later cannot quietly
 * start costing transformations because somebody forgot a prop.
 */
export function AssetImage({ path, ...rest }: Omit<ImageProps, "src"> & { path: string }) {
  // `alt` is required by ImageProps and supplied by every caller, but the a11y
  // rule only reads literal JSX attributes and cannot see it arrive in `rest`.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image {...rest} src={asset(path)} unoptimized={isRemoteAsset(path)} />;
}
