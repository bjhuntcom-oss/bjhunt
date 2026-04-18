#!/usr/bin/env bash
# dev-bootstrap.sh — One-command local dev setup.
#
# Per docs/architecture/20-DEV-GUIDE.md.
# Detects what's missing, installs / generates it, leaves the contributor
# with a runnable local environment in under 2 minutes (assuming network).
#
# Idempotent — safe to re-run.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

c_red() { printf '\033[31m%s\033[0m\n' "$*"; }
c_yel() { printf '\033[33m%s\033[0m\n' "$*"; }
c_grn() { printf '\033[32m%s\033[0m\n' "$*"; }
c_blu() { printf '\033[34m%s\033[0m\n' "$*"; }

check() {
    local cmd=$1 ; local hint=$2
    if ! command -v "$cmd" >/dev/null 2>&1; then
        c_red "MISSING: $cmd"
        echo "  → $hint"
        return 1
    fi
    c_grn "OK     : $cmd ($("$cmd" --version 2>&1 | head -1))"
}

echo ""
c_blu "═══════════════════════════════════════════════════════════════"
c_blu " BJHUNT — local dev bootstrap"
c_blu "═══════════════════════════════════════════════════════════════"
echo ""

c_blu "Phase 1 — Prerequisite check"

missing=0
check node   "Install Node 22+ : https://nodejs.org/"           || missing=$((missing+1))
check bun    "Install Bun     : curl -fsSL https://bun.sh/install | bash" || missing=$((missing+1))
check docker "Install Docker  : https://docs.docker.com/get-docker/"      || missing=$((missing+1))
check git    "Install Git"                                       || missing=$((missing+1))

if [[ $missing -gt 0 ]]; then
    c_red "Install the missing tools above and re-run."
    exit 1
fi

# Optional but recommended
if ! command -v uv >/dev/null 2>&1; then
    c_yel "OPT    : uv not installed (needed for engine/Python work)"
    c_yel "         Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
fi

echo ""
c_blu "Phase 2 — .env files"

if [[ ! -f .env.local ]]; then
    if [[ -f .env.example ]]; then
        cp .env.example .env.local
        c_grn "Created .env.local from .env.example"
        c_yel "  → Edit .env.local to set NEXT_PUBLIC_BACKEND_URL=http://localhost:3001"
    else
        c_yel "Skipped .env.local (no template)"
    fi
else
    c_grn ".env.local already present"
fi

if [[ ! -f backend/.env ]]; then
    if [[ -f backend/.env.example ]]; then
        cp backend/.env.example backend/.env
        c_grn "Created backend/.env from backend/.env.example"
        # Generate dev-only secrets so the backend boots
        SESSION_SECRET=$(openssl rand -hex 32)
        BJHUNT_API_SECRET=$(openssl rand -hex 32)
        ENCRYPTION_KEY=$(openssl rand -hex 32)
        POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=/+')
        # Use a portable sed (works on both BSD and GNU)
        if [[ "$(uname)" == "Darwin" ]]; then sed_inplace=(-i ''); else sed_inplace=(-i); fi
        sed "${sed_inplace[@]}" \
            -e "s|^SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" \
            -e "s|^BJHUNT_API_SECRET=.*|BJHUNT_API_SECRET=$BJHUNT_API_SECRET|" \
            -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$ENCRYPTION_KEY|" \
            -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" \
            backend/.env
        c_yel "  → Generated dev secrets in backend/.env (dev only — never use these in prod)"
    else
        c_red "Missing backend/.env.example — cannot bootstrap backend"
        exit 1
    fi
else
    c_grn "backend/.env already present"
fi

echo ""
c_blu "Phase 3 — Install dependencies"
bun install
c_grn "Frontend deps installed"
( cd backend && bun install )
c_grn "Backend deps installed"

if command -v uv >/dev/null 2>&1; then
    ( cd engine && uv sync 2>/dev/null || c_yel "Engine sync skipped (network or uv.lock missing)" )
fi

echo ""
c_blu "Phase 4 — Start the local Docker stack (Postgres + Redis + Neo4j only)"
echo "Skipping engine/sandbox/litellm in dev — start them manually if needed."

# Pull only the lightweight services for dev. Full prod stack is via docker-compose.yml.
docker run -d --name bjhunt-dev-postgres \
    -e POSTGRES_DB=bjhunt -e POSTGRES_USER=bjhunt \
    -e POSTGRES_PASSWORD="$(grep ^POSTGRES_PASSWORD backend/.env | cut -d= -f2-)" \
    -p 127.0.0.1:5432:5432 postgres:17-alpine 2>/dev/null \
    && c_grn "Started bjhunt-dev-postgres" \
    || c_yel "bjhunt-dev-postgres already running (or port 5432 busy)"

docker run -d --name bjhunt-dev-redis \
    -p 127.0.0.1:6379:6379 redis:7-alpine 2>/dev/null \
    && c_grn "Started bjhunt-dev-redis" \
    || c_yel "bjhunt-dev-redis already running (or port 6379 busy)"

echo ""
c_blu "Phase 5 — Apply DB schema"
sleep 3
PGPASSWORD="$(grep ^POSTGRES_PASSWORD backend/.env | cut -d= -f2-)" \
    psql -h localhost -U bjhunt -d bjhunt -f backend/src/db/schema.sql 2>&1 | tail -3 \
    || c_yel "Schema apply failed (psql missing? try docker exec bjhunt-dev-postgres psql ...)"

echo ""
c_blu "═══════════════════════════════════════════════════════════════"
c_grn " READY!"
c_blu "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next:"
echo "  Terminal 1 — frontend  : bun run dev               # http://localhost:3000"
echo "  Terminal 2 — backend   : cd backend && bun run dev # http://localhost:3001"
echo "  Terminal 3 — engine    : cd engine && uv run langgraph dev"
echo ""
echo "Stop dev DB containers when done:"
echo "  docker rm -f bjhunt-dev-postgres bjhunt-dev-redis"
