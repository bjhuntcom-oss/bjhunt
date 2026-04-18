# BJHUNT Observability Stack

Prometheus + Grafana + Loki + Promtail, deployed alongside the main app stack.

Per `docs/architecture/19-SCALING.md` Phase 1 ("robustifier") and
`docs/architecture/14-SECURITY.md` §9 Logging.

## When to enable

- Phase 1 (current): optional but recommended once daily traffic is non-trivial.
- Phase 2+ (50+ users): mandatory.

The stack lives in a separate compose overlay so it can be brought up / down
independently of the main BJHUNT services.

## RAM budget

| Service     | Limit | Typical |
|-------------|-------|---------|
| Prometheus  | 512MB | ~200 MB |
| Grafana     | 384MB | ~150 MB |
| Loki        | 384MB | ~200 MB |
| Promtail    | 128MB |  ~50 MB |
| **Total**   |       | **~600 MB** |

Fits comfortably alongside the main stack on the KVM 8 VPS.

## Bring it up

```bash
# On the VPS, set the Grafana admin password in .env first
echo "GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24)" >> /opt/bjhunt/app/.env

# Then bring up the overlay
cd /opt/bjhunt/app
docker compose \
  -f docker-compose.yml \
  -f ops/observability/docker-compose.observability.yml \
  up -d prometheus grafana loki promtail
```

## Access (no public exposure — local SSH tunnel only)

```bash
# From your laptop
ssh -L 3000:127.0.0.1:3000 -L 9090:127.0.0.1:9090 -L 3100:127.0.0.1:3100 bjhunt-vps

# Then in the browser
open http://localhost:3000   # Grafana (login admin / $GRAFANA_ADMIN_PASSWORD)
open http://localhost:9090   # Prometheus
open http://localhost:3100   # Loki API
```

## What's scraped

- `bjhunt-backend:3001/api/health/metrics` (when emitted — TODO W11)
- `bjhunt-langgraph:2024/metrics` (LangGraph exposes Prometheus by default)
- `bjhunt-litellm:4000/metrics` (LiteLLM exposes Prometheus when enabled)
- `bjhunt-caddy:2019/metrics` (admin endpoint)

## What's logged

Promtail tails every `bjhunt-*` container's stdout, parses JSON when present,
and ships to Loki with labels `container`, `service`, `stream`, `level`.

## Out of scope here

- Postgres / Redis exporters (add when needed)
- Alertmanager (add when baseline metrics are known and we have a Slack webhook)
- External Sentry / Uptime Kuma (separate self-hosted, run elsewhere)

## Cleanup

```bash
docker compose \
  -f docker-compose.yml \
  -f ops/observability/docker-compose.observability.yml \
  down
# Volumes are NOT removed by default — re-up will preserve dashboards + metrics history.
# To wipe: docker volume rm bjhunt-v2_prometheus_data bjhunt-v2_grafana_data bjhunt-v2_loki_data
```
