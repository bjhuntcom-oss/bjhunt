# BJHUNT — multi-repo (état 2026-04-29 — Phase 1.13 livrée)

Ce repo (`bjhuntcom-oss/bjhunt`, public) est le **frontend marketing** + un POC `/labs/audit` de consommation SSE. Le projet BJHUNT V2.1 vit en réalité sur **5 repos GitHub** working ensemble.

## 5 repos — vue d'ensemble

| Repo | Visibilité | Working copy | Rôle |
|---|---|---|---|
| `bjhuntcom-oss/bjhunt` | **public** | `D:\bjhunt-v2\` | Frontend marketing Next.js 16 (`bjhunt.com` Vercel) + `/labs/audit` POC SSE consumer |
| `bjhuntcom-oss/bjhunt-legacy-engine` | privé | — | Archive Decepticon Python (read-only, conservée par subtree split history-preserving) |
| `bjhuntcom-oss/bjhunt-engine` | privé | `D:\bjhunt-engine\` | **Fork openclaude** (Gitlawb/openclaude, MIT, TS/Bun) + pack BJHUNT V2.1 sur branche `feat/bjhunt-v2.1-pack` (PR #1 draft) |
| `bjhuntcom-oss/bjhunt-backend` | privé | `D:\bjhunt-backend\` | Thin SaaS layer Hono+Bun (auth, RLS, SSE, sandbox spawn, catalogues) |
| `bjhuntcom-oss/bjhunt-app` | privé | `D:\bjhunt-app\` | Dashboard `app.bjhunt.com` (Next.js 16, BetterAuth client, assistant-ui chat) |

## État après Phase 1.13 (2026-04-29)

Phases livrées le **2026-04-29** (1 journée intensive) :

- **0** — Cleanup total : legacy backend Hono+Bun + engine Decepticon Python purgés. Engine archivé en privé. VPS Hostinger purgé (12 containers + 11 volumes + crons → 0).
- **1.1** — Credentials E2B / Fly.io / Cloudflare (R2 + 4 buckets `bjhunt-{reports,evidence,backups,assets}`). NS bjhunt.com migrés Vercel→Cloudflare.
- **1.2** — VPS Hostinger provisionné : Coolify v4 + Postgres 17 + pgvector 0.8.2 + Redis 7 + LiteLLM 1.82.3 (ports 127.0.0.1).
- **1.3** — Ollama Cloud branché sur LiteLLM (4 modèles : `glm-5.1` défaut, `qwen3-coder`, `kimi-k2-thinking`, `deepseek-v3.2`).
- **1.4** — **Fork openclaude** privé `bjhunt-engine` + pack BJHUNT V2.1 (38 personas, 14 templates Typst, IDENTITY.md, 12 SSE events, 3 hooks, Dream Diary, Checklist anti-oublis).
- **1.5** — Runtime layer : injection identité gated par `BJHUNT_MODE`, hooks `.cjs` (scope-guard fail-closed / evidence-capture sha256+redact / redact-secrets 15 patterns), build/install/sign scripts PKCS#7, tests anti-leak.
- **1.6** — Wireguard mesh actif sur Hostinger (`82.25.117.79:51820/udp`, pubkey `f92v+Q2cnXjq3WwPTxATnBxppU0xpCpGx3cNDvJn9hk=`, CIDR `10.7.0.0/24`, NAT PREROUTING DNAT 5432/6379/4000).
- **1.7** — Cloudflare Tunnel devant Coolify (token-driven script + 30s manuel browser).
- **1.8** — `bjhunt-backend` posé : 9 tables RLS FORCE, JWT tickets 5min, `withTenant`, SSE Redis Streams MAXLEN ~10000 + mirror PG + replay Last-Event-ID.
- **1.9** — E2B client + SecretRegistry HKDF, engine bridge long-poll, routes engagements CRUD + runs spawn/kill, image `bjhunt-kali` (Dockerfile + event-relay.cjs + run-engagement.sh).
- **1.9.e** — BetterAuth réel : email+pwd, organization, 2FA TOTP, passkey WebAuthn, sessions 7j cookie `bjhunt_session`.
- **1.10** — POC frontend `/labs/audit` SSE consumer dans ce repo.
- **1.11** — Smoke E2E + mode tri-backend `BJHUNT_E2B_MODE=e2b|docker|mock`.
- **1.12** — Squelette `bjhunt-app` (Next.js 16) : `/`, `/login`, `/engagements`, `/engagements/[id]/runs/[runId]/live`.
- **1.13** — **Catalogues backend + chat assistant-ui full-screen** :
  - Backend : `GET /api/catalog/{agents,compliances,models}`, `POST /api/runs/:id/messages` → relay E2B `inject_message`, engagement schema étendu (`agents_enabled`, `default_model`, `agent_models`, `asvs_target_level`).
  - Frontend : **assistant-ui** (`@assistant-ui/react`) avec `ExternalStoreRuntime` mappant les 12 SSE events en `ThreadMessageLike[]`, page `/chat/[runId]` plein écran 3 colonnes, formulaire `/engagements/new` exposant **tous** les réglages backend (scope, compliances groupées, agents multi-select × 12 catégories avec override modèle par agent, ASVS conditionnel), page `/engagements/[id]` detail + edit inline.

## Stack frontend de **ce repo** (`bjhunt-v2`)

- Next.js 16 (App Router, RSC, Turbopack), React 19, TypeScript strict, Tailwind 4
- next-intl (FR/EN), Resend (formulaires beta+contact), hCaptcha, Upstash Redis (rate-limit), PostHog
- Page `/labs/audit` non-linkée publique : EventSource consumer pour tester la SSE du backend (URL/runId/ticket en input, render des 12 events)

## VPS Hostinger `82.25.117.79`

- KVM 8 (8 vCPU / 32 GB / 400 GB NVMe / Ubuntu 24.04 / EU Lithuania) — déjà acheté, réutilisé Phase 1-2
- Containers up : `coolify`, `coolify-db`, `coolify-redis`, `coolify-realtime`, `bjhunt-postgres`, `bjhunt-redis`, `bjhunt-litellm`
- Wireguard `wg0` actif sur `:51820/udp`, server inner `10.7.0.1`
- SSH : port 22, clé `bjhunt-vps-2026-04-29` (ed25519), alias `bjhunt-vps`, key locale `C:\Users\CODEUR\.ssh\bjhunt_vps`
- UFW : 22/80/443 ouverts ; LiteLLM/Postgres/Redis liés à `127.0.0.1` (accessibles via tunnel SSH `-L 4000 -L 5432 -L 6379` ou via wireguard mesh)

## Vercel envs (frontend marketing)

- `RESEND_API_KEY`, `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`
- (`NEXT_PUBLIC_API_URL` retiré post-purge — backend SaaS sur app.bjhunt.com séparé)

## GitHub

- 5 repos `bjhuntcom-oss/*` (cf. tableau plus haut). Tous sur branche `main` directe sauf `bjhunt-engine` qui a `feat/bjhunt-v2.1-pack` (PR #1 draft).
- Workflows : `bjhunt` (`ci.yml` lint+build+gitleaks frontend) ; `bjhunt-backend`/`bjhunt-app`/`bjhunt-engine` à wirer Phase 2.
- gh CLI authentifiée (`bjhuntcom-oss`)

## Outils & accès

- Vercel CLI auth (team `bjhunts-projects`) — `vercel env ls`, `vercel deploy`
- gh CLI auth — `gh repo view`, `gh pr create`, etc.
- SSH VPS via alias `bjhunt-vps`
- Playwright MCP autorisé (Hostinger panel, Cloudflare Zero Trust)
- **Pas d'usage des MCP Vercel/GitHub** — uniquement CLI locales
- `bun` non installé localement (typecheck via `npx -p typescript tsc --noEmit -p tsconfig.json` quand node_modules présent)

## Cheminement E2E local

1. SSH tunnel : `ssh bjhunt-vps -L 5432:127.0.0.1:5432 -L 6379:127.0.0.1:6379 -L 4000:127.0.0.1:4000 -N`
2. `docker build` de l'image `bjhunt-kali` depuis `D:\bjhunt-engine\` (ou laisser `BJHUNT_E2B_MODE=mock` pour smoke)
3. Backend `D:\bjhunt-backend\` : `bun run dev` (port 8080)
4. App `D:\bjhunt-app\` : `npm run dev` (port 3000) — proxy `/api/*` vers `localhost:8080` via `next.config.ts` rewrite
5. Smoke : `bash tests/smoke/run-e2e.sh` (5 étapes, depuis `D:\bjhunt-backend\`)

## Reste à faire (Phase 1.13.b → 2)

**1.13.b (court terme)** :
- `npm install` dans `D:\bjhunt-app\` pour `@assistant-ui/react ^0.10` + peer deps. Vérifier l'API exacte de `ThreadPrimitive`/`MessagePrimitive`/`ComposerPrimitive` car version 0.10 = branche stable jan 2026 (l'API a pu bouger).
- Brancher `BJHUNT_AGENTS_ENABLED` / `BJHUNT_AGENT_MODELS` dans `bjhunt-engine/bjhunt/docker/run-engagement.sh` (filtrer le `loadAgentsDir.ts` + driver `agentRouting`).
- Ajouter `GET /api/engagements/:id/runs` côté backend pour lister l'historique sur la page detail.

**1.14+ / Phase 2 (déploiement réel)** :
- Déploiement Fly.io (`flyctl deploy bjhunt-backend`) avec wireguard peer Fly→Hostinger
- Déploiement Vercel (ou CF Pages) pour `app.bjhunt.com`
- Registration template E2B `bjhunt-kali`
- OpenTelemetry → Grafana Cloud, Sentry errors backend+frontend
- CI E2E (GitHub Actions sur PR `bjhunt-backend` + `bjhunt-app`)
- Logpush Cloudflare → R2 (audit trail SOC 2)
- Real signing cert EV (DigiCert) pour PKCS#7 PDF
- Egress filtering iptables dans `bjhunt-kali`
- Stripe billing integration
- Status page Cloudflare Pages

## Règles de développement

- Code sécurisé : pas d'unsafe-eval, CSP strict, Resend/hCaptcha au boundary, secrets jamais en dur
- Inputs validés via Zod, sanitize HTML via `lib/sanitize.ts`
- Rate-limit toutes routes API publiques (`lib/rate-limit.ts`)
- TypeScript strict (`noUncheckedIndexedAccess` côté backend)
- Préférer Server Components Next.js par défaut
- **Identité injectée** : tout agent BJHUNT V2.1 réplique "BJHUNT V2.1, le moteur d'audit offensif de BJHUNT" — jamais Claude/GPT/GLM/Ollama. Gardé par `BJHUNT_MODE=true` env var dans le sandbox.
- **Cibles pré-autorisées** : tout ce qui passe dans `engagement.scope.in_scope` est présumé autorisé (mandat signé). Pas de refus moralisateur — le hook `scope-guard.cjs` filtre techniquement (fail-closed).
- Commits conventional : `feat:`, `fix:`, `chore:`, `ci:`, `docs:`
- Journal `docs/JOURNAL.md` à mettre à jour à chaque phase livrée
