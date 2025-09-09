#!/usr/bin/env bash
set -euo pipefail

# Root dir is the repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/setup/artifacts"

mkdir -p "$ARTIFACTS_DIR"

echo "[1/3] Build web-client"
"$ROOT_DIR/setup/build-web-client.sh"

echo "[2/3] Build web-service" 
"$ROOT_DIR/setup/build-web-service.sh"

echo "[3/3] Create deploy package"
PKG_DIR="$ARTIFACTS_DIR/pkg"
rm -rf "$PKG_DIR" && mkdir -p "$PKG_DIR"
cp "$ARTIFACTS_DIR/web-client-dist.tgz" "$PKG_DIR/"
cp "$ARTIFACTS_DIR/web-service.jar" "$PKG_DIR/"
cp "$ROOT_DIR/setup/deploy.sh" "$PKG_DIR/"
cp -r "$ROOT_DIR/database" "$PKG_DIR/database"
( cd "$ARTIFACTS_DIR" && tar -czf deploy-package.tgz pkg )
echo "Deploy package => $ARTIFACTS_DIR/deploy-package.tgz"

echo "Done."
