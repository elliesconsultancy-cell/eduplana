import "server-only";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Writes school-supplied photographs to the same R2 bucket as the rest.
 *
 * Keys sit under `schools/<id>/`, the tree the site already serves from the
 * CDN, so an approved upload renders exactly like the existing photography with
 * no change to how paths are resolved (see lib/assets.ts).
 */
let client: S3Client | null = null;

function s3(): S3Client {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials are not set, so photographs cannot be stored.");
  }
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return client;
}

/** Stores `body` at `path` ("/schools/x/upload-y.webp") and returns the path. */
export async function putImage(path: string, body: Buffer): Promise<string> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET is not set.");
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: path.replace(/^\/+/, ""),
      Body: body,
      ContentType: "image/webp",
      // Every upload gets a fresh name, so the bytes behind a path never change.
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return path;
}
