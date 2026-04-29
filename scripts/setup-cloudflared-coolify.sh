#!/usr/bin/env bash
# BJHUNT V2.1 — install cloudflared as a tunnel-token-driven service on Hostinger
#
# Pre-requisite (one-shot, ~30s in browser):
#   1. Cloudflare dashboard → Zero Trust → Networks → Tunnels → Create Tunnel
#   2. Name it "bjhunt-coolify", choose Cloudflared, copy the install token
#   3. Add a Public Hostname:
#        Subdomain: coolify     Domain: bjhunt.com
#        Service:   http://localhost:8000
#   4. Set Access policy "BJHUNT internal — email match @bjhunt.com" (optional
#      but strongly recommended — this is the admin panel)
#
# Run on the VPS:
#   ssh bjhunt-vps "BJHUNT_CF_TUNNEL_TOKEN='eyJhI...' bash /root/setup-cloudflared-coolify.sh"

set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "must run as root" >&2; exit 1; fi
TOKEN="${BJHUNT_CF_TUNNEL_TOKEN:?BJHUNT_CF_TUNNEL_TOKEN env var required}"

# 1. Install cloudflared (Cloudflare apt repo).
if ! command -v cloudflared >/dev/null; then
  mkdir -p /usr/share/keyrings
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    -o /usr/share/keyrings/cloudflare-main.gpg
  echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" \
    > /etc/apt/sources.list.d/cloudflared.list
  apt-get update -y
  apt-get install -y cloudflared
fi
cloudflared --version

# 2. Stop+remove any prior install of the service.
if systemctl list-unit-files | grep -q '^cloudflared.service'; then
  systemctl stop cloudflared || true
  cloudflared service uninstall || true
fi

# 3. Install as a systemd service driven by the install token.
cloudflared service install "$TOKEN"
systemctl enable cloudflared
systemctl start cloudflared
systemctl status cloudflared --no-pager | head -10

cat <<EOF

==== cloudflared installed ====
- service: systemd unit cloudflared.service (auto-start)
- token: stored at /etc/cloudflared/...token (root only)
- routes: managed by Cloudflare dashboard (Public Hostnames)
- expected target: http://localhost:8000  →  https://coolify.bjhunt.com

Next: open https://coolify.bjhunt.com — should serve Coolify login over TLS,
no DNS record needed (the tunnel is the route).
EOF
