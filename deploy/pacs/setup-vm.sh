#!/bin/bash
# Bootstrap script for Oracle Cloud Free Tier VM (Ubuntu 22.04 ARM64)
# Usage: ssh ubuntu@<vm-ip> 'bash -s' < setup-vm.sh

set -euo pipefail

echo "=== HIS PACS Oracle VM setup ==="

# 1. Update system
sudo apt-get update
sudo apt-get upgrade -y

# 2. Install Docker + Compose
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker ubuntu
fi

if ! docker compose version &> /dev/null; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
fi

# 3. Open firewall ports (Oracle VM uses iptables, not ufw by default)
# Port 80 (HTTP for Let's Encrypt), 443 (HTTPS), 4242 (DICOM C-STORE)
echo "Configuring firewall..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 4242 -j ACCEPT
sudo netfilter-persistent save

# 4. Create PACS directory
mkdir -p ~/pacs
cd ~/pacs

# 5. Check .env file exists
if [ ! -f .env ]; then
    echo "!! .env file not found in ~/pacs/"
    echo "!! Copy .env.example to .env and fill in R2 credentials first"
    exit 1
fi

# 6. Start PACS stack
echo "Starting Orthanc + Caddy..."
docker compose pull
docker compose up -d

echo ""
echo "=== Setup complete ==="
echo "Orthanc web UI: https://\$PACS_DOMAIN/app/explorer.html"
echo "OHIF viewer:    https://\$PACS_DOMAIN/ohif/"
echo "DICOM C-STORE:  \$PACS_DOMAIN:4242 (AET: HIS_PACS)"
echo ""
echo "Test from local: curl -u admin:\$ORTHANC_ADMIN_PASSWORD https://\$PACS_DOMAIN/system"
