# BJHUNT — AI-Powered Autonomous Cybersecurity Platform

## Qu'est-ce que BJHUNT

Plateforme SaaS de cybersecurite offensive propulsee par l'IA. Orchestre des audits de securite autonomes via une interface conversationnelle. Le frontend existe, le backend doit etre reconstruit sur le moteur Decepticon.

## Etat actuel du projet (15 avril 2026)

### Ce qui EXISTE et FONCTIONNE
- **Frontend Next.js** complet dans `app/`, `components/`, `lib/`, `messages/` — pages marketing, dashboard admin, chat AI, settings, auth UI, i18n FR/EN
- **Decepticon engine** dans `engine/` — 17 agents IA autonomes de red team (recon, exploit, post-exploit, defense, etc.)
- **VPS Hostinger** operationnel — Ubuntu 25.10, SSH via port 443 (sslh), domaines configures
- **GitHub Actions** — CI (lint, typecheck, build, Trivy, Gitleaks) + deploy VPS
- **MCP Hostinger** — gestion VPS/DNS/firewall directement depuis Claude Code

### Ce qui N'EXISTE PAS ENCORE (a construire)
- **Backend API** (`backend/` — n'existe pas) — auth, RBAC, multi-tenant, jobs, orchestration Decepticon
- **Docker Compose** de production — assemblage Backend + LangGraph + Caddy + PG + Redis + Neo4j
- **Integration frontend ↔ backend** — les API routes frontend (`app/api/`) appellent un backend qui n'existe plus
- **Deploiement complet** sur le VPS

---

## Architecture cible

```
                    ┌──────────────────────────┐
                    │  Frontend Next.js 15     │  bjhunt.com (Vercel)
                    │  app/ components/ lib/   │
                    └──────────┬───────────────┘
                               │ HTTPS (api.bjhunt.com)
                    ┌──────────▼───────────────┐
                    │  Caddy reverse proxy     │  port 8443 (sslh sur 443)
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │  Backend API (Hono+Bun)  │  port 3001
                    │  Auth, RBAC, Jobs,       │
                    │  Orchestration Decepticon│
                    └──────────┬───────────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐  ┌─────▼──────┐  ┌──────▼──────┐
    │ LangGraph API  │  │ PostgreSQL │  │ Redis       │
    │ (Decepticon)   │  │ 17         │  │ 7-alpine    │
    │ port 2024      │  │ port 5432  │  │ port 6379   │
    └─────────┬──────┘  └────────────┘  └─────────────┘
              │
    ┌─────────▼──────┐  ┌────────────┐
    │ Kali Sandbox   │  │ Neo4j      │
    │ (nmap, nuclei  │  │ 5.24       │
    │  sqlmap, etc.) │  │ Attack KG  │
    └────────────────┘  └────────────┘
```

## Structure du repo

```
bjhunt/
  .github/workflows/     CI (ci.yml) + Deploy (deploy-vps.yml)
  .mcp.json              MCP servers config (Hostinger, Playwright, etc.)
  app/                   Next.js pages, layouts, API routes, server actions
  components/            UI components (shadcn, animations, chat, dashboard)
  engine/                Decepticon engine (PurpleAILAB/Decepticon, Apache-2.0)
    decepticon/           Python core — agents, tools, middleware, LLM, orchestrator
    clients/cli/          React/Ink terminal CLI
    containers/           Dockerfiles (sandbox, langgraph, cli, c2-sliver)
    config/litellm.yaml   LLM proxy routing config
    docker-compose.yml    Decepticon infra definition
    skills/               SKILL.md per technique (recon, exploit, etc.)
  lib/                   Frontend utilities, hooks, API clients
  messages/              i18n translations (en.json, fr.json)
  ops/                   Caddyfile, deploy scripts
  public/                Static assets
  backend/               (A CREER) Backend API Hono+Bun
  CLAUDE.md              Ce fichier
```

## Stack technique

| Couche | Technologie | Etat |
|--------|-------------|------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS 4, shadcn/ui | MIGRE |
| i18n | next-intl (FR/EN) | MIGRE |
| Backend API | Hono + Bun, TypeScript | A CONSTRUIRE |
| Auth | Lucia (sessions PG), argon2id, cookie httpOnly | A CONSTRUIRE |
| Database | PostgreSQL 17 (RLS multi-tenant) | A CONSTRUIRE |
| Cache/Queue | Redis 7-alpine, BullMQ | A CONSTRUIRE |
| Engine | Python 3.13, LangGraph, LangChain, 17 agents IA | INTEGRE (engine/) |
| LLM routing | LiteLLM proxy (Anthropic, OpenAI, Ollama Cloud) | A CONFIGURER |
| Sandbox | Kali Linux Docker (nmap, nuclei, sqlmap, ffuf, sliver) | DANS ENGINE |
| Graph DB | Neo4j 5.24 (attack chain knowledge graph) | A CONFIGURER |
| Reverse proxy | Caddy 2.10 + sslh (port 443 multiplexer) | CONFIGURE SUR VPS |
| CI/CD | GitHub Actions → Vercel (frontend) + SSH deploy (VPS) | CONFIGURE |

## VPS Hostinger — Configuration complete

- **IP** : `82.25.117.79`
- **IPv6** : `2a02:4780:28:3349::1`
- **SSH** : `ssh bjhunt-vps` — port 443 via sslh, cle `~/.ssh/bjhunt_vps` (ed25519)
- **SSH config** : deja dans `~/.ssh/config` :
  ```
  Host bjhunt-vps
      HostName 82.25.117.79
      Port 443
      User root
      IdentityFile ~/.ssh/bjhunt_vps
      IdentitiesOnly yes
  ```
- **OS** : Ubuntu 25.10
- **Specs** : KVM 8, 8 vCPU, 32GB RAM, 400GB disk (27GB utilise = 7%)
- **Hostnames** : bjhunt.com
- **Domaines** : bjhunt.com, api.bjhunt.com, chat.bjhunt.com
- **VPS ID** : 1295179 (pour MCP Hostinger)
- **Firewall ID** : 255451
- **Ports ouverts** : 22, 80, 443, 2222, 8022 (TCP any)
- **sslh** : `/etc/default/sslh` — ecoute 0.0.0.0:443, dispatch SSH→22, TLS→8443
- **Caddy** : Docker container, bind 80:80 + 8443:443
- **PTR** : bjhunt.com (IPv4)
- **SSL** : auto-renouvelé par Caddy, expire 3 juillet 2026
- **Monarx** : antimalware installe
- **Snapshot** : cree le 14 avril 2026
- **Backups auto** : hebdomadaires
- **Etat actuel** : VPS nettoye. Ancien backend supprime. Nouveau repo clone dans `/opt/bjhunt/app`. `.env` preserve dans `/opt/bjhunt/stack/.env`
- **Note FAI** : le FAI de l'utilisateur bloque TOUS les ports sauf 80 et 443. C'est pourquoi SSH passe par le port 443 via sslh. Ne jamais tenter SSH sur le port 22.

## MCP Servers disponibles

Configures dans `.mcp.json` :

### Hostinger MCP
- Gere le VPS, DNS, firewall, backups, snapshots, clés SSH
- Cle API hardcodee (ne PAS utiliser promptString, ca se perd entre sessions)
- Outils : `VPS_getVirtualMachinesV1`, `VPS_getFirewallListV1`, `VPS_syncFirewallV1`, `VPS_createSnapshotV1`, `DNS_getDNSRecordsV1`, etc.

### Playwright MCP
- Automatisation browser pour tests, connexions web
- Deja connecte a : Hostinger hPanel, Vercel (bjhuntcom-oss via Google bjhuntcom@gmail.com), GitHub (bjhuntcom-oss via Google)
- Sessions dans `.playwright-mcp/`

### AIDesigner MCP
- HTTP endpoint `https://api.aidesigner.ai/api/v1/mcp`

### Kali MCP Server (disabled)
- SSE endpoint `http://localhost:8000/sse` — pas encore deploye

## Comptes et acces

- **GitHub** : `bjhuntcom-oss` — connecte via Google `bjhuntcom@gmail.com`
- **Vercel** : `bjhunts-projects` (Hobby plan) — connecte via GitHub
- **Hostinger** : API key dans `.mcp.json`
- **Ollama Cloud** : API key `9c6a5c691a4e4ac6980225065e8f44b1.vMDEl3SWpffjmhLd__jc9mPJ` — utilise pour les modeles GLM, DeepSeek, Kimi
- **Email utilisateur** : leformateurcha@gmail.com (compte Claude/Anthropic)
- **ATTENTION GitHub** : 2FA non active ! Deadline 27 mai 2026 sinon compte restreint.

## Decepticon Engine — Resume de l'audit

Source : `PurpleAILAB/Decepticon` (Apache-2.0, v1.0.3, equipe coreenne)

### Ce qu'il fournit
- 17 agents IA specialises couvrant tout le kill chain (recon → exfiltration → defense)
- Sandbox Kali Docker avec isolation reseau (decepticon-net vs sandbox-net)
- Planification d'engagement (RoE, CONOPS, OPPLAN) — schemas Pydantic
- Integration MITRE ATT&CK, CVSS, kill chain
- LiteLLM multi-provider (3 profils: eco/max/test)
- Neo4j knowledge graph pour les chaines d'attaque
- C2 Sliver integre
- CI/CD complet (lint, test, Docker build, Trivy, CodeQL, gitleaks, cosign signing)
- SafeCommandMiddleware (blocage commandes dangereuses dans le sandbox)

### Ce qu'il NE fournit PAS (a construire dans notre backend)
- Authentification utilisateur / RBAC
- Interface web (CLI-only)
- Multi-tenant / isolation des donnees
- API authentifiee
- Billing / abonnements
- Job queue / execution asynchrone
- Schema relationnel (fichiers uniquement)
- Scaling horizontal

### Vulnerabilites connues du engine
- C1: Credentials par defaut (`sk-decepticon-master`, `decepticon`, `decepticon-graph`)
- C2: Docker socket monte en read-only (peut lire env vars des containers)
- C3: Sandbox root avec NET_RAW + NET_ADMIN
- H1: SafeCommandMiddleware contournable (`exec`, `source`, `$()`)
- H2: LangGraph API sans auth (port 2024)
- A corriger lors de l'integration

## Frontend — Etat de l'audit

138 fichiers migres (~1MB). Points d'attention :
- `app/api/auth/[...slug]/route.ts` — proxy vers backend (GET, POST, DELETE, PATCH)
- `app/api/beta/route.ts` et `app/api/contact/route.ts` — rate limiter in-memory (pas Redis)
- `middleware.ts` — CSP avec `strict-dynamic` (unsafe-eval supprime), nonce-based
- `lib/backend-client.ts` — client API vers `NEXT_PUBLIC_BACKEND_URL`
- `lib/chat/use-chat-api.ts` — SSE streaming vers le backend
- Les pages dashboard admin referencent des endpoints backend qui n'existent plus

## Regles de developpement

- Code securise — c'est une plateforme de cybersecurite, la securite est non-negociable
- SQL toujours parametre, jamais d'interpolation de strings
- Argon2id pour les passwords, AES-256-GCM pour les secrets
- RLS PostgreSQL pour l'isolation multi-tenant
- Pas de `unsafe-eval` dans le CSP
- Valider tous les inputs avec Zod cote backend, cote frontend aussi
- Rate limiting Redis sur tous les endpoints publics
- Pas de secrets dans le code — tout dans `.env`
- Docker pour l'isolation — jamais d'execution directe sur le host
- Tests de securite dans le CI (Trivy, Gitleaks)
- Commits clairs avec prefix conventionnel (feat:, fix:, chore:, ci:, docs:)
- Co-Authored-By Claude dans les commits

## TODO — Plan de travail

### Phase 1 : Backend API (PRIORITE)
1. Creer `backend/` avec Hono + Bun
2. Schema PostgreSQL (users, organizations, sessions, engagements, findings, api_keys, audit_logs)
3. Auth (register, login, logout, sessions, password reset)
4. Middleware (CORS, CSRF, rate limiting, auth resolution)
5. Routes admin (users, settings, audit logs)
6. Routes engagements (CRUD, lancement, statut, resultats)
7. Integration Decepticon via HTTP vers LangGraph API (port 2024)
8. Health checks

### Phase 2 : Docker Compose production
1. docker-compose.yml pour le VPS avec tous les services
2. Caddy config (api.bjhunt.com → backend:3001, chat.bjhunt.com → LangGraph UI)
3. Network isolation (management vs sandbox)
4. Volumes persistants
5. .env.example complet

### Phase 3 : Integration frontend
1. Connecter les pages auth au nouveau backend
2. Connecter le dashboard admin
3. Connecter le chat AI au LangGraph via le backend
4. Connecter les pages d'audit/engagement

### Phase 4 : Deploiement
1. Premier deploy sur le VPS
2. Tests end-to-end
3. Monitoring et alerting
