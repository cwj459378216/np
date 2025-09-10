#!/usr/bin/env bash
set -euo pipefail

# Root dir is the repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_CLIENT_DIR="$ROOT_DIR/web-client"
ARTIFACTS_DIR="$ROOT_DIR/setup/artifacts"

mkdir -p "$ARTIFACTS_DIR"

echo "[1/1] Build web-client (Angular) for production"
( cd "$WEB_CLIENT_DIR" && npm ci && npm run build -- --configuration=production )
# Angular outputPath is 'dist' per angular.json
CLIENT_DIST_DIR="$WEB_CLIENT_DIR/dist"
CLIENT_TGZ="$ARTIFACTS_DIR/web-client-dist.tgz"

tar -C "$CLIENT_DIST_DIR" -czf "$CLIENT_TGZ" .
echo "web-client bundle => $CLIENT_TGZ"

echo "Done."
