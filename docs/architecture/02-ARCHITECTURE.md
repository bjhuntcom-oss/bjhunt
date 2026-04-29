# 02 — Architecture cible (rebuild)

> Stack arrêtée le 2026-04-29 après recherche comparative A→Z neutre.

## Vue d'ensemble

```
┌──────────────────────────────────────────────────────────────────────┐
│                              INTERNET                                │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          Cloudflare                                  │
│   DNS · WAF · Turnstile · R2 (object storage) · CDN edge             │
└──────┬───────────────────────────────────────┬───────────────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────────┐         ┌─────────────────────────────────────────┐
│ Vercel (Hobby)  │         │ Fly.io (cdg + ams, Firecracker microVM) │
│ Next.js 16      │  fetch  │                                          │
│ marketing site  │ ──────▶ │ Backend Hono+Bun                         │
│ chat UI (post-  │   SSE   │  ├── auth (BetterAuth)                  │
│  rebuild)       │ ◀────── │  ├── /api/chat/prepare → JWT ticket     │
│                 │         │  ├── /api/chat/stream/:run (SSE)        │
└─────────────────┘         │  └── orchestrator                       │
                            │       │                                 │
                            │       ▼                                 │
                            │   ┌──────────────────────────────────┐  │
                            │   │ openclaude fork (modifié)        │  │
                            │   │  - prompts cybersec              │  │
                            │   │  - tools nmap/sqlmap/nuclei/...  │  │
                            │   │  - agent personas pentest        │  │
                            │   └──────────────────────────────────┘  │
                            └───────────┬─────────────────┬───────────┘
                                        │                 │
                                        │ E2B SDK         │ LLM via LiteLLM
                                        ▼                 ▼
                            ┌──────────────────┐  ┌──────────────────┐
                            │ E2B.dev          │  │ LiteLLM proxy    │
                            │ Firecracker      │  │   (Hetzner)      │
                            │ Kali sandboxes   │  └─────────┬────────┘
                            │ per-tenant TTL   │            │
                            │ 30min idle       │            ▼
                            │ BYOC EU          │  ┌──────────────────┐
                            └──────────────────┘  │ Ollama Cloud     │
                                                  │ (GLM-5.1, etc.)  │
                                                  │  ↓ futur          │
                                                  │ RunPod H100      │
                                                  │ propriétaire     │
                                                  └──────────────────┘
                                        │
                                        │ wireguard private mesh
                                        ▼
                  ┌────────────────────────────────────────┐
                  │  Hetzner Cloud Falkenstein (DE)        │
                  │  CCX43 — 16 vCPU / 64 GB / 2 To        │
                  │  ┌──────────────────────────────────┐  │
                  │  │ Postgres 17 (RLS FORCE)          │  │
                  │  │ - users, orgs, runs, messages    │  │
                  │  │ - stream_events (mirror SSE)     │  │
                  │  │ - findings, reports              │  │
                  │  │ - pgvector (skills RAG)          │  │
                  │  └──────────────────────────────────┘  │
                  │  ┌──────────────────────────────────┐  │
                  │  │ Redis 7                          │  │
                  │  │ - sessions, rate-limit           │  │
                  │  │ - Streams stream:{org}:{run}     │  │
                  │  │ - pub/sub cancel:{org}:{run}     │  │
                  │  └──────────────────────────────────┘  │
                  │  Daily backup → Cloudflare R2          │
                  └────────────────────────────────────────┘
```

## Composants

### 1. Frontend — Next.js 16 sur Vercel
Inchangé par rapport au repo actuel. Reste à ajouter (post-rebuild backend) :
- Page `/dashboard/chat` — interface ChatGPT-like
- Page `/dashboard/audits/[id]` — détail d'un audit
- Page `/dashboard/audits/[id]/report` — rapport généré
- Auth via cookie HttpOnly (déposé par BetterAuth backend)

Le frontend appelle le backend via :
- HTTP standard pour les endpoints CRUD (`/api/audits`, `/api/findings`, etc.)
- SSE pour le streaming chat (`/api/chat/stream/:runId?ticket=...`)

### 2. Backend — Hono + Bun sur Fly.io

**Stack runtime** :
- Bun 2.0+ (acquis par Anthropic fin 2025, runtime principal de Claude Code)
- Hono 4+ (router minimal, perf 200k req/s sur Bun)
- TypeScript strict
- Vercel AI SDK 5 pour les helpers de streaming SSE et formats de message
- Postgres.js (raw paramétré, pas d'ORM lourd)
- ioredis pour Redis Streams + pub/sub
- BetterAuth pour auth + sessions + 2FA

**Hosting** : Fly.io régions cdg + ams
- 2 instances minimum (HA)
- Auto-scale 2 → 50 instances selon charge
- Health check `/api/health/ready`
- Rolling deploy via flyctl

**Pourquoi Fly.io** :
- Firecracker microVM = isolation hardware-level
- SSE long-lived sans timeout artificiel (pas de cap 60-300s comme Vercel/Lambda/CF Workers)
- EU hardware (cdg + ams)
- Docker-based = lock-in faible
- DX top (flyctl, deploy <60s)

### 3. Orchestrator agent — fork openclaude modifié

**Source** : `Gitlawb/openclaude` (TypeScript ~99 %, multi-provider OpenAI-compat)

**Forké dans** : `bjhuntcom-oss/bjhunt-engine` (privé)

**Modifications obligatoires** :

1. **Prompts système** : du "coding agent" → "cybersec offensive agent"
   - Système prompt principal (BJHUNT Coordinator) : décompose la requête utilisateur en phases d'engagement, dispatch les sub-agents
   - Sub-agent prompts : Recon, Exploit, PostExploit, AD Operator, Cloud Hunter, etc. (cf. [07-AGENTS-CATALOG.md](07-AGENTS-CATALOG.md))
   - Reporter prompt : génère exec summary + findings structurés

2. **Tools** : remplacer les tools coding par des tools cybersec
   - Retirer : `git`, `npm`, `gradle`, `cargo`, IDE-specific
   - Ajouter : `nmap`, `nuclei`, `sqlmap`, `ffuf`, `gobuster`, `bloodhound-ce`, `kerbrute`, `impacket-suite`, etc. (cf. [07-AGENTS-CATALOG.md](07-AGENTS-CATALOG.md))
   - Wrap dans `runInSandbox(orgId, command, opts)` qui exécute via E2B SDK

3. **Provider routing via LiteLLM** :
   - L'agent appelle un endpoint `OPENAI_BASE_URL=https://litellm.bjhunt.internal/v1`
   - LiteLLM route vers Ollama Cloud (aujourd'hui) ou RunPod (demain) selon config

4. **Multi-tenant context injection** :
   - Chaque appel agent passe par `withOrg(orgId, fn)` qui set le RLS Postgres + scope les tools
   - Le sandbox spawné est tagué `org_id` (E2B template per-org)
   - Les secrets sont masqués via `SecretRegistry` per-tenant avant envoi LLM

5. **Streaming events typés** :
   - Le backend convertit les events internes openclaude (run_start, message_delta, tool_call, tool_result, etc.) en events SSE typés BJHUNT (cf. [03-STREAMING.md](03-STREAMING.md))

### 4. Sandbox — E2B.dev managed (Firecracker)

**Service** : E2B.dev avec BYOC (Bring Your Own Cloud) sur région EU
- Plan Pro $150/mo + $0.05/h sandbox base
- Firecracker microVM (isolation hardware-level)
- SDK TypeScript `@e2b/code-interpreter`
- Sessions max 24h (largement suffisant pour audits)
- Cold start ~150ms

**Image custom** : `bjhunt/sandbox:latest`
- Base : `kalilinux/kali-rolling` (digest pinné, signed cosign)
- Tools pré-installés : nmap, nuclei, sqlmap, ffuf, gobuster, impacket, kerbrute, bloodhound-ce, etc.
- User non-root (uid 1000)
- Read-only rootfs sauf `/tmp` (2 GB) et `/workspace` (10 GB)
- `cap_drop: ALL` sauf `NET_RAW` (pour `nmap -sS`)
- Resource limits : 2 vCPU, 4 GB RAM, 50 PIDs, 10 GB disk

**Lifecycle** :
- 1 sandbox par engagement actif (pas par run/audit) — TTL idle 30 min
- Spawn via `await e2b.create({ template: 'bjhunt-kali', metadata: { orgId } })`
- Cleanup automatique E2B + force kill si idle

**Migration future** : si scale dépasse $5k/mo de sandbox usage, migration vers **Daytona self-host** (OSS, Firecracker, sub-90 ms cold start) sur Hetzner. Effort migration estimé 1 sem (changer `e2b.create()` → `daytona.create()`).

### 5. Databases — Hetzner Cloud Falkenstein

**Hosting** : VPS CCX43 chez Hetzner (16 vCPU, 64 GB RAM, 2 TB SSD, ~€100/mo)
- Région : Falkenstein DE (souveraineté EU pure)
- Orchestration locale via **Coolify** (Apache 2.0, OSS, alternative Heroku auto-deploy)

**Postgres 17** :
- 1 instance principale + Postgres 17 PITR vers Cloudflare R2
- Extensions : `pgvector` (RAG sur skills + attack chains), `pg_stat_statements`
- RLS FORCE sur toutes les tables tenant (cf. [04-MULTI-TENANCY.md](04-MULTI-TENANCY.md))
- Backup : `pg_basebackup` quotidien 02:00 UTC → R2 + WAL streaming continu

**Redis 7** :
- Session store + rate limit + Streams + pub/sub
- AOF + snapshot
- Pas de backup critique (cache + ephemeral state)

**Pas de Neo4j** :
- Décision : `pgvector` + Postgres jsonb sur tables `attack_chain_nodes`, `attack_chain_edges` suffit pour le MVP
- Bénéfice : 1 DB technology de moins à opérer pour solo dev
- Migration future possible si besoin Cypher-style queries devient bloquant

### 6. LLM inference — LiteLLM + Ollama Cloud / RunPod

**LiteLLM proxy** : self-host sur le VPS Hetzner (Docker)
- Endpoint OpenAI-compat `https://litellm.bjhunt.internal/v1`
- Master key + virtual keys per-org (budget caps)
- Logs spend per-org dans Postgres
- Routing :
  - `bjhunt/coordinator` → Ollama Cloud `glm-5.1:cloud`
  - `bjhunt/recon` → Ollama Cloud `deepseek-v3.2:cloud`
  - `bjhunt/exploit` → Ollama Cloud `kimi-k2.5:cloud`
  - `bjhunt/reporter` → Anthropic Claude 4.7 (qualité writing)
  - Futur : `bjhunt/coordinator-v2` → RunPod self-hosted (modèle fine-tuné BJHUNT)

**Migration RunPod (Phase 6)** : déployer un endpoint vLLM sur RunPod Serverless H100, ajouter à LiteLLM config, A/B test progressif. Aucune refacto agent code.

### 7. Object storage — Cloudflare R2

**Buckets** :
- `bjhunt-reports` — rapports PDF générés (1 par audit)
- `bjhunt-evidence` — screenshots, captures réseau, dumps partiels
- `bjhunt-backups` — Postgres dumps quotidiens, Redis snapshots
- `bjhunt-assets` — assets statiques publics (logos, CSS, images marketing)

**Avantages** :
- Pas d'egress fees (vs S3)
- EU jurisdiction option (`auto` region avec data residency EU)
- S3-compatible API
- Versionning natif

### 8. Edge — Cloudflare devant

- DNS pour `bjhunt.com`, `api.bjhunt.com`, `chat.bjhunt.com`, `cdn.bjhunt.com`
- WAF (rules OWASP Top 10 + custom)
- Turnstile (anti-bot CAPTCHA-like, free)
- Rate limit edge (avant qu'un bot atteigne le backend)
- TLS 1.3 only, HSTS preload

## Domaines et routes

| Domaine | Pointe vers | Rôle |
|---|---|---|
| `bjhunt.com` (apex) | Vercel | Marketing site (Next.js) |
| `www.bjhunt.com` | Vercel | Redirect → apex |
| `api.bjhunt.com` | Fly.io load balancer | Backend HTTP API |
| `chat.bjhunt.com` | Fly.io | SSE streaming endpoint (sous-domaine séparé pour timeouts longs) |
| `litellm.bjhunt.internal` | wireguard mesh → Hetzner | Endpoint LiteLLM (privé) |
| `cdn.bjhunt.com` | R2 custom domain | Assets statiques |
| `status.bjhunt.com` | Better Stack | Status page publique |

## Modules backend (proposés)

```
backend/
├── src/
│   ├── server.ts                      # Hono entrypoint
│   ├── auth/                          # BetterAuth wrapper
│   ├── chat/
│   │   ├── prepare.ts                 # POST /api/chat/prepare
│   │   ├── stream.ts                  # GET /api/chat/stream/:runId (SSE)
│   │   ├── replay.ts                  # GET .../replay?cursor=
│   │   └── cancel.ts                  # POST .../cancel
│   ├── orchestrator/                  # ↓ tout depuis fork openclaude modifié
│   │   ├── agent.ts                   # Coordinator entry
│   │   ├── prompts/                   # System prompts par agent (cybersec)
│   │   ├── subagents/                 # Recon, Exploit, etc.
│   │   ├── tools/                     # nmap, sqlmap, nuclei, etc.
│   │   └── analyzer.ts                # SecurityAnalyzer (cmd → severity)
│   ├── sandbox/
│   │   ├── e2b-client.ts              # E2B SDK wrapper
│   │   └── kali-image.ts              # Image config (template_id)
│   ├── stream/
│   │   ├── publisher.ts               # XADD Redis + Postgres mirror
│   │   ├── subscriber.ts              # XREAD + cursor replay
│   │   └── events.ts                  # 12 typed event schemas (Zod)
│   ├── tenancy/
│   │   ├── with-org.ts                # withOrg(orgId, fn) RLS context
│   │   ├── quota.ts                   # Tier limits enforcement
│   │   └── secret-registry.ts         # Secrets masking per-tenant
│   ├── findings/
│   │   ├── ingest.ts                  # Tool output → Finding structured
│   │   ├── store.ts                   # Persist + dedupe
│   │   └── export.ts                  # PDF/JSON/SARIF rendering
│   ├── billing/                       # Stripe (Phase 4)
│   ├── admin/                         # Internal admin routes
│   └── lib/
│       ├── db.ts                      # Postgres clients (appSql + adminSql)
│       ├── redis.ts                   # Redis client
│       ├── litellm.ts                 # LiteLLM proxy client
│       ├── crypto.ts                  # AES-GCM secrets
│       └── errors.ts                  # AppError taxonomy
├── migrations/                        # node-pg-migrate
├── Dockerfile                         # Bun base, multi-stage
├── fly.toml                           # Fly.io config
└── package.json
```

## Ce qui n'est PAS dans le scope MVP

- ❌ Stripe billing (Phase 4)
- ❌ Modèle propriétaire RunPod (Phase 6, 12-18 mois)
- ❌ Mode interactive (`interrupt()` user approval) — ajouté en Phase 2
- ❌ Audit logs SOC2-grade — basique au MVP, formalisé Phase 5
- ❌ Multi-region failover (Phase 5 si besoin Enterprise)
- ❌ Mobile app — pas planifié

## Critères de validation MVP

| Métrique | Cible |
|---|---|
| Time-to-first-token (chat opening) | < 2 s p95 |
| Audit complet `nmap` 5 ports + `nuclei` info | < 90 s end-to-end |
| Sandbox cold start | < 500 ms |
| Resume après déconnexion réseau | 100% events restitués |
| Isolation cross-tenant (test E2E) | 0 fuite (audit logs vérifiés) |
| Cost per audit (LLM + sandbox) | < $0.30 |
| Disponibilité backend `/api/health` | > 99.5% |
