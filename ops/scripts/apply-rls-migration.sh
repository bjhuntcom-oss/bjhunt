#!/usr/bin/env bash
# apply-rls-migration.sh — Safely apply 0001_force_rls_and_with_check.sql
#
# Per docs/architecture/10-MULTI-TENANCY.md and the master roadmap §W4.
#
# Procedure:
#   1. Snapshot the VPS via Hostinger API (rollback path).
#   2. Backup Postgres (out-of-band rollback).
#   3. Generate a strong random password for `bjhunt_app`.
#   4. Apply the migration with the password injected via psql -v.
#   5. Print the connection string for `BJHUNT_APP_DATABASE_URL`.
#   6. Caller manually edits .env, restarts backend, monitors for 30 min.
#
# DOES NOT switch the backend over automatically — that's a deliberate manual
# step so a human verifies the migration succeeded before going live.
#
# RUN AS ROOT on the VPS, after a full snapshot+backup window.
#
# Usage:
#   sudo HOSTINGER_API_TOKEN=xxx bash ops/scripts/apply-rls-migration.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "ERROR: Must run as root (sudo bash $0)"
    exit 1
fi

REPO_DIR=/opt/bjhunt/app
MIGRATION_FILE="$REPO_DIR/backend/src/db/migrations/0001_force_rls_and_with_check.sql"

if [[ ! -f "$MIGRATION_FILE" ]]; then
    echo "ERROR: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "=== Phase 1 — Pre-flight checks ==="
docker compose -f "$REPO_DIR/docker-compose.yml" ps postgres | grep -q "healthy" || {
    echo "ERROR: Postgres container not healthy. Aborting."
    exit 1
}

# Source POSTGRES_PASSWORD from .env
if [[ ! -f "$REPO_DIR/.env" ]]; then
    echo "ERROR: $REPO_DIR/.env not found"
    exit 1
fi
# shellcheck source=/dev/null
set -a
. "$REPO_DIR/.env"
set +a

if [[ -z "${POSTGRES_PASSWORD:-}" ]]; then
    echo "ERROR: POSTGRES_PASSWORD not set in .env"
    exit 1
fi

echo ""
echo "=== Phase 2 — Snapshot VPS (Hostinger) ==="
if [[ -n "${HOSTINGER_API_TOKEN:-}" ]]; then
    HOSTINGER_API_TOKEN="$HOSTINGER_API_TOKEN" bash "$REPO_DIR/ops/scripts/snapshot-vps.sh" "pre-rls-migration"
else
    echo "WARN: HOSTINGER_API_TOKEN not set — skipping VPS snapshot."
    echo "      Strongly recommended to snapshot manually via hPanel before continuing."
    read -rp "Continue without snapshot? (yes/no) " ans
    [[ "$ans" == "yes" ]] || exit 1
fi

echo ""
echo "=== Phase 3 — Backup Postgres ==="
B2_BUCKET="${B2_BUCKET:-bjhunt-backups}" \
POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
bash "$REPO_DIR/ops/scripts/backup-postgres.sh"

echo ""
echo "=== Phase 4 — Generate bjhunt_app password ==="
BJHUNT_APP_PASSWORD=$(openssl rand -base64 48 | tr -d '\n=' | tr '+/' '-_')
echo "Generated bjhunt_app password (48 random base64url chars)"
echo "$BJHUNT_APP_PASSWORD" > /root/.bjhunt-app-password
chmod 600 /root/.bjhunt-app-password
echo "Saved to /root/.bjhunt-app-password (mode 600) — copy into .env after success"

echo ""
echo "=== Phase 5 — Apply migration ==="
docker exec -i bjhunt-postgres psql \
    -U bjhunt -d bjhunt \
    -v ON_ERROR_STOP=1 \
    -v "bjhunt_app_password='$BJHUNT_APP_PASSWORD'" \
    < "$MIGRATION_FILE"

echo ""
echo "=== Phase 6 — Verification ==="
echo "Tables with FORCE RLS:"
docker exec -i bjhunt-postgres psql -U bjhunt -d bjhunt -t -c \
    "SELECT relname FROM pg_class WHERE relrowsecurity = true AND relforcerowsecurity = true ORDER BY relname"

echo ""
echo "Policies on engagements:"
docker exec -i bjhunt-postgres psql -U bjhunt -d bjhunt -t -c \
    "SELECT polname, polqual::text, polwithcheck::text FROM pg_policy WHERE polrelid = 'engagements'::regclass"

echo ""
echo "Role bjhunt_app:"
docker exec -i bjhunt-postgres psql -U bjhunt -d bjhunt -t -c \
    "SELECT rolname, rolcanlogin, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = 'bjhunt_app'"

echo ""
echo "=== DONE ==="
echo ""
echo "NEXT STEPS (manual):"
echo "  1. Add this line to /opt/bjhunt/app/.env:"
echo "       BJHUNT_APP_DATABASE_URL=postgresql://bjhunt_app:$BJHUNT_APP_PASSWORD@postgres:5432/bjhunt"
echo "  2. Restart backend:"
echo "       cd /opt/bjhunt/app && docker compose restart backend"
echo "  3. Verify health for at least 30 min:"
echo "       watch -n 5 'curl -sf http://localhost:3001/api/health/ready | jq'"
echo "  4. If anything goes wrong:"
echo "       Remove BJHUNT_APP_DATABASE_URL from .env, restart backend"
echo "       (this falls back to the superuser pool which bypasses FORCE RLS"
echo "       only if the pool was not bjhunt_app — when in doubt, restore the"
echo "       VPS snapshot from Phase 2)."
echo ""
echo "Password is also stored at /root/.bjhunt-app-password (chmod 600)"
