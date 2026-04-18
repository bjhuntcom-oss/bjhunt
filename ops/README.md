# BJHUNT Ops Scripts

VPS operational scripts. Mirror these to `/opt/bjhunt/app/ops/scripts/` on the
VPS via the standard `git pull` deploy.

## Inventory

| Script | Purpose | Schedule |
|---|---|---|
| `install-sslh.sh` | Install + configure sslh on VPS to multiplex SSH+HTTPS on :443 | One-shot, run as root before first compose deploy of the new layout |
| `snapshot-vps.sh` | Trigger a Hostinger VPS snapshot via API | Weekly Sunday 03:00 Europe/Paris + before every wave deploy |
| `backup-postgres.sh` | `pg_dump` + upload to Backblaze B2 | Daily 02:00 Europe/Paris |
| `backup-neo4j.sh` | `neo4j-admin database dump` + upload to B2 (causes ~30s Neo4j downtime) | Daily 02:30 Europe/Paris |
| `health-check.sh` | Probe all services + send mail alert after 3 consecutive failures | Every 5 minutes |

## First-time VPS bootstrap

```bash
# On the VPS as root
cd /opt/bjhunt/app

# 1. Install sslh (needed for the new compose layout where caddy listens on 8443)
sudo bash ops/scripts/install-sslh.sh

# 2. Configure rclone for Backblaze B2 (interactive)
#    See https://rclone.org/b2/  -- remote name MUST be "b2-bjhunt"
rclone config

# 3. Create local backup dir
sudo mkdir -p /var/backups/bjhunt/{postgres,neo4j} /var/lib/bjhunt-health

# 4. Install crons (replace XXX with real values)
cat <<'EOF' | sudo tee /etc/cron.d/bjhunt
# m h dom mon dow user command
0  2  *   *   *   root POSTGRES_PASSWORD=XXX B2_BUCKET=bjhunt-backups /opt/bjhunt/app/ops/scripts/backup-postgres.sh >> /var/log/bjhunt-backup-pg.log 2>&1
30 2  *   *   *   root B2_BUCKET=bjhunt-backups                       /opt/bjhunt/app/ops/scripts/backup-neo4j.sh    >> /var/log/bjhunt-backup-neo4j.log 2>&1
0  3  *   *   0   root HOSTINGER_API_TOKEN=XXX                        /opt/bjhunt/app/ops/scripts/snapshot-vps.sh weekly-baseline >> /var/log/bjhunt-snapshot.log 2>&1
*/5 *  *   *   *  root ALERT_EMAIL=ops@bjhunt.com                     /opt/bjhunt/app/ops/scripts/health-check.sh    >> /var/log/bjhunt-health.log 2>&1
EOF

sudo systemctl restart cron

# 5. Test each script manually (replace env vars):
sudo POSTGRES_PASSWORD=XXX B2_BUCKET=bjhunt-backups bash ops/scripts/backup-postgres.sh
sudo B2_BUCKET=bjhunt-backups bash ops/scripts/backup-neo4j.sh
sudo HOSTINGER_API_TOKEN=XXX bash ops/scripts/snapshot-vps.sh test
sudo ALERT_EMAIL=ops@bjhunt.com bash ops/scripts/health-check.sh
```

## Manual snapshot before a risky deploy

```bash
# On VPS
sudo HOSTINGER_API_TOKEN=$YOUR_TOKEN bash /opt/bjhunt/app/ops/scripts/snapshot-vps.sh "pre-W4-RLS-deploy"
```

## Restore procedure

### Postgres
```bash
# Latest dump
LATEST=$(ls -t /var/backups/bjhunt/postgres/*.dump | head -1)

# Stop services that consume the DB
docker compose stop backend langgraph litellm

# Restore (DESTRUCTIVE)
docker exec -i bjhunt-postgres pg_restore -U bjhunt -d bjhunt --clean --if-exists < "$LATEST"

# Restart
docker compose start backend langgraph litellm
```

### Neo4j
```bash
LATEST=$(ls -t /var/backups/bjhunt/neo4j/*.tar.gz | head -1)
TMPDIR=$(mktemp -d)
tar xzf "$LATEST" -C "$TMPDIR"

docker stop bjhunt-neo4j
docker run --rm \
    -v bjhunt-v2_neo4j_data:/data \
    -v "$TMPDIR":/backup \
    neo4j:5.24-community \
    neo4j-admin database load neo4j --from-path=/backup --overwrite-destination=true
docker start bjhunt-neo4j
```

### VPS (full rollback)
Use Hostinger control panel → VPS → Snapshot → Restore. Causes ~5 min downtime.
