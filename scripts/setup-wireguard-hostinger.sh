#!/usr/bin/env bash
# BJHUNT V2.1 — wireguard server setup on Hostinger VPS (10.7.0.0/24 mesh)
#
# Run as root on the VPS:
#   scp scripts/setup-wireguard-hostinger.sh bjhunt-vps:/root/
#   ssh bjhunt-vps 'bash /root/setup-wireguard-hostinger.sh'
#
# Idempotent: re-runs are safe.

set -euo pipefail

WG_NET=10.7.0.0/24
WG_SERVER_IP=10.7.0.1
WG_PORT=51820
WG_IFACE=wg0
WG_DIR=/etc/wireguard

if [[ $EUID -ne 0 ]]; then echo "must run as root" >&2; exit 1; fi

# 1. Install
if ! command -v wg >/dev/null; then
  apt-get update -y
  apt-get install -y wireguard wireguard-tools qrencode iptables-persistent
fi

mkdir -p "$WG_DIR"
chmod 700 "$WG_DIR"
cd "$WG_DIR"

# 2. Generate server keys (once)
if [[ ! -f server-private.key ]]; then
  umask 077
  wg genkey | tee server-private.key | wg pubkey > server-public.key
fi
SERVER_PRIV=$(cat server-private.key)
SERVER_PUB=$(cat server-public.key)

# 3. Server config
cat > "$WG_IFACE.conf" <<EOF
# BJHUNT V2.1 — Hostinger wireguard server
[Interface]
Address = ${WG_SERVER_IP}/24
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIV}
SaveConfig = false

# Forward traffic between wg0 and Docker bridges so Fly peers reach
# postgres/redis/litellm on bjhunt-net via the host-side NAT below.
PostUp   = sysctl -w net.ipv4.ip_forward=1
PostUp   = iptables -A FORWARD -i ${WG_IFACE} -j ACCEPT
PostUp   = iptables -A FORWARD -o ${WG_IFACE} -j ACCEPT
PostUp   = iptables -t nat -A POSTROUTING -s ${WG_NET} -o eth0 -j MASQUERADE
PostUp   = iptables -t nat -A PREROUTING -i ${WG_IFACE} -p tcp --dport 5432 -j DNAT --to 127.0.0.1:5432
PostUp   = iptables -t nat -A PREROUTING -i ${WG_IFACE} -p tcp --dport 6379 -j DNAT --to 127.0.0.1:6379
PostUp   = iptables -t nat -A PREROUTING -i ${WG_IFACE} -p tcp --dport 4000 -j DNAT --to 127.0.0.1:4000
PostUp   = iptables -t nat -A OUTPUT -s ${WG_NET} -d 127.0.0.1 -j RETURN
PostDown = iptables -D FORWARD -i ${WG_IFACE} -j ACCEPT
PostDown = iptables -D FORWARD -o ${WG_IFACE} -j ACCEPT
PostDown = iptables -t nat -D POSTROUTING -s ${WG_NET} -o eth0 -j MASQUERADE
PostDown = iptables -t nat -D PREROUTING -i ${WG_IFACE} -p tcp --dport 5432 -j DNAT --to 127.0.0.1:5432
PostDown = iptables -t nat -D PREROUTING -i ${WG_IFACE} -p tcp --dport 6379 -j DNAT --to 127.0.0.1:6379
PostDown = iptables -t nat -D PREROUTING -i ${WG_IFACE} -p tcp --dport 4000 -j DNAT --to 127.0.0.1:4000

# Peers added below by add-peer.sh (no peers initially).
EOF
chmod 600 "$WG_IFACE.conf"

# 4. UFW open 51820/udp
if command -v ufw >/dev/null; then
  ufw allow ${WG_PORT}/udp comment 'wireguard mesh' || true
fi

# 5. Enable + start
systemctl enable "wg-quick@${WG_IFACE}" >/dev/null 2>&1 || true
systemctl restart "wg-quick@${WG_IFACE}"

# 6. Output server pub for peer config
PUBLIC_HOST=$(curl -s4 ifconfig.me 2>/dev/null || echo '<vps-public-ip>')
cat <<EOF

==== BJHUNT wireguard server ready ====
  Public endpoint : ${PUBLIC_HOST}:${WG_PORT}
  Server pubkey   : ${SERVER_PUB}
  Mesh CIDR       : ${WG_NET}
  Server inner IP : ${WG_SERVER_IP}

To add a Fly.io peer (or a dev laptop), run:
  bash /root/add-wireguard-peer.sh <peer-name>

EOF
EOFLINE_STATUS=$?
exit $EOFLINE_STATUS
