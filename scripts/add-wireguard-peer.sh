#!/usr/bin/env bash
# BJHUNT 4 MAX — add a wireguard peer (Fly.io machine, dev laptop, etc.)
#
# Usage on the VPS:
#   bash /root/add-wireguard-peer.sh fly-cdg-1
#
# Outputs a complete peer config to stdout (and to
# /etc/wireguard/peers/<name>.conf). Pipe to the peer or paste into the
# Fly.io machine via flyctl secrets.

set -euo pipefail

PEER_NAME="${1:?usage: add-wireguard-peer.sh <peer-name>}"
WG_DIR=/etc/wireguard
WG_IFACE=wg0
WG_PORT=51820
WG_NET_PREFIX=10.7.0
PEER_DIR="${WG_DIR}/peers"

mkdir -p "$PEER_DIR"
chmod 700 "$PEER_DIR"

if [[ ! -f "${WG_DIR}/server-public.key" ]]; then
  echo "server pubkey missing — run setup-wireguard-hostinger.sh first" >&2
  exit 1
fi

# Pick the next free /32 in 10.7.0.0/24 (skip .1 server, .255 broadcast).
USED_IPS=$(grep -hoE "AllowedIPs *= *${WG_NET_PREFIX}\.[0-9]+/32" "${WG_DIR}/${WG_IFACE}.conf" 2>/dev/null \
           | grep -oE '[0-9]+/32' | cut -d/ -f1 | sort -n)
NEXT_IP=2
for n in $USED_IPS; do
  if [[ $n -ge $NEXT_IP ]]; then NEXT_IP=$((n + 1)); fi
done
if [[ $NEXT_IP -ge 255 ]]; then echo "no free IP in mesh" >&2; exit 1; fi
PEER_IP="${WG_NET_PREFIX}.${NEXT_IP}"

# Generate keys.
umask 077
PEER_PRIV=$(wg genkey)
PEER_PUB=$(echo "$PEER_PRIV" | wg pubkey)
PEER_PSK=$(wg genpsk)

SERVER_PUB=$(cat "${WG_DIR}/server-public.key")
SERVER_HOST=$(curl -s4 ifconfig.me 2>/dev/null || echo '<vps-public-ip>')

# Append peer block to server config (live add via wg, then persist).
wg set "${WG_IFACE}" peer "${PEER_PUB}" preshared-key <(echo "$PEER_PSK") \
    allowed-ips "${PEER_IP}/32" persistent-keepalive 25
cat >> "${WG_DIR}/${WG_IFACE}.conf" <<EOF

# Peer ${PEER_NAME} added $(date -u +%FT%TZ)
[Peer]
PublicKey = ${PEER_PUB}
PresharedKey = ${PEER_PSK}
AllowedIPs = ${PEER_IP}/32
PersistentKeepalive = 25
EOF

# Write the peer-side config file.
PEER_CFG="${PEER_DIR}/${PEER_NAME}.conf"
cat > "${PEER_CFG}" <<EOF
# BJHUNT 4 MAX — peer config for ${PEER_NAME}
# Inner IP ${PEER_IP}, generated $(date -u +%FT%TZ)
[Interface]
Address = ${PEER_IP}/32
PrivateKey = ${PEER_PRIV}
DNS = 1.1.1.1

[Peer]
PublicKey = ${SERVER_PUB}
PresharedKey = ${PEER_PSK}
Endpoint = ${SERVER_HOST}:${WG_PORT}
AllowedIPs = 10.7.0.0/24
PersistentKeepalive = 25
EOF
chmod 600 "${PEER_CFG}"

cat <<EOF

==== peer ${PEER_NAME} added ====
  Inner IP        : ${PEER_IP}
  Endpoint        : ${SERVER_HOST}:${WG_PORT}
  Server pubkey   : ${SERVER_PUB}
  Peer pubkey     : ${PEER_PUB}
  Peer config     : ${PEER_CFG}

Postgres / Redis / LiteLLM are reachable from this peer via:
  10.7.0.1:5432   (postgres)
  10.7.0.1:6379   (redis)
  10.7.0.1:4000   (litellm)

For Fly.io, set the WG config as a secret and restart machines:
  flyctl secrets set BJHUNT_WG_CONF="\$(cat ${PEER_CFG} | base64 -w 0)" -a bjhunt-backend
  # then in your container entrypoint, decode + wg-quick up

EOF
