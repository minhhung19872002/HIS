#!/bin/bash
# Install the disk-cleanup cron on a remote Oracle VM.
#
# Usage:  ./install_cleanup_cron.sh <vm_ip> [<ssh_key>]
#
# Copies cleanup_disk.sh to /usr/local/sbin/ and registers an hourly cron.
# Idempotent — re-running just refreshes the script + cron file.

set -euo pipefail

if [[ $# -lt 1 ]]; then
    echo "Usage: $0 <vm_ip> [<ssh_key>]" >&2
    exit 1
fi

VM_IP="$1"
SSH_KEY="${2:-$(dirname "$0")/his-pacs-vm.key}"
HERE="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -f "$HERE/cleanup_disk.sh" ]]; then
    echo "Missing cleanup_disk.sh at $HERE" >&2
    exit 1
fi

echo "[install] copying cleanup_disk.sh to $VM_IP..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    "$HERE/cleanup_disk.sh" "ubuntu@$VM_IP:/tmp/cleanup_disk.sh"

ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "ubuntu@$VM_IP" '
set -euo pipefail
sudo install -m 0755 /tmp/cleanup_disk.sh /usr/local/sbin/cleanup_disk.sh
rm /tmp/cleanup_disk.sh
sudo touch /var/log/his-cleanup.log
sudo chmod 644 /var/log/his-cleanup.log

# /etc/cron.d entries must end in newline; root user; minute 17 hourly
sudo tee /etc/cron.d/his-cleanup >/dev/null <<EOF
# HIS disk cleanup — runs every hour at :17
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
17 * * * * root /usr/local/sbin/cleanup_disk.sh
EOF

# Daily logrotate for the cleanup log itself (keep 14 days)
sudo tee /etc/logrotate.d/his-cleanup >/dev/null <<EOF
/var/log/his-cleanup.log {
    daily
    rotate 14
    missingok
    notifempty
    compress
    delaycompress
}
EOF

# Quick syntax + dry-run sanity (will exit 0 if disk <80%)
sudo /usr/local/sbin/cleanup_disk.sh
echo "---"
echo "Cron installed:"
sudo cat /etc/cron.d/his-cleanup
'

echo "[install] done — $VM_IP cron will fire every hour at :17."
