#!/usr/bin/env bash
set -euo pipefail

# Root dir is the repo root
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/setup/artifacts"

echo "=== 构建生产环境包 ==="
echo "清理之前的构建产物..."
rm -rf "$ARTIFACTS_DIR"
mkdir -p "$ARTIFACTS_DIR"

echo ""
echo "[1/3] 构建前端 (Angular) - 生产环境"
"$ROOT_DIR/setup/build-web-client.sh"

echo ""
echo "[2/3] 构建后端 (Spring Boot) - 生产环境" 
"$ROOT_DIR/setup/build-web-service.sh"

echo ""
echo "[3/3] 创建部署包"
PKG_DIR="$ARTIFACTS_DIR/pkg"
rm -rf "$PKG_DIR" && mkdir -p "$PKG_DIR"
cp "$ARTIFACTS_DIR/web-client-dist.tgz" "$PKG_DIR/"
cp "$ARTIFACTS_DIR/web-service.jar" "$PKG_DIR/"
cp "$ROOT_DIR/setup/deploy.sh" "$PKG_DIR/"
cp -r "$ROOT_DIR/database" "$PKG_DIR/database"
( cd "$ARTIFACTS_DIR" && tar -czf deploy-package.tgz pkg )

echo ""
echo "=== 构建完成 ==="
echo "前端包: $ARTIFACTS_DIR/web-client-dist.tgz"
echo "后端包: $ARTIFACTS_DIR/web-service.jar"
echo "部署包: $ARTIFACTS_DIR/deploy-package.tgz"
echo ""
echo "使用部署包: tar -xzf deploy-package.tgz && cd pkg && ./deploy.sh"
