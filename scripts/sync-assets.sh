#!/usr/bin/env bash
#
# Sync school photography and the research archive to Cloudflare R2.
#
#   ./scripts/sync-assets.sh
#
# Reads credentials from .env.local (never committed). Safe to re-run: rclone
# only transfers what changed, so an interrupted run picks up where it stopped.
#
# The bucket mirrors the public/ layout exactly — public/schools/x.webp becomes
# <bucket>/schools/x.webp — so a path in the data file maps to a URL by
# prefixing NEXT_PUBLIC_ASSET_BASE_URL and nothing else has to change.

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "error: .env.local not found — R2 credentials are read from there" >&2
  exit 1
fi

set -a; . ./.env.local; set +a

: "${R2_ACCOUNT_ID:?missing in .env.local}"
: "${R2_ACCESS_KEY_ID:?missing in .env.local}"
: "${R2_SECRET_ACCESS_KEY:?missing in .env.local}"
: "${R2_BUCKET:?missing in .env.local}"

export RCLONE_CONFIG_R2_TYPE=s3
export RCLONE_CONFIG_R2_PROVIDER=Cloudflare
export RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
export RCLONE_CONFIG_R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
export RCLONE_CONFIG_R2_REGION=auto

# Content-addressed in practice: a school's photo-01.webp never changes in
# place, so a long immutable cache is safe and keeps egress near zero.
CACHE_HEADER="Cache-Control: public, max-age=31536000, immutable"

sync_dir() {
  local src="$1" dest="$2"
  [[ -d "$src" ]] || { echo "skip: $src does not exist"; return; }
  echo "==> $src  →  R2:$R2_BUCKET/$dest"
  rclone sync "$src" "R2:$R2_BUCKET/$dest" \
    --s3-no-check-bucket \
    --header-upload "$CACHE_HEADER" \
    --transfers 64 \
    --checkers 64 \
    --fast-list \
    --retries 5 \
    --stats 20s \
    --stats-one-line \
    --progress
}

sync_dir public/schools schools
sync_dir public/insights insights

echo
echo "done. objects now in the bucket:"
rclone size "R2:$R2_BUCKET" --s3-no-check-bucket
