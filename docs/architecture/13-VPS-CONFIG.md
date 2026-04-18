# 13 — VPS Configuration

> VPS Hostinger KVM 8 — Paris datacenter.
> Toute la configuration du serveur de production.

## Specs

| Parametre | Valeur |
|---|---|
| **IP** | 82.25.117.79 |
| **IPv6** | 2a02:4780:28:3349::1 |
| **OS** | Ubuntu 25.10 |
| **CPU** | 8 vCPU |
| **RAM** | 32 GB |
| **Disque** | 400 GB NVMe SSD |
| **Datacenter** | Paris (id: 15) |
| **Plan** | KVM 8 |
| **VPS ID** | 1295179 |
| **Firewall ID** | 255451 |
| **Expiration** | 25 janvier 2027 |
| **Auto-renewal** | Active |

## Connexion SSH

```bash
# Depuis la machine locale
ssh bjhunt-vps

# Config dans ~/.ssh/config
Host bjhunt-vps
    HostName 82.25.117.79
    Port 443          # sslh multiplex sur 443
    User root
    IdentityFile ~/.ssh/bjhunt_vps
    IdentitiesOnly yes
```

**IMPORTANT** : Le FAI bloque tous les ports sauf 80 et 443.
SSH passe par sslh qui multiplex SSH + TLS sur le port 443.
**Ne JAMAIS tenter SSH sur le port 22 depuis l'exterieur** — ca timeout.

## sslh (Multiplexeur SSH/TLS)

sslh ecoute sur `0.0.0.0:443` et dispatch :
- Trafic SSH → `127.0.0.1:22`
- Trafic TLS → `127.0.0.1:8443` (Caddy)

```bash
# Config: /etc/default/sslh
DAEMON_OPTS="--user sslh --listen 0.0.0.0:443 --ssh 127.0.0.1:22 --tls 127.0.0.1:8443"

# Service systemd
sudo systemctl status sslh
sudo systemctl restart sslh
```

## Firewall

### UFW (niveau OS)

```bash
# Status
sudo ufw status verbose

# Regles actives
Default: deny (incoming), allow (outgoing)
22/tcp    ALLOW  Anywhere    # SSH (local via sslh)
80/tcp    ALLOW  Anywhere    # HTTP (redirect → HTTPS)
443/tcp   ALLOW  Anywhere    # sslh (SSH + TLS)
8022/tcp  ALLOW  Anywhere    # SSH backup
2222/tcp  ALLOW  Anywhere    # SSH alternatif
```

### Firewall Hostinger (niveau hyperviseur)

| Port | Protocol | Source | Action |
|---|---|---|---|
| 22 | TCP | any | accept |
| 80 | TCP | any | accept |
| 443 | TCP | any | accept |
| 2222 | TCP | any | accept |
| 8022 | TCP | any | accept |

**Gestion via MCP** : `VPS_getFirewallListV1`, `VPS_syncFirewallV1`

## Structure des repertoires

```
/opt/bjhunt/
├── app/                     # Clone du repo bjhunt (ce repo)
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── .env                 # Secrets de production
│   ├── backend/
│   ├── engine/
│   └── ...
└── stack/                   # Legacy (ancien deploiement)
    └── .env                 # Anciennes variables

/srv/bjhunt/
├── postgres/                # Donnees PostgreSQL
├── redis/                   # Donnees Redis
├── neo4j/                   # Donnees Neo4j
└── backups/                 # Backups pg_dump
```

## Services systemd

| Service | Description | Status |
|---|---|---|
| sslh | Multiplexeur SSH/TLS | Active, auto-start |
| sshd | SSH server | Active, auto-start |
| docker | Docker engine | Active, auto-start |
| ufw | Firewall | Active |
| monarx | Antimalware | Active |

Les containers Docker sont geres par `docker compose`, pas par systemd.
Pour auto-restart, `restart: unless-stopped` dans le compose.

## Docker

```bash
# Version
docker --version  # Docker 27.x

# Etat
docker ps          # Containers actifs
docker stats       # Ressources en temps reel
docker system df   # Espace disque utilise

# Cleanup (periodique)
docker system prune -f --volumes  # ATTENTION: supprime les volumes non utilises
docker image prune -f             # Safe: supprime les images sans tag
```

## Monitoring

### Metriques VPS (via Hostinger MCP)

```
Outil: VPS_getMetricsV1
VPS ID: 1295179

Metriques disponibles :
- CPU usage (%)
- RAM usage (%)
- Disk usage (%)
- Network I/O (bytes)
- Disk I/O (IOPS)
```

### Health checks

```bash
# Backend
curl http://localhost:3001/api/health/live
curl http://localhost:3001/api/health/ready

# PostgreSQL
docker exec bjhunt-postgres pg_isready -U bjhunt_admin -d bjhunt

# Redis
docker exec bjhunt-redis redis-cli ping

# LangGraph
curl http://localhost:2024/health

# LiteLLM
curl http://localhost:4000/health

# Neo4j
docker exec bjhunt-neo4j cypher-shell -u neo4j -p $NEO4J_PASSWORD 'RETURN 1'
```

### Alertes

Alertes configurees via cron + script :

```bash
# /opt/bjhunt/scripts/health-check.sh
#!/bin/bash

# Check backend
if ! curl -sf http://localhost:3001/api/health/ready > /dev/null; then
    echo "ALERT: Backend unhealthy" | mail -s "BJHUNT Alert" admin@bjhunt.com
fi

# Check disk
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "ALERT: Disk usage ${DISK_USAGE}%" | mail -s "BJHUNT Alert" admin@bjhunt.com
fi

# Check memory
MEM_USAGE=$(free | awk '/Mem/ {printf "%d", $3/$2*100}')
if [ "$MEM_USAGE" -gt 90 ]; then
    echo "ALERT: Memory usage ${MEM_USAGE}%" | mail -s "BJHUNT Alert" admin@bjhunt.com
fi
```

```bash
# Cron: toutes les 5 minutes
*/5 * * * * /opt/bjhunt/scripts/health-check.sh
```

## Backup

### Automatise (quotidien)

```bash
# /opt/bjhunt/scripts/backup.sh
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/srv/bjhunt/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL
docker exec bjhunt-postgres pg_dump -Fc -U bjhunt_admin bjhunt \
    > "${BACKUP_DIR}/pg_${DATE}.dump"

# Redis
docker exec bjhunt-redis redis-cli BGSAVE
cp /srv/bjhunt/redis/dump.rdb "${BACKUP_DIR}/redis_${DATE}.rdb"

# Cleanup (garder 7 jours)
find "${BACKUP_DIR}" -name "*.dump" -mtime +7 -delete
find "${BACKUP_DIR}" -name "*.rdb" -mtime +7 -delete

echo "Backup complete: ${DATE}"
```

```bash
# Cron: tous les jours a 02:00 UTC
0 2 * * * /opt/bjhunt/scripts/backup.sh >> /var/log/bjhunt-backup.log 2>&1
```

### Snapshot VPS (hebdomadaire)

Via Hostinger MCP : `VPS_createSnapshotV1`
1 snapshot par semaine, retention automatique.

## Securite VPS

### Audit (dernier: 14 avril 2026) — PROPRE

- Aucune backdoor trouvee
- Seul user root (UID 0)
- Aucun crypto-miner
- Aucune connexion suspecte
- /tmp et /dev/shm propres
- SUID binaires tous normaux
- Monarx antimalware installe

### Hardening applique

- SSH par cle uniquement (password auth desactive)
- UFW default deny incoming
- Docker containers avec `no-new-privileges`
- Secrets dans .env, pas dans le code
- sslh pour masquer SSH derriere 443
- Mises a jour automatiques (unattended-upgrades)

### Mises a jour

```bash
# Mises a jour systeme
sudo apt update && sudo apt upgrade -y

# Mises a jour Docker images
cd /opt/bjhunt/app
docker compose pull
docker compose up -d
```
