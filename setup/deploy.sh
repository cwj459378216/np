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
  echo "Fixing APT sources..."
  
  # Remove all CD-ROM related entries from sources.list and sources.list.d
  sudo sed -i '/cdrom:/d' /etc/apt/sources.list
  sudo sed -i '/file:\/cdrom/d' /etc/apt/sources.list
  sudo find /etc/apt/sources.list.d/ -name "*.list" -exec sudo sed -i '/cdrom:/d' {} \;
  sudo find /etc/apt/sources.list.d/ -name "*.list" -exec sudo sed -i '/file:\/cdrom/d' {} \;
  
  # Backup and recreate sources.list if needed
  if grep -q "file:/cdrom" /etc/apt/sources.list 2>/dev/null; then
    sudo cp /etc/apt/sources.list /etc/apt/sources.list.backup
    sudo sed '/file:\/cdrom/d' /etc/apt/sources.list.backup | sudo tee /etc/apt/sources.list > /dev/null
  fi
  
  # Clean apt cache
  sudo apt-get clean
  sudo rm -rf /var/lib/apt/lists/*
  
  # Try to update package list
  echo "Updating package lists..."
  if ! sudo apt-get update -y; then
    echo "APT update failed, trying alternative approach..."
    
    # Create a minimal sources.list for Ubuntu Noble (24.04)
    echo "Creating minimal sources.list for Ubuntu Noble..."
    sudo tee /etc/apt/sources.list > /dev/null <<EOF
# Ubuntu Noble (24.04) repositories
deb http://archive.ubuntu.com/ubuntu noble main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-updates main restricted universe multiverse
deb http://archive.ubuntu.com/ubuntu noble-backports main restricted universe multiverse
deb http://security.ubuntu.com/ubuntu noble-security main restricted universe multiverse
EOF
    
    sudo apt-get update -y
  fi
  
  echo "Installing base packages..."
  sudo apt-get install -y openjdk-21-jre-headless nginx postgresql postgresql-contrib curl wget gnupg2
  
  # Add Elasticsearch repository
  echo "Adding Elasticsearch repository..."
  wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
  echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
  
  # Update package list and install Elasticsearch and Kibana
  echo "Installing Elasticsearch and Kibana..."
  sudo apt-get update -y
  sudo apt-get install -y elasticsearch kibana
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
  
  # Create database if it doesn't exist
  echo "Creating database octopusx..."
  sudo -u postgres createdb octopusx 2>/dev/null || echo "Database octopusx already exists"
  
  # Initialize database schema
  echo "Initializing database schema on localhost:5432/octopusx..."
  if sudo -u postgres psql -d octopusx -c "SELECT 1" >/dev/null 2>&1; then
    # Copy init.sql to postgres-accessible location with proper permissions
    echo "Copying database initialization script..."
    sudo cp "$SCRIPT_DIR/database/init.sql" /tmp/init.sql
    sudo chmod 644 /tmp/init.sql
    sudo chown postgres:postgres /tmp/init.sql
    
    # Run initialization script
    echo "Running database initialization script..."
    sudo -u postgres psql -d octopusx -f /tmp/init.sql
    
    # Clean up temporary file
    sudo rm -f /tmp/init.sql
    echo "Database initialization completed."
  else
    echo "Warning: Cannot connect to database at localhost:5432/octopusx"
    echo "Please ensure the database server is running and accessible."
    echo "You may need to run the init.sql script manually later:"
    echo "  sudo cp database/init.sql /tmp/init.sql && sudo chown postgres:postgres /tmp/init.sql"
    echo "  sudo -u postgres psql -d octopusx -f /tmp/init.sql"
  fi
fi

# Configure and start Elasticsearch
echo "Configuring Elasticsearch..."

# Create basic Elasticsearch configuration
sudo tee /etc/elasticsearch/elasticsearch.yml > /dev/null <<EOF
cluster.name: np-cluster
node.name: np-node-1
path.data: /var/lib/elasticsearch
path.logs: /var/log/elasticsearch
network.host: localhost
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
action.destructive_requires_name: false
EOF

sudo systemctl start elasticsearch
sudo systemctl enable elasticsearch

# Wait for Elasticsearch to start
echo "Waiting for Elasticsearch to start..."
for i in {1..30}; do
  if curl -s http://localhost:9200 >/dev/null 2>&1; then
    echo "Elasticsearch is running"
    break
  fi
  sleep 2
done

# Configure and start Kibana
echo "Configuring Kibana..."

# Create basic Kibana configuration
sudo tee /etc/kibana/kibana.yml > /dev/null <<EOF
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
EOF

sudo systemctl start kibana
sudo systemctl enable kibana

echo "Elasticsearch and Kibana setup completed."

# systemd service
SERVICE_FILE="/etc/systemd/system/np-web-service.service"
SERVICE_CONTENT="[Unit]\nDescription=NP Web Service\nAfter=network.target postgresql.service\nRequires=postgresql.service\n\n[Service]\nType=simple\nUser=${RUN_USER}\nWorkingDirectory=${APP_DIR}\nEnvironment=SPRING_PROFILES_ACTIVE=prod\nEnvironment=SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/octopusx\nEnvironment=SPRING_DATASOURCE_USERNAME=postgres\nEnvironment=SPRING_DATASOURCE_PASSWORD=postgres\nExecStart=/usr/bin/java -Xms512m -Xmx1024m -jar ${LIB_DIR}/web-service.jar --server.port=${APP_PORT}\nSuccessExitStatus=143\nRestart=on-failure\nRestartSec=5\nStandardOutput=append:${LOG_DIR}/web-service.log\nStandardError=append:${LOG_DIR}/web-service.err\n\n[Install]\nWantedBy=multi-user.target\n"

echo -e "$SERVICE_CONTENT" | sudo tee "$SERVICE_FILE" >/dev/null
sudo systemctl daemon-reload
sudo systemctl enable np-web-service.service
sudo systemctl restart np-web-service.service || sudo systemctl start np-web-service.service

# Nginx site
NGINX_SITE="/etc/nginx/sites-available/np"
NGINX_CONTENT="server {
    listen 8000;
    client_max_body_size 4096M;
    server_name ${SERVER_NAME};
    root ${WWW_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${APP_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}"

echo "$NGINX_CONTENT" | sudo tee "$NGINX_SITE" >/dev/null
sudo ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/np
sudo nginx -t
sudo systemctl reload nginx || sudo systemctl restart nginx

echo "Deployment finished!"
echo "Web:          http://${SERVER_NAME}/"
echo "API:          http://<server>:${APP_PORT}/"
echo "Elasticsearch: http://<server>:9200/"
echo "Kibana:       http://<server>:5601/"
