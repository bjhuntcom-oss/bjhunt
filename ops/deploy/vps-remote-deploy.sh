#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/bjhunt/app}"
STACK_ROOT="${STACK_ROOT:-/opt/bjhunt/stack}"
DATA_ROOT="${DATA_ROOT:-/srv/bjhunt}"

mkdir -p "$APP_ROOT" "$STACK_ROOT" "$DATA_ROOT/postgres" "$DATA_ROOT/runtimes"
rm -rf "$STACK_ROOT/runtime-proxy.nginx.conf"

install -m 0644 "$APP_ROOT/ops/vps/docker-compose.yml" "$STACK_ROOT/docker-compose.yml"
install -m 0644 "$APP_ROOT/ops/vps/Caddyfile" "$STACK_ROOT/Caddyfile"
install -m 0644 "$APP_ROOT/ops/vps/runtime-proxy.nginx.conf" "$STACK_ROOT/runtime-proxy.nginx.conf"

if [[ ! -f "$STACK_ROOT/.env" ]]; then
  cp "$APP_ROOT/ops/vps/.env.example" "$STACK_ROOT/.env"
  echo "Created $STACK_ROOT/.env from example. Fill secrets and rerun."
  exit 1
fi

set -a
. <(sed '1s/^\xEF\xBB\xBF//' "$STACK_ROOT/.env")
set +a

: "${BJHUNT_GATEWAY_IMAGE:=bjhunt-gateway:2026.4.2-bjhunt.1}"
: "${BJHUNT_GATEWAY_UPSTREAM_IMAGE:=ghcr.io/openclaw/openclaw:2026.4.2}"
: "${BJHUNT_GATEWAY_UPSTREAM_REF:=v2026.4.2}"
: "${BJHUNT_GATEWAY_UPSTREAM_COMMIT:=d74a12264aa5fb0598605e8f04e1864b7239ddd5}"

docker build \
  --build-arg OPENCLAW_UPSTREAM_IMAGE="$BJHUNT_GATEWAY_UPSTREAM_IMAGE" \
  --build-arg OPENCLAW_UPSTREAM_REF="$BJHUNT_GATEWAY_UPSTREAM_REF" \
  --build-arg OPENCLAW_UPSTREAM_COMMIT="$BJHUNT_GATEWAY_UPSTREAM_COMMIT" \
  -t "$BJHUNT_GATEWAY_IMAGE" \
  -f "$APP_ROOT/ops/runtime-image/Dockerfile" \
  "$APP_ROOT"

# Copy litellm config if present
if [[ -f "$APP_ROOT/ops/vps/litellm-config.yaml" ]]; then
  install -m 0644 "$APP_ROOT/ops/vps/litellm-config.yaml" "$STACK_ROOT/litellm-config.yaml"
fi

docker compose --project-directory "$STACK_ROOT" -f "$STACK_ROOT/docker-compose.yml" up -d --build --force-recreate postgres redis ollama backend runtime-proxy caddy

for _ in $(seq 1 30); do
  if [[ "$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' bjhunt-backend)" == "healthy" ]]; then
    break
  fi
  sleep 3
done

docker compose --project-directory "$STACK_ROOT" -f "$STACK_ROOT/docker-compose.yml" ps

for endpoint in \
  "https://api.bjhunt.com/api/health/live" \
  "https://api.bjhunt.com/api/health/ready"
do
  success=0
  for _ in $(seq 1 24); do
    if curl -fsS "$endpoint" >/dev/null; then
      success=1
      break
    fi
    sleep 5
  done

  if [[ "$success" -ne 1 ]]; then
    echo "Health check failed for $endpoint"
    exit 1
  fi
done

echo "BJHUNT backend stack deployed successfully."
