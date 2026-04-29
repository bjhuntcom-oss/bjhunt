# BJHUNT — Documentation

État au 2026-04-29.

## Index

### Architecture
- [00 — Vision & objectifs](architecture/00-VISION.md)
- [01 — Frontend (état actuel)](architecture/01-FRONTEND.md)
- [02 — Architecture backend (cible)](architecture/02-ARCHITECTURE.md)
- [03 — Streaming live SSE](architecture/03-STREAMING.md)
- [04 — Multi-tenancy & isolation](architecture/04-MULTI-TENANCY.md)
- [05 — Hosting & infrastructure](architecture/05-HOSTING.md)
- [06 — Sécurité](architecture/06-SECURITY.md)
- [07 — Catalogue agents IA](architecture/07-AGENTS-CATALOG.md)
- [08 — Déploiement & CI/CD](architecture/08-DEPLOYMENT.md)
- [09 — Guide dev local](architecture/09-DEV-GUIDE.md)
- [10 — Décisions d'architecture (ADR)](architecture/10-DECISIONS.md)
- [11 — Roadmap rebuild](architecture/11-ROADMAP.md)

## Statut produit

| Composant | Statut |
|---|---|
| Frontend marketing (Vercel) | ✅ En production |
| Formulaires beta + contact | ✅ Fonctionnels |
| Stack rebuild backend | ✅ Décidée (fork openclaude + Fly.io + E2B + Hetzner) |
| POC audit nmap streamé | ⏳ Phase 1 (4-6 sem) |
| Audit OWASP Top 10 + rapport | ⏳ Phase 2 |
| Beta publique 100 users | ⏳ Phase 3 |
| Stripe + Pro $200 | ⏳ Phase 4 |
| Modèle propriétaire RunPod | ⏳ Phase 6 (12-18 mois) |

## Stack arrêtée — résumé

**Frontend** : Next.js 16 sur Vercel (déjà déployé)

**Backend** :
- Fork **openclaude** (TS, modifié pour cybersec) → repo privé `bjhunt-engine`
- Wrapper SaaS **Hono + Bun** sur **Fly.io** (cdg + ams, Firecracker microVM)
- Auth **BetterAuth** (sessions DB-backed)
- Streaming **SSE typé** + Redis Streams + JWT ticket
- Multi-tenancy **Postgres RLS FORCE** + 1 sandbox par engagement

**Sandbox Kali** : **E2B.dev** managed (Firecracker, BYOC EU, $0.05/h)

**DBs** : **Hetzner Cloud Falkenstein DE** self-host (Postgres 17 + Redis 7 + Coolify)

**LLM** :
- Aujourd'hui : **Ollama Cloud** (GLM-5.1, DeepSeek, Kimi) via **LiteLLM proxy**
- Demain : **RunPod Serverless H100** modèle propriétaire fine-tuné

**Edge** : **Cloudflare** (DNS + WAF + Turnstile + R2 object storage)

## Contacts

- Dev : `bjhuntcom@gmail.com`
- Sécurité : voir [SECURITY.md](../SECURITY.md)
