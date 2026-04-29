# BJHUNT V2.1 — wireguard mesh

Private overlay between Fly.io machines (CDG/AMS) and the Hostinger VPS,
keeping Postgres/Redis/LiteLLM off the public internet.

```
┌─────────────────┐     wg encrypted UDP/51820     ┌──────────────────┐
│ Fly machine cdg │  ◀──────────────────────────▶  │  Hostinger VPS   │
│   10.7.0.10     │                                │   10.7.0.1       │
│                 │                                │                  │
│ bjhunt-backend  │ ──── postgres 10.7.0.1:5432 ──▶│  pg / redis /    │
│                 │ ──── redis    10.7.0.1:6379 ──▶│  litellm         │
│                 │ ──── litellm  10.7.0.1:4000 ──▶│  (127.0.0.1 +    │
└─────────────────┘                                │   PREROUTING NAT)│
                                                   └──────────────────┘
```

## Mesh layout

| Inner IP    | Role                          |
|-------------|-------------------------------|
| 10.7.0.1    | Hostinger VPS (server)        |
| 10.7.0.10+  | Fly.io machines               |
| 10.7.0.200+ | Dev laptops (operators)       |

CIDR `10.7.0.0/24`. Listen port `51820/udp`.

## Setup (server)

Run the bootstrap script as root on the VPS:

```bash
scp scripts/setup-wireguard-hostinger.sh bjhunt-vps:/root/
scp scripts/add-wireguard-peer.sh        bjhunt-vps:/root/
ssh bjhunt-vps "bash /root/setup-wireguard-hostinger.sh"
```

The script:
- installs `wireguard wireguard-tools iptables-persistent`
- generates server keys at `/etc/wireguard/server-{private,public}.key`
- writes `/etc/wireguard/wg0.conf` with the right `PostUp` hooks (IPv4
  forward + iptables NAT for postgres/redis/litellm DNAT to 127.0.0.1)
- opens `51820/udp` on UFW
- enables + starts `wg-quick@wg0`

## Adding a peer (Fly.io machine, dev laptop, …)

```bash
ssh bjhunt-vps "bash /root/add-wireguard-peer.sh fly-cdg-1"
# → outputs the peer config; saved at /etc/wireguard/peers/fly-cdg-1.conf
ssh bjhunt-vps "cat /etc/wireguard/peers/fly-cdg-1.conf"
```

The peer config contains the full `[Interface]` + `[Peer]` block — paste
it into the peer's `wg0.conf` or pass it as a Fly secret.

## Fly.io integration

Each Fly machine needs the peer config loaded at boot. The simplest way:
push the base64-encoded config as a secret, then bring the tunnel up in
the entrypoint.

```bash
# 1. Generate a peer for this fleet
ssh bjhunt-vps "bash /root/add-wireguard-peer.sh fly-cdg-1" > peer.conf

# 2. Push as a secret
PEER_B64=$(base64 -w 0 peer.conf)
flyctl secrets set BJHUNT_WG_CONF="$PEER_B64" -a bjhunt-backend

# 3. Update the container entrypoint to bring up wg0
#    (see fly/entrypoint.sh below)
```

`fly/entrypoint.sh` pattern (added to bjhunt-backend Dockerfile in
Phase 1.9.e+):

```bash
#!/usr/bin/env bash
set -euo pipefail
if [[ -n "${BJHUNT_WG_CONF:-}" ]]; then
  apk add --no-cache wireguard-tools iptables  # if not in base image
  echo "$BJHUNT_WG_CONF" | base64 -d > /etc/wireguard/wg0.conf
  chmod 600 /etc/wireguard/wg0.conf
  wg-quick up wg0
fi
exec bun run src/index.ts
```

The backend env then points at the inner IPs:
```
POSTGRES_URL=postgresql://bjhunt:...@10.7.0.1:5432/bjhunt
REDIS_URL=redis://:...@10.7.0.1:6379
LITELLM_URL=http://10.7.0.1:4000
```

## Local dev

Operators on a laptop add themselves as a peer (`add-wireguard-peer.sh
ops-laptop-corentin`), copy the config to `~/.config/wg/wg0.conf`, run
`sudo wg-quick up wg0`, and the local backend can talk to the VPS via
the mesh IPs without SSH tunnels.

## Decommission a peer

```bash
ssh bjhunt-vps "wg set wg0 peer <PEER_PUBKEY> remove && \
                sed -i '/<PEER_PUBKEY_ESCAPED>/,/^$/d' /etc/wireguard/wg0.conf"
```

Phase 2 will swap to a small `revoke-wireguard-peer.sh`.

## Status / debug

```bash
ssh bjhunt-vps "wg show wg0"      # peers, last handshake, transfer counts
ssh bjhunt-vps "ip a show wg0"    # interface up/down
ssh bjhunt-vps "iptables -t nat -L PREROUTING -n -v | grep wg0"
```
