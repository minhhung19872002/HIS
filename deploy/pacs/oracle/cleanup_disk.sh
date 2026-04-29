#!/bin/bash
# Auto disk cleanup — staged thresholds.
# Designed to be safe to re-run hourly via cron. Logs to /var/log/his-cleanup.log.
#
# Tier 1 (≥80% used):  Truncate Docker container logs, apt clean,
#                      journalctl vacuum 7 days, /tmp older than 7 days.
# Tier 2 (≥85% used):  docker system prune -af, journal 3 days,
#                      /var/log archive purge >14 days, /tmp >1 day.
# Tier 3 (≥92% used):  Aggressive — truncate ALL Docker logs to 0,
#                      docker volume prune, /var/log/*.log >100 MB → truncate,
#                      /tmp >1 hour.
#
# Designed for the HIS Oracle VMs (PACS + Jitsi). Touches no app data
# (DICOM in R2, Cloud SQL elsewhere) — safe.

set -uo pipefail

LOG=/var/log/his-cleanup.log
THRESHOLD_T1=80
THRESHOLD_T2=85
THRESHOLD_T3=92

log()   { echo "[$(date -u +%FT%TZ)] $*" | tee -a "$LOG"; }
usage() { df --output=pcent / | tail -1 | tr -d ' %'; }

start_pct=$(usage)
log "=== Cleanup start. Disk usage: ${start_pct}% ==="

if (( start_pct < THRESHOLD_T1 )); then
    log "Below T1 ${THRESHOLD_T1}% — no action needed."
    exit 0
fi

# ===== Tier 1 =====
log "Tier 1 triggered (≥${THRESHOLD_T1}%)."

# Truncate Docker container logs (keeps containers running)
if command -v docker >/dev/null 2>&1; then
    for cid in $(docker ps -aq 2>/dev/null); do
        log_path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null || true)
        if [[ -n "$log_path" && -f "$log_path" ]]; then
            sz=$(stat -c%s "$log_path" 2>/dev/null || echo 0)
            if (( sz > 10*1024*1024 )); then
                : > "$log_path"
                log "  Truncated Docker log: $log_path (was ${sz}b)"
            fi
        fi
    done
fi

# Apt cache
apt-get clean 2>/dev/null || true
log "  apt-get clean done."

# Journal logs
journalctl --vacuum-time=7d 2>/dev/null | tail -2 | sed 's/^/  /' | tee -a "$LOG"

# /tmp older than 7 days
find /tmp -mindepth 1 -mtime +7 -delete 2>/dev/null
log "  /tmp older than 7 days purged."

curr_pct=$(usage)
log "After Tier 1: ${curr_pct}%"

# ===== Tier 2 =====
if (( curr_pct < THRESHOLD_T2 )); then
    log "Below T2 ${THRESHOLD_T2}% — stopping."
    exit 0
fi
log "Tier 2 triggered (≥${THRESHOLD_T2}%)."

if command -v docker >/dev/null 2>&1; then
    docker system prune -af 2>&1 | tail -3 | sed 's/^/  /' | tee -a "$LOG" || true
fi

journalctl --vacuum-time=3d 2>/dev/null | tail -2 | sed 's/^/  /' | tee -a "$LOG"

# Old archived logs
find /var/log -name '*.gz' -mtime +14 -delete 2>/dev/null
find /var/log -name '*.[1-9]' -mtime +14 -delete 2>/dev/null
log "  Archive logs >14d purged."

find /tmp -mindepth 1 -mtime +1 -delete 2>/dev/null

curr_pct=$(usage)
log "After Tier 2: ${curr_pct}%"

# ===== Tier 3 =====
if (( curr_pct < THRESHOLD_T3 )); then
    log "Below T3 ${THRESHOLD_T3}% — stopping."
    exit 0
fi
log "Tier 3 triggered (≥${THRESHOLD_T3}%) — aggressive cleanup."

# Nuke all Docker logs
if command -v docker >/dev/null 2>&1; then
    for cid in $(docker ps -aq 2>/dev/null); do
        log_path=$(docker inspect --format='{{.LogPath}}' "$cid" 2>/dev/null || true)
        [[ -n "$log_path" && -f "$log_path" ]] && : > "$log_path"
    done
    docker volume prune -f 2>&1 | tail -2 | sed 's/^/  /' | tee -a "$LOG" || true
fi

# Truncate any /var/log file >100 MB (keeps the file, drops contents)
find /var/log -type f -size +100M 2>/dev/null | while read -r f; do
    : > "$f"
    log "  Truncated: $f"
done

find /tmp -mindepth 1 -mmin +60 -delete 2>/dev/null

curr_pct=$(usage)
log "=== Cleanup end. Disk usage: ${curr_pct}% (was ${start_pct}%) ==="
