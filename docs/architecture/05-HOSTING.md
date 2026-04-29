# 05 — Hosting & infrastructure

> Stack hosting arrêtée. Choix justifiés en bas.

## Vue d'ensemble

| Service | Plateforme | Région | Pourquoi |
|---|---|---|---|
| Frontend marketing + chat UI | **Vercel** Hobby | Edge global | Déjà déployé, edge SSR Next.js, deploy-from-git |
| Backend API + orchestrator | **Fly.io** | cdg + ams | Firecracker microVM = isolation hardware-level + SSE long-lived sans timeout |
| Sandbox Kali per-engagement | **E2B.dev** managed BYOC | EU | Firecracker SaaS, 150ms cold start, $0.05/h base |
| Postgres + Redis + LiteLLM | **Hetzner Cloud** | Falkenstein DE | Souveraineté EU pure (pas Cloud Act US), prix 5–10× moins cher que RDS |
| Object storage | **Cloudflare R2** | EU jurisdiction | Pas d'egress fees, S3-compatible |
| DNS + WAF + Bot detection | **Cloudflare** | Edge | Anti-DDoS, Turnstile |
| Email transactional | **Resend** | EU | Beta + contact + audit reports |
| Anti-spam captcha | **hCaptcha** | EU | Privacy-friendly |
| LLM inference (aujourd'hui) | **Ollama Cloud** | US | OpenAI-compat, prix bas |
| LLM inference (demain) | **RunPod Serverless** | EU regions | H100 propriétaire BJHUNT |
| Error tracking | **Sentry** | EU | À activer Phase 2 |
| Status page | **Better Stack** | EU | À activer Phase 3 |

## Schéma topologique

```
                     INTERNET
                        │
                        ▼
              ┌──────────────────┐
              │   Cloudflare     │ DNS + WAF + Turnstile + R2 + CDN
              │   (Edge global)  │
              └─────┬────────┬───┘
                    │        │
        ┌───────────┘        └───────────┐
        ▼                                ▼
┌───────────────┐                ┌───────────────────────────┐
│ Vercel        │                │ Fly.io (cdg + ams)        │
│ Next.js       │  HTTPS+SSE     │ Backend Hono+Bun          │
│ - marketing   │ ─────────────▶ │ - 2-50 microVMs auto-scale│
│ - chat UI     │                │ - api.bjhunt.com          │
│ - dashboards  │                │ - chat.bjhunt.com (SSE)   │
└───────────────┘                └─────────┬─────────────────┘
                                           │
                          ┌────────────────┼─────────────────┐
                          │                │                 │
                          ▼                ▼                 ▼
                  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                  │ E2B.dev      │  │ LiteLLM      │  │ Hetzner      │
                  │ Firecracker  │  │ self-host    │  │ Cloud        │
                  │ Kali sandbox │  │ (Hetzner)    │  │ Falkenstein  │
                  │ per-engmt    │  │              │  │ ┌──────────┐ │
                  │ BYOC EU      │  │  ↓ routes    │  │ │ Postgres │ │
                  └──────────────┘  │              │  │ │ 17       │ │
                                    │              │  │ ├──────────┤ │
                                    │              │  │ │ Redis 7  │ │
                                    │              │  │ ├──────────┤ │
                                    │              │  │ │ LiteLLM  │ │
                                    │              │  │ │ proxy    │ │
                                    │              │  │ └──────────┘ │
                                    │              │  │              │
                                    │              │  │ Coolify mgmt │
                                    │              │  └──────────────┘
                                    ▼
                            ┌────────────────┐
                            │ Ollama Cloud   │ (US) — GLM-5.1, DeepSeek, Kimi
                            │  ↓ futur        │
                            │ RunPod H100    │ (EU) — modèle propriétaire
                            └────────────────┘
```

## Détail par couche

### Frontend — Vercel
- Plan **Hobby** (gratuit) au MVP, upgrade Pro $20/mo si dépassement bandwidth
- Auto-deploy sur push `main` (déjà configuré)
- Préviews automatiques sur PR
- Custom domains : `bjhunt.com` apex + `www` redirect
- Env vars (3 environnements) : RESEND, HCAPTCHA × 2

### Backend compute — Fly.io
**Pourquoi Fly.io plutôt qu'autre** :
- **Firecracker microVM** = isolation hardware-level (Cloud Run gVisor disqualifié pour Kali ; Lambda/Vercel timeout SSE bloquant)
- **EU hardware** : régions cdg (Paris) + ams (Amsterdam) — données client peuvent transiter en EU
- **Pas de timeout proxy** : SSE long-lived 30 min OK natif
- **Docker-based** : lock-in faible, migration possible vers k8s si besoin
- **DX top** : `flyctl deploy` < 60s, rolling update natif
- **Prix raisonnable** : ~€200/mo pour 2 instances perf-2x + autoscale, ~€1.5k/mo pour 1k users

**Configuration** :
- 2 instances minimum (HA)
- Auto-scale 2 → 50 selon charge HTTP request rate
- Health check `GET /api/health/ready` (200 OK requis avant cut-over)
- Rolling deploy : `flyctl deploy --image ghcr.io/.../backend:{sha}`
- Multi-region : cdg (primaire) + ams (failover)
- Env vars : `flyctl secrets set ...` (chiffrés au repos par Fly)

**Limite à connaître** : Fly GPU déprécie août 2026. **Pas un problème pour BJHUNT** car nous utilisons Modal/RunPod/Ollama Cloud pour l'inference, jamais Fly GPU.

### Sandbox — E2B.dev managed
**Pourquoi E2B plutôt qu'autre** :
- **Firecracker microVM** (idem Fly = isolation hardware)
- **SDK TS+Python** maintenu (`@e2b/code-interpreter`)
- **BYOC EU** : on peut héberger les sandboxes sur infra EU
- **Cold start ~150 ms** acceptable pour audit (pas comme un endpoint serverless temps-réel)
- **Pricing prévisible** : $150/mo Pro + $0.05/h base = budget facile à modéliser

**Configuration** :
- Template custom `bjhunt-kali` : Kali rolling + outils pré-installés (cf. [02-ARCHITECTURE.md](02-ARCHITECTURE.md) §sandbox)
- 1 sandbox par engagement actif (TTL idle 30 min)
- Resource limits côté E2B + côté image (cap_drop, user non-root, read-only rootfs)
- API privée via SDK + `E2B_API_KEY` injected secret Fly.io

**Migration future** : si scale > $5k/mo de sandbox → bascule **Daytona self-host** (OSS Apache, Firecracker, sub-90 ms cold) sur Hetzner. Effort migration ~1 semaine (changer `e2b.create()` → `daytona.create()`, héberger Daytona control plane).

### Databases — Hetzner Cloud Falkenstein
**Pourquoi Hetzner plutôt qu'AWS RDS / Supabase / Neon** :
- **Souveraineté EU pure** : Hetzner = société allemande sans Cloud Act exposure
- **Prix 5–10× moins cher** : CCX43 (16 vCPU / 64 GB / 2 TB SSD) ~€100/mo vs €400-600/mo AWS RDS db.r6g.xlarge équivalent
- **Latence Fly.io cdg → Hetzner Falkenstein** ~15-25 ms acceptable (Postgres queries asynchrones)
- **Pas de lock-in** : Postgres standard, peut migrer ailleurs en 2 jours

**Configuration VPS** :
- 1× CCX43 (16 vCPU, 64 GB RAM, 2 TB SSD) — ~€100/mo
- Ubuntu 24.04 LTS minimal
- Coolify (Apache 2.0, OSS) pour orchestration locale
- Wireguard mesh privé entre Fly.io et Hetzner (latence + sécurité)
- Backups : `pg_basebackup` quotidien + WAL streaming → R2

**Services co-hébergés (Coolify)** :
- Postgres 17 + pgvector (extensions)
- Redis 7
- LiteLLM proxy
- Caddy reverse proxy avec TLS auto
- Health check ping toutes les 5 min vers Better Stack

**Trade-off** : nous gérons backups/patches/upgrades nous-mêmes. Acceptable solo dev avec runbooks. Migration vers managed (Aiven Finlande, Neon EU) possible quand $$ permettent.

### Object storage — Cloudflare R2
**Pourquoi R2 plutôt qu'AWS S3 / Backblaze B2** :
- **Pas d'egress fees** = on peut servir reports PDF directement sans coût bandwidth
- **EU jurisdiction option** : `auto` region avec data residency EU
- **S3-compatible API** : `@aws-sdk/client-s3` standard fonctionne
- **Versionning natif** : protection contre suppression accidentelle
- **Custom domain** : `cdn.bjhunt.com`

**Buckets** :
- `bjhunt-reports` (PDF/SARIF générés)
- `bjhunt-evidence` (screenshots, captures réseau)
- `bjhunt-backups` (Postgres dumps + WAL)
- `bjhunt-assets` (assets statiques marketing)

### Edge — Cloudflare
- **DNS** pour tous les sous-domaines bjhunt.com
- **WAF** rules OWASP Top 10 + custom (block scrapers, etc.)
- **Turnstile** anti-bot (free, plus privacy-friendly que reCAPTCHA)
- **Rate limit edge** : avant qu'un bot atteigne le backend Fly.io
- **TLS 1.3 only**, **HSTS preload**

### LLM inference
**Aujourd'hui : Ollama Cloud** (via LiteLLM)
- Endpoint OpenAI-compat
- Modèles : GLM-5.1:cloud (primary), DeepSeek-v3.2:cloud, Kimi-k2.5:cloud
- Prix bas, latence acceptable
- Limite : US-host, mais SecretRegistry masque les secrets client avant envoi

**Demain : RunPod Serverless H100** (modèle propriétaire BJHUNT)
- Régions EU (Romania, Czech, Iceland)
- vLLM serving sur H100 80GB ($3.55-4.18/h)
- Routing via LiteLLM (zéro refacto agent code)
- Activation Phase 6 (12-18 mois)

## Domaines

| Domaine | Pointe vers | Rôle |
|---|---|---|
| `bjhunt.com` apex | Vercel | Marketing |
| `www.bjhunt.com` | Vercel | Redirect → apex |
| `api.bjhunt.com` | Fly.io LB | Backend HTTP API |
| `chat.bjhunt.com` | Fly.io | SSE streaming endpoint |
| `litellm.bjhunt.internal` | wireguard → Hetzner | LiteLLM proxy (privé) |
| `cdn.bjhunt.com` | R2 custom domain | Assets statiques |
| `status.bjhunt.com` | Better Stack | Status page publique |

## Coûts estimés

| Phase | Users actifs | Coût mensuel | Per-user |
|---|---|---|---|
| Pre-launch | 0–10 (beta) | ~€80 (Vercel free + Hetzner CCX13 + E2B Hobby) | n/a |
| Bootstrap | 10–500 | ~€450 | €0.90 |
| Scale | 500–5 000 | ~€2 500 | €0.50 |
| Mature | 5 000–50 000 | ~€18 000 | €0.36 |

**Détail Bootstrap (~500 users actifs)** :
- Vercel Pro : €20
- Fly.io perf-2x × 2 instances : €100
- E2B Pro $150/mo + ~€100 sandbox usage : €230
- Hetzner CCX43 + R2 backup egress : €110
- Cloudflare Pro + Resend : €30
- Ollama Cloud LLM tokens : €100 (variable selon usage)
- Sentry + Better Stack : €30
- **Total : ~€620**, target marge brute Pro $200/mo = **75 %**

## Backups & disaster recovery

| Quoi | Fréquence | Destination | Rétention |
|---|---|---|---|
| Postgres `pg_basebackup` | Daily 02:00 UTC | R2 + secondary B2 | 30j daily, 12 weekly, 24 monthly |
| Postgres WAL | Continu (streaming) | R2 | 7j |
| Redis | Pas de backup (cache + ephemeral) | — | — |
| Stream events | Inclus dans PG dump | R2 | 7j live, 30j dump |
| User-uploaded files | Versionning R2 natif | R2 | Indéfini |
| E2B sandbox snapshots | Final-of-engagement | R2 | 90j |

**Recovery target** : RTO 2h (pull last dump, spin Hetzner instance, restore), RPO 24h.

## Monitoring + alerting (Phase 2)

- **Sentry** errors backend + frontend
- **Better Stack** uptime monitor 1min sur `/api/health/ready` + `bjhunt.com` → SMS founder
- **Fly.io built-in** metrics → grafana.fly.io (gratuit)
- **PostHog** funnel marketing + product analytics

Phase scale (>5 k users) :
- OpenTelemetry → Grafana Cloud Pro
- Loki centralized logs
- Tempo distributed tracing (orchestrator → sandbox → DB)
