#!/usr/bin/env bash
# backup-neo4j.sh — Daily Neo4j backup + upload to Backblaze B2
#
# Strategy:
#   1. Stop Neo4j (community edition has no online backup)
#   2. neo4j-admin database dump → tar.gz
#   3. Restart Neo4j
#   4. Upload to B2
#   5. Retain 30 days local + 90 days remote
#
# IMPORTANT: this causes ~30s downtime of Neo4j (and therefore engine
# attack-chain queries). Schedule outside business hours.
#
# Required env vars:
#   B2_BUCKET — Backblaze B2 bucket name
#
# Install as cron (daily 02:30 Europe/Paris, after PG backup):
#   echo "30 2 * * * root B2_BUCKET=bjhunt-backups /opt/bjhunt/app/ops/scripts/backup-neo4j.sh >> /var/log/bjhunt-backup-neo4j.log 2>&1" | sudo tee /etc/cron.d/bjhunt-backup-neo4j

set -euo pipefail

# B2 is optional — local-only backup if unset.
B2_BUCKET="${B2_BUCKET:-}"
# Volume name varies by compose project. Default matches the prod stack
# under /opt/bjhunt/app (project name = "app").
NEO4J_VOLUME="${NEO4J_VOLUME:-app_neo4j_data}"

BACKUP_DIR=/var/backups/bjhunt/neo4j
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/bjhunt-neo4j-$TIMESTAMP.tar.gz"
LOCAL_RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting Neo4j backup..."

# Stop neo4j
docker stop bjhunt-neo4j

# Dump via neo4j-admin run inside a one-shot container with the data volume
docker run --rm \
    -v "$NEO4J_VOLUME":/data \
    -v "$BACKUP_DIR":/backup \
    neo4j:5.24-community \
    neo4j-admin database dump neo4j --to-path=/backup --overwrite-destination=true

# Compress
tar czf "$BACKUP_FILE" -C "$BACKUP_DIR" neo4j.dump
rm -f "$BACKUP_DIR/neo4j.dump"

# Restart
docker start bjhunt-neo4j

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$TIMESTAMP] Local dump complete: $BACKUP_FILE ($SIZE)"

# Upload to B2 (idempotent) — skipped if B2 not configured.
if [ -n "$B2_BUCKET" ] && command -v rclone >/dev/null 2>&1; then
    echo "[$TIMESTAMP] Uploading to B2 bucket $B2_BUCKET..."
    rclone copy "$BACKUP_FILE" "b2-bjhunt:$B2_BUCKET/neo4j/" --b2-hard-delete
    echo "[$TIMESTAMP] Upload complete"
else
    echo "[$TIMESTAMP] B2 upload skipped (B2_BUCKET unset or rclone missing)"
fi

find "$BACKUP_DIR" -type f -name "bjhunt-neo4j-*.tar.gz" -mtime +$LOCAL_RETENTION_DAYS -delete

logger -t bjhunt-backup-neo4j "Backup complete: $BACKUP_FILE size=$SIZE"
echo "[$TIMESTAMP] DONE"
