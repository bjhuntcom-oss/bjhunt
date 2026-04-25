#!/usr/bin/env bash
# backup-postgres.sh — Daily PostgreSQL backup + upload to Backblaze B2
#
# Per docs/architecture/14-SECURITY.md §Pre-deployment checklist:
#   "Backup quotidien fonctionnel"
#
# Strategy:
#   1. pg_dump of `bjhunt` database (custom format, compressed)
#   2. Upload to Backblaze B2 bucket
#   3. Retain 30 days local + 90 days remote
#
# Requirements on the VPS:
#   - Docker (to run pg_dump inside the postgres container)
#   - rclone configured for B2 (rclone config; remote name = "b2-bjhunt")
#   - /var/backups/bjhunt/ directory (auto-created)
#
# Required env vars:
#   POSTGRES_PASSWORD — same as in .env
#   B2_BUCKET         — Backblaze B2 bucket name (e.g. bjhunt-backups)
#
# Install as cron (daily 02:00 Europe/Paris):
#   echo "0 2 * * * root POSTGRES_PASSWORD=xxx B2_BUCKET=bjhunt-backups /opt/bjhunt/app/ops/scripts/backup-postgres.sh >> /var/log/bjhunt-backup-pg.log 2>&1" | sudo tee /etc/cron.d/bjhunt-backup-pg

set -euo pipefail

: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD env var required}"
# B2_BUCKET is optional — when unset, the backup is kept local only.
# Set it once rclone is configured for off-site retention.
B2_BUCKET="${B2_BUCKET:-}"

BACKUP_DIR=/var/backups/bjhunt/postgres
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_FILE="$BACKUP_DIR/bjhunt-pg-$TIMESTAMP.dump"
LOCAL_RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$TIMESTAMP] Starting Postgres backup..."

# pg_dump via the running postgres container (no need to expose creds outside)
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" bjhunt-postgres \
    pg_dump -U bjhunt -d bjhunt -Fc -Z 9 --no-owner --no-acl \
    > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$TIMESTAMP] Local dump complete: $BACKUP_FILE ($SIZE)"

# Upload to B2 (idempotent) — skipped silently when B2_BUCKET is empty so
# operators can run local-only backups before configuring rclone.
if [ -n "$B2_BUCKET" ] && command -v rclone >/dev/null 2>&1; then
    echo "[$TIMESTAMP] Uploading to B2 bucket $B2_BUCKET..."
    rclone copy "$BACKUP_FILE" "b2-bjhunt:$B2_BUCKET/postgres/" --b2-hard-delete
    echo "[$TIMESTAMP] Upload complete"
else
    echo "[$TIMESTAMP] B2 upload skipped (B2_BUCKET unset or rclone missing)"
fi

# Cleanup local backups older than retention
find "$BACKUP_DIR" -type f -name "bjhunt-pg-*.dump" -mtime +$LOCAL_RETENTION_DAYS -delete

logger -t bjhunt-backup-pg "Backup complete: $BACKUP_FILE size=$SIZE"
echo "[$TIMESTAMP] DONE"
