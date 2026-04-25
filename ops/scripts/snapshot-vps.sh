#!/usr/bin/env bash
# snapshot-vps.sh — Trigger a Hostinger VPS snapshot via API
#
# Per the rollback strategy: snapshot the VPS BEFORE every wave deploy and
# weekly as a baseline. Replaces a snapshot if one already exists for this VM
# (Hostinger keeps only 1 manual snapshot per VPS on KVM 8 plan).
#
# Required env vars:
#   HOSTINGER_API_TOKEN — API token from https://hpanel.hostinger.com/profile/api
#   VPS_ID              — VPS virtual machine ID (default 1295179 for BJHUNT)
#
# Usage:
#   HOSTINGER_API_TOKEN=xxx VPS_ID=1295179 bash ops/scripts/snapshot-vps.sh [reason]
#
# Install as cron (weekly Sunday 03:00 Europe/Paris):
#   echo "0 3 * * 0 root HOSTINGER_API_TOKEN=xxx /opt/bjhunt/app/ops/scripts/snapshot-vps.sh weekly-baseline >> /var/log/bjhunt-snapshot.log 2>&1" | sudo tee /etc/cron.d/bjhunt-snapshot

set -euo pipefail

: "${HOSTINGER_API_TOKEN:?HOSTINGER_API_TOKEN env var required}"
: "${VPS_ID:=1295179}"

REASON="${1:-manual}"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)

echo "[$TIMESTAMP] Triggering snapshot of VPS $VPS_ID (reason: $REASON)..."

# Delete existing snapshot first (Hostinger limits 1 manual snapshot per VM)
EXISTING=$(curl -sf -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
    "https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/snapshot" 2>/dev/null || true)

if echo "$EXISTING" | grep -q '"id"'; then
    echo "[$TIMESTAMP] Existing snapshot found, deleting..."
    curl -sf -X DELETE -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
        "https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/snapshot" || true
    sleep 5
fi

# Create new snapshot
RESPONSE=$(curl -sf -X POST -H "Authorization: Bearer $HOSTINGER_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://developers.hostinger.com/api/vps/v1/virtual-machines/$VPS_ID/snapshot")

ACTION_ID=$(echo "$RESPONSE" | grep -oE '"id":[0-9]+' | head -n1 | cut -d: -f2 || echo "unknown")

echo "[$TIMESTAMP] Snapshot triggered. Action ID: $ACTION_ID, reason: $REASON"
echo "$RESPONSE"

# Log to syslog (visible via journalctl)
logger -t bjhunt-snapshot "Snapshot triggered for VPS $VPS_ID, action=$ACTION_ID, reason=$REASON"
