#!/usr/bin/env bash
set -euo pipefail

# Root dir is the repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_SERVICE_DIR="$ROOT_DIR/web-service"
ARTIFACTS_DIR="$ROOT_DIR/setup/artifacts"

mkdir -p "$ARTIFACTS_DIR"

echo "[1/1] Build web-service (Spring Boot) for production"
if ( cd "$WEB_SERVICE_DIR" && mvn -q -DskipTests -Pprod clean package ); then
    # 直接在 WEB_SERVICE_DIR 中查找 JAR 文件
    SERVICE_JAR=$(find "$WEB_SERVICE_DIR/target" -name "web-service-*.jar" -type f | head -n 1)
    if [ -n "$SERVICE_JAR" ] && [ -f "$SERVICE_JAR" ]; then
        cp "$SERVICE_JAR" "$ARTIFACTS_DIR/web-service.jar"
        echo "web-service jar => $ARTIFACTS_DIR/web-service.jar"
    else
        echo "Error: JAR file not found in target directory"
        exit 1
    fi
else
    echo "Error: Maven build failed"
    exit 1
fi

echo "Done."
