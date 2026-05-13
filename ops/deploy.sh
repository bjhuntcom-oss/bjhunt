#!/bin/bash
# BJHUNT 4 MAX — Production Deploy Script
# Deploys ALL services via docker compose up -d

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/../"

# Load env vars from .env (fail if missing)
if [[ ! -f .env ]]; then
  echo "[bjhunt] ERROR: .env file not found at $(pwd)/.env"
  echo "[bjhunt] Copy .env.example to .env and fill in the secrets."
  exit 1
fi

export $(grep -v '^#' .env | xargs)

# Required env vars check
REQUIRED=(POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET_TICKET BETTERAUTH_SECRET BJHUNT_RELAY_SECRET)
for VAR in "${REQUIRED[@]}"; do
  if [ -z "${!VAR:-}" ]; then
    echo "[bjhunt] ERROR: $VAR is not set in .env"
    exit 1
  fi
done

echo "[bjhunt] === Deploying BJHUNT 4 MAX (mode: ${BJHUNT_ENGINE_MODE:-openclaude}) ==="

# 1. Build + start all services
docker compose down 2>/dev/null || true
docker compose build
docker compose up -d

# 2. Wait for backend health
echo "[bjhunt] Waiting for backend health..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/api/health > /dev/null 2>&1; then
    echo "[bjhunt] Backend healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[bjhunt] WARNING: Backend health check timed out after 30s"
    exit 1
  fi
  sleep 1
done

# 3. Probe orchestrator
echo "[bjhunt] Waiting for orchestrator health..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8002/health > /dev/null 2>&1; then
    echo "[bjhunt] Orchestrator healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[bjhunt] WARNING: Orchestrator health check timed out"
  fi
  sleep 1
done

# 4. Probe sandbox
echo "[bjhunt] Waiting for sandbox health..."
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8001/health > /dev/null 2>&1; then
    echo "[bjhunt] Sandbox healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[bjhunt] WARNING: Sandbox health check timed out"
  fi
  sleep 1
done

echo ""
echo "========================================"
echo "  BJHUNT 4 MAX — DEPLOYED"
echo "========================================"
echo "  Backend      : http://127.0.0.1:8080  (Cloudflare → https://api.bjhunt.com)"
echo "  Orchestrator : http://127.0.0.1:8002"
echo "  Sandbox      : http://127.0.0.1:8001"
echo "  Postgres     : 127.0.0.1:5432"
echo "  Redis        : 127.0.0.1:6379"
echo "  Litellm      : 127.0.0.1:4000"
echo ""
echo "  Engine mode : ${BJHUNT_ENGINE_MODE:-openclaude}"
echo "========================================"

# Tail logs if --tail flag is passed
if [[ "${1:-}" == "--tail" ]]; then
  echo "[bjhunt] Tailing backend logs..."
  docker compose logs -f backend
fi
