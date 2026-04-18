# 12 — Docker & Deployment

> Docker Compose pour le deploiement complet sur le VPS.
> Un seul `docker compose up -d` pour tout lancer.

## docker-compose.yml

```yaml
# docker-compose.yml (racine du repo)

services:

  # ── REVERSE PROXY ──────────────────────────────────────────
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "8443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - bjhunt-mgmt
    depends_on:
      backend:
        condition: service_healthy

  # ── BACKEND API ────────────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file: .env
    environment:
      - PORT=3001
      - DATABASE_URL=postgresql://bjhunt_app:${PG_PASSWORD}@postgres:5432/bjhunt
      - REDIS_URL=redis://redis:6379
      - LANGGRAPH_URL=http://langgraph:2024
      - DOCKER_SOCKET=/var/run/docker.sock
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - bjhunt-mgmt
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/api/health/live"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          memory: 256M
          cpus: "0.25"

  # ── LANGGRAPH SERVER (Decepticon Engine) ───────────────────
  langgraph:
    build:
      context: ./engine
      dockerfile: containers/langgraph/Dockerfile
    restart: unless-stopped
    env_file: .env
    environment:
      - LITELLM_BASE_URL=http://litellm:4000
      - NEO4J_URI=bolt://neo4j:7687
      - NEO4J_USER=neo4j
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
    networks:
      - bjhunt-mgmt
      - bjhunt-sandbox
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:2024/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "2.0"
        reservations:
          memory: 1G
          cpus: "0.5"

  # ── LITELLM PROXY ─────────────────────────────────────────
  litellm:
    image: ghcr.io/berriai/litellm:main-latest
    restart: unless-stopped
    env_file: .env
    volumes:
      - ./config/litellm.yaml:/app/config.yaml:ro
    command: ["--config", "/app/config.yaml", "--port", "4000"]
    networks:
      - bjhunt-mgmt
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 15s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  # ── POSTGRESQL ─────────────────────────────────────────────
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=bjhunt
      - POSTGRES_USER=bjhunt_admin
      - POSTGRES_PASSWORD=${PG_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backend/db/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    networks:
      - bjhunt-mgmt
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bjhunt_admin -d bjhunt"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"
        reservations:
          memory: 512M

  # ── REDIS ──────────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: ["redis-server", "--maxmemory", "512mb", "--maxmemory-policy", "allkeys-lru", "--save", "60", "100"]
    volumes:
      - redis_data:/data
    networks:
      - bjhunt-mgmt
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.5"

  # ── NEO4J ──────────────────────────────────────────────────
  neo4j:
    image: neo4j:5.24-community
    restart: unless-stopped
    environment:
      - NEO4J_AUTH=neo4j/${NEO4J_PASSWORD}
      - NEO4J_PLUGINS=["apoc"]
      - NEO4J_dbms_security_procedures_unrestricted=apoc.coll.*,apoc.load.*,apoc.graph.*
      - NEO4J_server_memory_heap_initial__size=512m
      - NEO4J_server_memory_heap_max__size=1g
    volumes:
      - neo4j_data:/data
    networks:
      - bjhunt-sandbox
    healthcheck:
      test: ["CMD-SHELL", "cypher-shell -u neo4j -p ${NEO4J_PASSWORD} 'RETURN 1'"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: "1.0"

# ── NETWORKS ───────────────────────────────────────────────
networks:
  bjhunt-mgmt:
    driver: bridge
    name: bjhunt-mgmt

  bjhunt-sandbox:
    driver: bridge
    name: bjhunt-sandbox
    internal: true  # Pas d'acces internet direct depuis sandbox
    # Note: les containers Kali sont crees dynamiquement par le backend
    # Ils sont attaches a ce reseau via l'API Docker

# ── VOLUMES ────────────────────────────────────────────────
volumes:
  postgres_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /srv/bjhunt/postgres
  redis_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /srv/bjhunt/redis
  neo4j_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /srv/bjhunt/neo4j
  caddy_data:
  caddy_config:
```

## Caddyfile

```caddyfile
# Caddyfile
{
    email admin@bjhunt.com
    acme_ca https://acme-v02.api.letsencrypt.org/directory
}

api.bjhunt.com {
    # Streaming routes — ZERO buffering
    @streaming path /stream/*
    handle @streaming {
        reverse_proxy backend:3001 {
            flush_interval -1
            transport http {
                compression off
            }
        }
    }

    # Health checks (pas de rate limit)
    handle /api/health/* {
        reverse_proxy backend:3001
    }

    # Toutes les autres routes API
    handle /* {
        reverse_proxy backend:3001
    }

    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
        -Server
    }

    log {
        output file /var/log/caddy/api.log {
            roll_size 100mb
            roll_keep 5
        }
    }
}
```

## Backend Dockerfile

```dockerfile
# backend/Dockerfile
FROM oven/bun:1-alpine AS builder

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile --production

COPY . .

FROM oven/bun:1-alpine

WORKDIR /app
COPY --from=builder /app .

# Curl pour healthcheck
RUN apk add --no-cache curl

USER bun
EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
```

## .env.example

```bash
# ============================================================
# BJHUNT Environment Variables
# Copy to .env and fill in the values
# ============================================================

# -- Database --
PG_PASSWORD=<generate: openssl rand -base64 32>

# -- Neo4j --
NEO4J_PASSWORD=<generate: openssl rand -base64 32>

# -- Auth --
SESSION_SECRET=<generate: openssl rand -hex 32>
PASSWORD_PEPPER=<generate: openssl rand -hex 16>
ENCRYPTION_KEY=<generate: openssl rand -hex 32>

# -- CORS --
CORS_ORIGINS=https://bjhunt.com,https://www.bjhunt.com

# -- LLM Providers --
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
OLLAMA_CLOUD_API_KEY=...

# -- Sandbox --
SANDBOX_IMAGE=bjhunt/kali-sandbox:latest
SANDBOX_MEMORY_LIMIT=2g
SANDBOX_CPU_LIMIT=2.0
WARM_POOL_SIZE=3
MAX_CONCURRENT_AUDITS=3

# -- Email --
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@bjhunt.com
SMTP_PASS=<app-password>

# -- Stripe --
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PRO=price_...

# -- Monitoring --
SENTRY_DSN=https://...@sentry.io/...
```

## Deploiement

### Premier deploiement

```bash
# 1. Se connecter au VPS
ssh bjhunt-vps

# 2. Cloner le repo
cd /opt/bjhunt
git clone https://github.com/bjhuntcom-oss/bjhunt.git app
cd app

# 3. Copier et remplir le .env
cp .env.example .env
nano .env  # Remplir les valeurs

# 4. Creer les repertoires de donnees
mkdir -p /srv/bjhunt/{postgres,redis,neo4j}

# 5. Builder et lancer
docker compose build
docker compose up -d

# 6. Verifier
docker compose ps
curl http://localhost:3001/api/health/ready

# 7. Builder l'image sandbox Kali
docker build -t bjhunt/kali-sandbox:latest -f engine/containers/sandbox/Dockerfile engine/
```

### Mise a jour

```bash
ssh bjhunt-vps
cd /opt/bjhunt/app

# Pull les changements
git pull origin main

# Rebuilder et redemarrer les services modifies
docker compose build backend langgraph
docker compose up -d --no-deps backend langgraph

# Verifier
docker compose ps
curl http://localhost:3001/api/health/ready
```

### Rollback

```bash
# Identifier le commit precedent
git log --oneline -5

# Revenir au commit precedent
git checkout <previous-commit>
docker compose build backend langgraph
docker compose up -d --no-deps backend langgraph
```

## Budget RAM reel

| Service | Limite | Reserve | RAM typique |
|---|---|---|---|
| caddy | - | - | 50 MB |
| backend | 512 MB | 256 MB | 200 MB |
| langgraph | 2 GB | 1 GB | 1.5 GB |
| litellm | 512 MB | - | 300 MB |
| postgres | 2 GB | 512 MB | 1.5 GB |
| redis | 512 MB | - | 200 MB |
| neo4j | 2 GB | - | 1.5 GB |
| **Infrastructure** | | | **~5.3 GB** |
| OS + Docker | | | ~1.5 GB |
| **Total fixe** | | | **~6.8 GB** |
| **Disponible sandboxes** | | | **~25 GB** |
| Sandbox x3 (2GB chacun) | | | 6 GB |
| **Total avec 3 sandboxes** | | | **~12.8 GB** |
| **Marge restante** | | | **~19 GB** |
