#!/usr/bin/env bash
# health-check.sh — Periodic health probe + alerting on failure
#
# Run every 5 minutes via cron. Sends an email if any service is unhealthy
# 3 consecutive checks in a row.
#
# Required env vars:
#   ALERT_EMAIL — destination email for alerts (sendmail must be configured)
#
# Install as cron:
#   echo "*/5 * * * * root ALERT_EMAIL=ops@bjhunt.com /opt/bjhunt/app/ops/scripts/health-check.sh >> /var/log/bjhunt-health.log 2>&1" | sudo tee /etc/cron.d/bjhunt-health

set -uo pipefail

# ALERT_EMAIL is optional — if unset, sustained failures are logged via
# `logger` (journal/syslog) instead of mailed. Useful before sendmail is
# configured on the host.
ALERT_EMAIL="${ALERT_EMAIL:-}"

STATE_DIR=/var/lib/bjhunt-health
mkdir -p "$STATE_DIR"

TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
FAILURES=()

check() {
    local name=$1
    local url=$2
    local fail_file="$STATE_DIR/${name}.fail-count"
    local current
    current=$(cat "$fail_file" 2>/dev/null || echo 0)

    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
        # Reset on success
        echo 0 > "$fail_file"
        echo "[$TIMESTAMP] OK: $name ($url)"
    else
        local new=$((current + 1))
        echo "$new" > "$fail_file"
        echo "[$TIMESTAMP] FAIL ($new/3): $name ($url)"
        if [[ $new -ge 3 ]]; then
            FAILURES+=("$name @ $url")
        fi
    fi
}

check "backend-live"     "http://localhost:3001/api/health/live"
check "backend-ready"    "http://localhost:3001/api/health/ready"
check "langgraph"        "http://localhost:2024/ok"
check "litellm"          "http://localhost:4000/health/readiness"
check "caddy-internal"   "http://localhost:80/health"
check "https-edge"       "https://api.bjhunt.com/api/health/live"

if [[ ${#FAILURES[@]} -gt 0 ]]; then
    BODY="BJHUNT health check failed at $TIMESTAMP

Sustained failures (>=3 consecutive checks):
$(printf '  - %s\n' "${FAILURES[@]}")

Check 'docker compose ps' and 'journalctl -u docker' on VPS 82.25.117.79.
"
    if [ -n "$ALERT_EMAIL" ] && command -v mail >/dev/null 2>&1; then
        echo "$BODY" | mail -s "[BJHUNT ALERT] Health check failure ($TIMESTAMP)" "$ALERT_EMAIL"
        logger -t bjhunt-health -p user.err "Alert sent (email): ${#FAILURES[@]} sustained failures"
    else
        # Fallback — still log so /var/log/syslog and the cron log show it.
        logger -t bjhunt-health -p user.err "Sustained failures (no email): ${FAILURES[*]}"
        printf '%s\n' "$BODY" >&2
    fi
fi

exit 0
