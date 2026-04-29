# 05 — Hosting & infrastructure

> Décidé en Phase 2 (recherche du 2026-04-29).

## Vue d'ensemble

| Service | Plateforme | Pourquoi |
|---|---|---|
| Frontend marketing | **Vercel** (Hobby) | Déjà en prod, edge SSR Next.js, CDN global, deploy-from-git |
| Backend API + orchestrator | **Fly.io** (cdg + ams regions) | Firecracker microVM = isolation hardware-level non négociable pour exec exploits |
| Sandboxes Kali per-engagement | **Fly.io** (même cluster) | Spawn ephemeral microVMs par run, kill auto idle 30min |
| AI inference scale | **Modal** (US east) | Scale-to-zero H100/A100, pay-per-second, idéal spiky workload |
| Postgres + Neo4j + Redis | **Hetzner Cloud** Falkenstein DE | Souveraineté EU pure (pas de Cloud Act US), prix 5–10× moins cher que RDS |
| Object storage (reports, evidence, backups) | **Cloudflare R2** | Pas d'egress fees, S3-compatible, EU jurisdiction option |
| DNS + WAF + Turnstile + Bot detection | **Cloudflare** | Anti-DDoS edge, anti-bot avant d'atteindre Fly.io |
| Email | **Resend** | Transactional, simple, FR+EN templates |
| Anti-spam captcha | **hCaptcha** | Privacy-friendly vs reCAPTCHA, RGPD-OK |
| Analytics | **PostHog** EU cluster | Auto-hosted EU, opt-in cookie consent |
| Error tracking | **Sentry** (à activer Phase 4) | Source maps, breadcrumbs |
| CI/CD | **GitHub Actions** | Free pour public repo |

## Architecture infrastructure

```
                   INTERNET
                      │
                      ▼
           ┌──────────────────────┐
           │    Cloudflare        │
           │  - DNS               │
           │  - WAF + DDoS        │
           │  - Turnstile (bots)  │
           │  - R2 (objects)      │
           └──────────┬───────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌──────────────────┐        ┌──────────────────────┐
│  Vercel          │        │  Fly.io              │
│  bjhunt.com      │        │  api.bjhunt.com      │
│  Next.js 16      │        │  - backend Hono+Bun  │
│  - marketing     │        │    (2-50 microVMs)   │
│  - beta/contact  │        │  - orchestrator      │
│    forms         │        │    LangGraph Python  │
└──────────────────┘        │  - sandbox spawner   │
                            │    (ephemeral kalis) │
                            └──────┬───────────────┘
                                   │
                                   │ LLM calls (HTTPS)
                                   ▼
                           ┌──────────────────┐
                           │  Modal (US-east) │
                           │  H100/A100       │
                           │  scale-to-zero   │
                           │  - heavy reason. │
                           │  - future BJHUNT │
                           │    proprio model │
                           └──────────────────┘
                                   │
                                   │ wireguard private mesh
                                   ▼
                  ┌────────────────────────────────────┐
                  │  Hetzner Cloud Falkenstein DE      │
                  │  ax52 cluster (3 nodes)            │
                  │  - Postgres 17 (replicated)        │
                  │  - Neo4j 5.24 (1 DB / tenant)      │
                  │  - Redis 7 (sessions, streams)     │
                  │  - LiteLLM proxy                   │
                  │                                    │
                  │  Daily backup → Cloudflare R2      │
                  └────────────────────────────────────┘
```

## Pourquoi Fly.io pour le backend

### Firecracker microVM — non négociable
BJHUNT exécute des outils Kali réels (nmap, sqlmap exploitation, exploitation chains) dans des sandboxes par tenant. **Container partagé kernel = ÉLIMINATOIRE** pour ce use case (escape exploits, side-channel cross-tenant).

| Plateforme | Isolation | Verdict cyber offensif |
|---|---|---|
| Fly.io | Firecracker (full microVM) | ✅ |
| AWS Fargate | Firecracker depuis 2018 | ✅ (mais 3x prix) |
| Modal | gVisor + Firecracker | ✅ pour AI compute, OK aussi sandbox |
| GCP Cloud Run | gVisor seul | ❌ insuffisant |
| Coolify, Railway, Render | Containers shared kernel | ❌ disqualifié |
| vast.ai | Container, no audit | ❌ disqualifié |

### SSE long-lived
Audits durent 5–30min. Les SSE doivent rester ouvertes :

| Plateforme | Limite SSE | Verdict |
|---|---|---|
| Fly.io | Aucune (idle timeout configurable) | ✅ |
| Cloud Run | 60min req cap | ⚠️ acceptable mais limite |
| Vercel Pro | 300s | ❌ trop court pour audits |
| Lambda Function URL streaming | 15min | ❌ trop court |

### Coût
| Scale | Fly.io estimé | AWS Fargate estimé |
|---|---|---|
| 100 users | ~$200/mo | ~$400/mo |
| 1 000 users | ~$1.5k/mo | ~$3.5k/mo |
| 10 000 users | ~$12k/mo | ~$30k/mo |

## Pourquoi Hetzner pour les DBs

| Critère | Hetzner Falkenstein | AWS RDS Paris | Supabase / Neon |
|---|---|---|---|
| Souveraineté EU pure (pas Cloud Act) | ✅ | ❌ AWS US-owned | ❌ Neon = US |
| Prix Postgres 32GB RAM | ~$60/mo | ~$400/mo | ~$200/mo |
| Backup B2/R2 | DIY (cron pg_dump) | Built-in | Built-in |
| Neo4j Community possible | ✅ | ⚠️ EC2 only | ❌ |
| Latence Fly.io cdg → Hetzner Falkenstein | ~15-25ms | <5ms | ~30ms |

Trade-off ops : on doit gérer nous-même PG/Neo4j/Redis (cron backup, restores, upgrade). Acceptable pour <100k users, à reconsidérer ensuite.

## Plan bootstrap (jusqu'à ~1 000 users payants)

Pour économiser tant qu'on est <$10k MRR :

```
Hetzner CCX43 (16 vCPU, 64GB) à ~$100/mo
   └── Coolify (auto-deploys + reverse proxy)
        ├── Caddy
        ├── backend Hono+Bun (1-3 instances)
        ├── orchestrator Python (LangGraph)
        ├── postgres 17 (volume montée)
        ├── neo4j 5.24
        ├── redis 7
        ├── litellm proxy
        └── kata-containers runtime → 1 sandbox Kali per tenant actif

External:
   - Modal (AI inference scale-to-zero)
   - Cloudflare (DNS, R2 backups)
```

**Coût total mensuel bootstrap (1 000 users)** : ~$1.5k
- Hetzner CCX43 : $100
- Modal inference : $1 200
- Cloudflare Pro : $20
- Resend : $20
- Postmark backup : $10
- Misc (Sentry, PostHog) : $50

Migration vers Option A (Fly.io+Modal+Hetzner DB) quand le revenu le justifie. Lock-in Docker → migration ~2-3 semaines.

⚠️ **Single-region** = SLO 99.5% max. Si downtime critique (>1h), incident communiqué via status page.

## DNS + sous-domaines

| Domaine | Pointe vers | Rôle |
|---|---|---|
| `bjhunt.com` | Vercel | Marketing site |
| `www.bjhunt.com` | Vercel | Redirect → apex |
| `api.bjhunt.com` | Fly.io load balancer | Backend HTTP API |
| `chat.bjhunt.com` | Fly.io | SSE streaming endpoint (séparé pour timeouts longs) |
| `status.bjhunt.com` | Statuspage / Better Stack | Status page publique |
| `cdn.bjhunt.com` | Cloudflare R2 custom domain | Assets statiques, reports PDF |

## Backups & disaster recovery

| Quoi | Fréquence | Destination | Rétention |
|---|---|---|---|
| Postgres dump | Daily 02:00 UTC | R2 + secondary B2 | 30j daily, 12 weekly, 24 monthly |
| Neo4j dump | Daily 02:30 UTC | R2 | 30j |
| Redis | Pas de backup (cache) | — | — |
| Stream events Postgres | Inclus dans PG dump | R2 | 7j live, dans dump 30j |
| User-uploaded files (rapports) | Versionning R2 natif | R2 | Indéfini |

Recovery RTO target : **2h** (pull last dump, spin Hetzner instance, restore).
Recovery RPO target : **24h** (perte max 1 jour de données).

## Monitoring + alerting

Phase MVP :
- Fly.io built-in metrics → grafana.fly.io (gratuit)
- Better Stack uptime monitor sur api.bjhunt.com + bjhunt.com
- Sentry pour errors backend + frontend (DSN à provisionner)
- PagerDuty / Opsgenie pour on-call (Enterprise tier seulement)

Phase scale (>1 000 users) :
- OpenTelemetry → Grafana Cloud Pro
- Loki centralized logs
- Tempo distributed tracing (orchestrator → sandbox → DB)

## Coûts récap

| Phase | Users actifs | Coût mensuel | Per-user |
|---|---|---|---|
| Pre-launch | 0–10 (beta interne) | ~$50 (Vercel free + Hetzner test) | n/a |
| Bootstrap | 10–1000 | ~$1.5k | $1.50 |
| Scale | 1k–10k | ~$16-18k | $1.60 |
| Mature | 10k+ | $25-40k | $1.20 |

Marge brute target : **75%** (revenu Pro $200 → coût $50 ≈ 75% gross margin).
