#!/usr/bin/env bash
set -euo pipefail

# Root dir is the repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
WEB_CLIENT_DIR="$ROOT_DIR/web-client"
WEB_SERVICE_DIR="$ROOT_DIR/web-service"
ARTIFACTS_DIR="$ROOT_DIR/setup/artifacts"

mkdir -p "$ARTIFACTS_DIR"

# echo "[1/3] Build web-client (Angular)"
# ( cd "$WEB_CLIENT_DIR" && npm ci && npm run build )
# # Angular outputPath is 'dist' per angular.json
# CLIENT_DIST_DIR="$WEB_CLIENT_DIR/dist"
# CLIENT_TGZ="$ARTIFACTS_DIR/web-client-dist.tgz"

# tar -C "$CLIENT_DIST_DIR" -czf "$CLIENT_TGZ" .
# echo "web-client bundle => $CLIENT_TGZ"

# echo "[2/3] Build web-service (Spring Boot)"
# ( cd "$WEB_SERVICE_DIR" && "/Users/frank/Library/Application Support/Code/User/globalStorage/pleiades.java-extension-pack-jdk/maven/latest/bin/mvn"  -q -DskipTests clean package )
# SERVICE_JAR_PATH="$(cd "$WEB_SERVICE_DIR" && ls -1 target/web-service-*.jar | head -n 1)"
# cp "$SERVICE_JAR_PATH" "$ARTIFACTS_DIR/web-service.jar"
# echo "web-service jar => $ARTIFACTS_DIR/web-service.jar"

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
