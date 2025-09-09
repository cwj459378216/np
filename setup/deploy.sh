#!/usr/bin/env bash
set -euo pipefail

# Usage: run on Ubuntu 20.04+
#   bash deploy.sh [--base-dir /opt/np] [--user npuser] [--port 8080] [--server-name example.com]

BASE_DIR="/opt/np"
RUN_USER="np"
APP_PORT="8080"
SERVER_NAME="_"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base-dir) BASE_DIR="$2"; shift 2;;
    --user) RUN_USER="$2"; shift 2;;
    --port) APP_PORT="$2"; shift 2;;
    --server-name) SERVER_NAME="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

mkdir -p "$BASE_DIR"

if ! id -u "$RUN_USER" >/dev/null 2>&1; then
  sudo useradd -r -s /bin/false "$RUN_USER" || true
fi

# Install dependencies
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y openjdk-21-jre-headless nginx postgresql postgresql-contrib
fi

# Layout
APP_DIR="$BASE_DIR/app"
WWW_DIR="$BASE_DIR/www"
LOG_DIR="$BASE_DIR/logs"
LIB_DIR="$BASE_DIR/lib"
mkdir -p "$APP_DIR" "$WWW_DIR" "$LOG_DIR" "$LIB_DIR"

# Expect files next to this script when run manually or inside the pkg dir
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Unpack web client
if [[ -f "$SCRIPT_DIR/web-client-dist.tgz" ]]; then
  sudo rm -rf "$WWW_DIR"/*
  sudo tar -C "$WWW_DIR" -xzf "$SCRIPT_DIR/web-client-dist.tgz"
fi

# Copy jar
if [[ -f "$SCRIPT_DIR/web-service.jar" ]]; then
  sudo cp "$SCRIPT_DIR/web-service.jar" "$LIB_DIR/web-service.jar"
fi

# Initialize database if init.sql exists
if [[ -f "$SCRIPT_DIR/database/init.sql" ]]; then
  echo "Setting up PostgreSQL database..."
  
  # Start PostgreSQL service
  sudo systemctl start postgresql
  sudo systemctl enable postgresql
  
  # Create database and user
  sudo -u postgres psql -c "CREATE DATABASE IF NOT EXISTS npdb;" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE USER IF NOT EXISTS npuser WITH PASSWORD 'nppass';" 2>/dev/null || true
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE npdb TO npuser;" 2>/dev/null || true
  
  # Run initialization script
  echo "Initializing database schema..."
  sudo -u postgres psql -d npdb -f "$SCRIPT_DIR/database/init.sql"
  
  echo "Database initialization completed."
fi

# systemd service
SERVICE_FILE="/etc/systemd/system/np-web-service.service"
SERVICE_CONTENT="[Unit]\nDescription=NP Web Service\nAfter=network.target postgresql.service\nRequires=postgresql.service\n\n[Service]\nType=simple\nUser=${RUN_USER}\nWorkingDirectory=${APP_DIR}\nEnvironment=SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/npdb\nEnvironment=SPRING_DATASOURCE_USERNAME=npuser\nEnvironment=SPRING_DATASOURCE_PASSWORD=nppass\nExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar ${LIB_DIR}/web-service.jar --server.port=${APP_PORT}\nSuccessExitStatus=143\nRestart=on-failure\nRestartSec=5\nStandardOutput=append:${LOG_DIR}/web-service.log\nStandardError=append:${LOG_DIR}/web-service.err\n\n[Install]\nWantedBy=multi-user.target\n"

echo -e "$SERVICE_CONTENT" | sudo tee "$SERVICE_FILE" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable np-web-service.service
sudo systemctl restart np-web-service.service || sudo systemctl start np-web-service.service

# Nginx site
NGINX_SITE="/etc/nginx/sites-available/np"
NGINX_CONTENT="server {\n    listen 80;\n    server_name ${SERVER_NAME};\n    root ${WWW_DIR};\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:${APP_PORT}/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection 'upgrade';\n        proxy_set_header Host $host;\n        proxy_cache_bypass $http_upgrade;\n    }\n}\n"

echo -e "$NGINX_CONTENT" | sudo tee "$NGINX_SITE" >/dev/null
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/np
sudo nginx -t
sudo systemctl reload nginx || sudo systemctl restart nginx

echo "Deployment finished. Web: http://${SERVER_NAME}/  API: http://<server>:${APP_PORT}/"
