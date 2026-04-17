# BJHUNT — AI-Powered Autonomous Cybersecurity Platform

> CE FICHIER EST LE CONTEXTE COMPLET DU PROJET. Lis-le entierement avant de faire quoi que ce soit.
> Il n'y a PAS de memoire partagee entre sessions. Tout est ici.
> **Dernière mise à jour : 17 avril 2026.** État post-audit 6 agents Opus 4.7 + vague W1 (chat fix) + W2 (sécurité) déployées.

## Etat actuel (17 avril 2026)

**La plateforme FONCTIONNE en production** : frontend Vercel, backend + engine sur VPS Hostinger, chat SSE token-par-token opérationnel.

### Ce qui est fait
- ✅ Frontend Next.js 16 complet (pages marketing, auth, dashboard, chat, admin)
- ✅ Backend Hono+Bun (auth Lucia, sessions HttpOnly, routes engagements/findings/billing/admin/chat)
- ✅ Engine Decepticon intégré dans `engine/` (17 agents, LiteLLM, Kali sandbox, Neo4j)
- ✅ Docker Compose prod avec 8 services (backend, postgres, redis, litellm, neo4j, sandbox, langgraph, caddy)
- ✅ CI/CD GitHub Actions (ci.yml, deploy-vps.yml)
- ✅ Chat SSE stable : Hono `streamSSE` backend + parser CRLF-safe frontend + streaming token-par-token
- ✅ 6-agent parallel audit livré (`docs/AUDIT-2026-04-17.md`) : 288 findings, 22 Critical, 78 High
- ✅ Vague W1 déployée (chat fix : C-17, C-18, Finding #2-10 partiel)
- ✅ Vague W2 déployée (sécurité critique) :
  - Session token hardening (B1) : retrait `bjhunt_stream_token`, `?token=`, `Bearer session:`, `sessionToken` en body
  - RLS FORCE + `WITH CHECK` + rôle `bjhunt_app` (B2, migration écrite, non appliquée)
  - Provider API keys AES-256-GCM at rest (B3) + SSRF admin gateway fermé
  - CSP complet (12 directives) + CSRF origin check sur server actions + beta captcha wired (B4)
  - LangGraph CMD : `--no-reload --n-jobs-per-worker 10 --allow-blocking` (mitigation partielle C-09)

### Ce qui reste (vagues restantes)
- ⏳ **W3 — Infra** (partiellement utilisateur) :
  - Rotate token Hostinger (C-01) — TOI via dashboard Hostinger
  - Activer 2FA GitHub (**deadline 2 mai 2026**) — TOI
  - Opt-out Copilot training (**deadline 24 avril 2026**) — TOI
  - Provisionner `NEXT_PUBLIC_HCAPTCHA_SITEKEY` + `HCAPTCHA_SECRET` dans env Vercel — TOI
  - Provisionner `ENCRYPTION_KEY` (`openssl rand -base64 32`) dans `.env` VPS — TOI
  - Ré-entrer les clés providers dans admin/gateway (migration NULL les anciennes)
  - SSH hardening VPS (désactiver root login + password auth) — joint TOI/moi
  - Backups PG + Neo4j + S3 externe — moi
  - Observability (Prometheus + Grafana + Loki + Sentry) — moi
  - Docker hardening : `cap_drop`, `no-new-privileges`, non-root — moi
  - Migrer `langgraph dev` → `langgraph up` (Postgres-backed, prod-grade) — moi
  - Appliquer migration RLS + adapter `auth.ts` + `chat.ts` + `admin/*` pour `bjhunt_app` role — moi
- ⏳ **W4 — Engine Decepticon** :
  - SafeCommandMiddleware whitelist-based (C-21)
  - Multi-tenant isolation engine (sandbox per tenant, Neo4j DB per tenant)
  - Fix Cypher injection Neo4jStore
  - Retirer Docker socket mount (C-08 / C2)
  - Sandbox caps scopées (C-10 / C3)
  - Defender target fix (protège la cible, pas le sandbox)
  - Branding cleanup (529 refs "decepticon" → "bjhunt" dans 113 fichiers)

### Références docs vivantes
- [`docs/AUDIT-2026-04-17.md`](docs/AUDIT-2026-04-17.md) — rapport consolidé post-audit (22 Critical, 78 High, roadmap P0/P1/P2)
- [`docs/audit-2026-04-17/partial/`](docs/audit-2026-04-17/partial/) — 6 rapports spécialisés
- [`docs/audit-2026-04-17/verification/rls-withOrg-audit.md`](docs/audit-2026-04-17/verification/rls-withOrg-audit.md) — détail RLS + queries à migrer
- [`docs/CHAT-DEBUG-PROMPT.md`](docs/CHAT-DEBUG-PROMPT.md) — historique des 15 fix tentatives chat (obsolète mais utile pour contexte)
- [`docs/superpowers/specs/`](docs/superpowers/specs/) — specs par vague

---

## Qu'est-ce que BJHUNT

Plateforme SaaS de cybersécurité offensive propulsée par l'IA. Frontend Next.js (dashboard, chat, marketing) + backend Hono+Bun (auth, orchestration) + engine Decepticon (17 agents IA qui planifient et exécutent des audits dans des sandboxes Kali isolés).

## Qu'est-ce que Decepticon

Framework de red team autonome par agents IA, forké de https://github.com/PurpleAILAB/Decepticon (équipe coréenne PurpleAILAB, licence Apache-2.0). Le code vit dans `engine/` — il a été audité en profondeur (54 findings Agent 5) et partiellement durci (C1 FIXED, H2 FIXED, H1/M1 PARTIAL, reste à faire en W4).

### Les 17 agents IA
- **BJHUNT** — orchestrateur principal (anciennement "Decepticon"), coordonne les sous-agents
- **Soundwave** — planification d'engagement (RoE, CONOPS, OPPLAN)
- **Recon** — OSINT, enum sous-domaines, scan ports, détection services
- **Exploit** — SQLi, SSTI, Kerberoasting, ADCS
- **PostExploit** — accès credentials, escalade privilèges, mouvement latéral, C2
- **Analyst** — code review, CVE sweeps, fuzzing, chaînes d'attaque
- **Reverser** — ELF/PE/firmware triage, ROP, Ghidra
- **Contract Auditor** — Solidity/EVM, reentrancy, flash loans, Slither
- **Cloud Hunter** — AWS IAM privesc, S3 takeover, K8s RBAC
- **AD Operator** — BloodHound, Kerberoast, ADCS ESC1-15, DCSync
- **VulnResearch / Scanner / Detector / Verifier / Patcher / Exploiter** — pipeline recherche
- **Defender** — agent défensif (vaccine loop)

### Structure engine/
```
engine/
  decepticon/              Python core (agents, tools, middleware, llm, backends)
  clients/cli/             React/Ink terminal CLI
  skills/                  SKILL.md par technique
  containers/              Dockerfiles (sandbox, langgraph, cli, c2-sliver)
  config/litellm.yaml      Config LiteLLM multi-provider
  docker-compose.yml       [legacy Decepticon, pas utilisé en prod — nous utilisons le compose racine]
  langgraph.json           17 agents enregistrés
  tests/unit/              Tests Python
```

### Technologies engine
- Python 3.13, LangGraph 0.7, LangChain, deepagents
- LiteLLM proxy (Ollama Cloud, Anthropic, OpenAI)
- PostgreSQL 17 (spend LiteLLM uniquement)
- Neo4j 5.24 (knowledge graph attack chains)
- Docker Compose avec réseaux isolés (bjhunt-mgmt vs bjhunt-sandbox-net)
- Kali Linux sandbox, tmux, NET_RAW + NET_ADMIN (à scoper en W4)
- uv (Python), npm workspaces (CLI)

### Vulnérabilités connues — statut au 17 avril 2026
- C1 default credentials — **FIXED** (compose `${VAR:?err}` guards)
- C2 Docker socket mount dans LangGraph — **STILL VULNERABLE** (W4)
- C3 sandbox root + NET_RAW/NET_ADMIN — **STILL VULNERABLE** (W4)
- H1 SafeCommandMiddleware bypass — **PARTIAL** (shlex OK, unicode/IFS/xargs bypass encore)
- H2 LangGraph port 2024 sans auth — **FIXED** (api_auth.py wire dans langgraph.json)
- H3 LiteLLM keys exposées — **STILL VULNERABLE** (W4)
- H4 `curl | bash` installer — **STILL VULNERABLE** (W4)
- M1 validation input bash tool — **PARTIAL**
- M2 pas de TLS inter-container — **STILL VULNERABLE** (W3)
- M3 Neo4j APOC unrestricted — **PARTIAL** (scoped à apoc.merge/create/path/algo)

---

## Architecture cible en prod

```
INTERNET
   │
   ▼
┌──────────────────────┐
│  Vercel (frontend)   │  bjhunt.com / www.bjhunt.com
│  Next.js 16          │  Marketing + Dashboard + Chat UI
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────────────┐
│  VPS Hostinger (82.25.117.79)           │
│  ┌────────────────────────────────────┐  │
│  │ Caddy (port 80 + 443, direct)      │  │  Reverse proxy TLS
│  │ api.bjhunt.com → backend:3001      │  │
│  │ chat.bjhunt.com → backend:3001     │  │
│  └───────────┬────────────────────────┘  │
│              │                           │
│  ┌───────────▼────────────┐              │
│  │ Backend Hono+Bun :3001 │              │
│  │ Lucia auth, RLS, jobs  │              │
│  └───────────┬────────────┘              │
│              │                           │
│  ┌───────────▼────────────┐              │
│  │ LangGraph API :2024     │  ← 17 agents
│  │ Python 3.13, dev mode   │    [dev flags: no-reload, 10 jobs, allow-blocking]
│  └───────────┬────────────┘              │
│              │                           │
│  ┌───────────▼────────────┐              │
│  │ Kali Sandbox           │              │
│  │ nmap, nuclei, sqlmap   │              │
│  └────────────────────────┘              │
│                                          │
│  Postgres 17 │ Redis 7 │ Neo4j 5.24     │
│  LiteLLM :4000 → Ollama Cloud (GLM-5.1) │
└──────────────────────────────────────────┘
```

---

## VPS Hostinger — Configuration factuelle (audit 17 avril 2026)

### Connexion SSH
```bash
ssh bjhunt-vps
# equivalent a : ssh -p 443 -i ~/.ssh/bjhunt_vps root@82.25.117.79
```

Config `~/.ssh/config` :
```
Host bjhunt-vps
    HostName 82.25.117.79
    Port 443
    User root
    IdentityFile ~/.ssh/bjhunt_vps
    IdentitiesOnly yes
```

### Pourquoi port 443 (note factuelle corrigée)
Le FAI de l'utilisateur **bloque TOUS les ports sauf 80 et 443**. **NOTE** : contrairement à ce que l'ancienne doc disait, `sslh` n'est PAS installé sur le VPS. SSH écoute bien sur le port 443 directement (via sshd), et Caddy sert HTTPS également sur 443 — les deux coexistent parce que le protocole HTTP peut se différencier de SSH par le handshake initial. (Vérifié Agent 6 F6-2.)

### Specs VPS
- **IP** : 82.25.117.79 (IPv6: 2a02:4780:28:3349::1)
- **OS** : Ubuntu 24.04.4 LTS (kernel 6.8.0-107, update 6.8.0-110 pending) — **PAS 25.10**
- **Plan** : KVM 8 — 8 vCPU, 32GB RAM, 400GB disk
- **Disque utilise** : ~27GB (7%)
- **Datacenter** : Paris (id: 15)
- **VPS ID** : 1295179 (pour API Hostinger / MCP)
- **Firewall ID** : 255451
- **Expiration** : 25 janvier 2027
- **Auto-renewal** : actif

### Services actifs sur le VPS
- **sshd** : systemd, port 443 + 22 (fallback) — ⚠️ `PermitRootLogin yes` et `PasswordAuthentication yes` encore actifs (C-02 à fix en W3)
- **UFW** : actif, default deny incoming. Ports TCP ouverts : **22, 80, 443** uniquement (pas les 15 ports listés dans l'ancienne doc — corrigé Agent 6 F6-3)
- **fail2ban** : présent mais jails minimaux
- **unattended-upgrades** : actif
- **Monarx antimalware** : **PAS installé** (corrigé Agent 6 F6-4)
- **Docker** : actif, 8 containers prod (backend, postgres, redis, neo4j, litellm, langgraph, caddy, sandbox) + 1 orphelin `ecstatic_tu` (à nettoyer)

### Firewall Hostinger (niveau hyperviseur)
- Port 22 TCP any → accept
- Port 80 TCP any → accept
- Port 443 TCP any → accept
- Port 2222 TCP any → accept
- Port 8022 TCP any → accept

### Structure fichiers VPS
```
/opt/bjhunt/app/       ← clone de ce repo (bjhuntcom-oss/bjhunt)
/opt/bjhunt/app/.env   ← secrets prod (⚠️ mode 644 world-readable — F6-7 à fix W3)
/srv/bjhunt/           ← données persistantes (postgres, runtimes, uploads)
```
**Note** : contrairement à l'ancienne doc, `/opt/bjhunt/stack/` n'existe PAS — tout vit sous `/opt/bjhunt/app/`.

---

## MCP Servers

Configurés dans `.mcp.json` à la racine du repo.

### Hostinger MCP (`hostinger-mcp`)
Gestion VPS depuis Claude Code : VMs, firewall, DNS, backups, snapshots, SSH keys, métriques.
- Type : stdio, `npx hostinger-api-mcp@latest`
- ⚠️ **API token committé dans `.mcp.json:8`** (C-01 / F5-1) — à rotate en W3 par TOI.

### Playwright MCP (`mcp-playwright`)
Automatisation navigateur : tests E2E, connexions web, audit visuel.
- Type : stdio, `npx -y @playwright/mcp@latest`
- Sessions existantes : Hostinger hPanel, Vercel, GitHub (tout via Google `bjhuntcom@gmail.com`)

### AIDesigner MCP (`aidesigner`)
- Type : http, `https://api.aidesigner.ai/api/v1/mcp`

### Kali MCP Server (`kali-mcp-server`) — DISABLED
- Type : sse, `http://localhost:8000/sse` — pas encore déployé

---

## Comptes et credentials

- **GitHub** : `bjhuntcom-oss` (connecté via Google `bjhuntcom@gmail.com`)
  - ⚠️ **2FA NON activée — deadline 2 mai 2026** (15 jours restants au 17/04/2026)
  - ⚠️ **Copilot training opt-out — deadline 24 avril 2026** (7 jours restants)
  - Repo actuel : `bjhuntcom-oss/bjhunt`
  - Repo legacy : `bjhuntcom-oss/bjhunt-v1-legacy`
  - ⚠️ Aucune branch protection, pas de CODEOWNERS, pas de Dependabot
- **Vercel** : `bjhunts-projects` (plan Hobby) — auto-deploy depuis GitHub main
  - Env vars à provisionner : `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`
- **Hostinger** : API key dans `.mcp.json` (à rotate)
- **Ollama Cloud** : API key dans `.env` VPS (`OLLAMA_CLOUD_API_KEY`)
  - Base URL : `https://ollama.com/v1` (OpenAI-compatible, Bearer auth)
  - Modèles actifs : GLM-5.1:cloud (primary — ⚠️ 17/18 agents dépendent d'un seul provider), DeepSeek-v3.2:cloud, Kimi-k2.5:cloud
- **Email utilisateur** : `leformateurcha@gmail.com`

### Env vars à provisionner post-W2
- `ENCRYPTION_KEY` — 32 bytes base64 (`openssl rand -base64 32`) — pour chiffrement provider API keys at rest. Requis en prod, fallback dérivé de `SESSION_SECRET` en dev.
- `NEXT_PUBLIC_HCAPTCHA_SITEKEY` + `HCAPTCHA_SECRET` — pour beta + contact forms.

---

## Règles de développement

- Code sécurisé — plateforme de cybersécurité, sécurité NON-NÉGOCIABLE.
- SQL toujours paramétré, jamais d'interpolation de strings.
- Argon2id pour passwords, AES-256-GCM pour secrets (cf. `backend/src/lib/crypto.ts`).
- RLS PostgreSQL pour multi-tenant isolation (migration écrite, **pas encore appliquée** — voir W3).
- Pas de `unsafe-eval` dans CSP. Avec W2, CSP couvre 12 directives (`middleware.ts`).
- Valider TOUS les inputs avec Zod (backend) et aussi côté frontend.
- Rate limiting Redis sur tous les endpoints publics (en mémoire sur `/api/beta` + `/api/contact` à fix en W3).
- Pas de secrets dans le code — tout dans `.env`.
- Docker pour l'isolation — jamais d'exécution directe sur le host.
- Tests de sécurité dans le CI (Trivy, Gitleaks — à renforcer en W3 : CodeQL, Semgrep, SBOM, cosign).
- Commits avec prefix conventionnel : `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`
- Ajouter `Co-Authored-By: Claude <noreply@anthropic.com>` dans les commits importants.

---

## Conventions chat SSE (contexte W1)

Le chat utilise le flow **SP3 signed ticket** :
1. `POST /api/chat/prepare` (HttpOnly cookie auth) — crée le run LangGraph en memoire + retourne HMAC ticket.
2. `GET /api/chat/stream/:runId?ticket=<jwt>` (ticket auth, pas de cookie nécessaire côté CORS) — stream SSE via Hono `streamSSE`.

Le backend demande `stream_mode: ["values", "custom", "messages"]` à LangGraph. Les events :
- `values` — snapshot complet de l'état (réconciliation finale)
- `custom` — lifecycle sub-agents (subagent_start/end)
- `messages` / `messages/partial` / `messages/complete` — chunks tokens (AIMessageChunk)

Le frontend parse via `splitSSEBlocks()` dans `app/[locale]/dashboard/chat/parseSSE.ts` (normalise CRLF → LF, robuste aux tests unitaires bun).

Le handler `case "messages"` dans `page.tsx` gère à la fois **delta** (OpenAI/Anthropic) et **cumulatif** (Ollama/GLM) en détectant si le chunk incoming est un superset du contenu courant.

**Textbox** non disabled pendant streaming : user peut typer + envoyer, ça abort le stream courant et envoie le nouveau message (pattern ChatGPT).

---

## TODO — Ce qu'il reste (vagues restantes)

### W3 — Infra (actions TOI + moi)

**Actions TOI (ne peuvent pas être automatisées)** :
1. Rotate token Hostinger (C-01) : aller sur Hostinger → API Tokens → regénérer → mettre dans `.env.local` (jamais committer). Retirer ligne `HOSTINGER_API_TOKEN` de `.mcp.json` ou utiliser `${env:...}`.
2. Activer 2FA GitHub avant **2 mai 2026**.
3. Opt-out Copilot training avant **24 avril 2026** : Settings → Copilot → Policies → disable data-for-training.
4. Provisionner dans Vercel env : `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`.
5. Provisionner dans `.env` VPS : `ENCRYPTION_KEY=$(openssl rand -base64 32)` + redeploy backend.
6. Ré-entrer les clés providers dans `/dashboard/admin/gateway` après que la migration B3 a NULL-ifié les anciennes plaintext.

**Actions moi (code + compose + VPS ops)** :
7. SSH hardening : `PermitRootLogin no`, `PasswordAuthentication no`, créer user `bjhunt` non-root avec clé, tester via session parallèle pour éviter lock-out.
8. Backup Postgres + Neo4j : cron quotidien vers snapshot Hostinger + S3 externe (Backblaze B2 ou AWS S3).
9. Observability : Prometheus + Grafana + Loki + Sentry + Uptime Kuma external.
10. SECURITY.md + CODEOWNERS + Dependabot config.
11. Docker hardening : `cap_drop: ALL`, `no-new-privileges: true`, non-root users, `read_only` rootfs où possible.
12. Migrer LangGraph `dev` → `up` (Postgres-backed) — évite in-memory + concurrent limits.
13. Appliquer migration RLS (`0001_force_rls_and_with_check.sql`) après avoir migré `backend/src/routes/auth.ts` + `chat.ts` + `admin/*` pour qu'ils utilisent `withOrg()`. Voir `docs/audit-2026-04-17/verification/rls-withOrg-audit.md`.
14. Caddy hardening : rate-limit edge, `tls min=1.3`, HSTS `preload`, headers sécurité.
15. CI/CD : CodeQL + Semgrep SAST, SBOM cosign + SLSA, deploy via image registry (pas `git pull` sur VPS).
16. Migrer `/api/beta` + `/api/contact` de rate-limit in-memory → Redis.

### W4 — Engine Decepticon
17. SafeCommandMiddleware refactor : whitelist plutôt que blacklist.
18. Multi-tenant engine : sandbox par tenant, Neo4j database par tenant.
19. Fix Cypher injection Neo4jStore (`neo4j_store.py`).
20. Retirer Docker socket mount de langgraph container (C2).
21. Scoper sandbox capabilities (C3).
22. Defender : cible l'infra cliente, pas le sandbox attaquant.
23. Branding cleanup : 529 refs "decepticon" → "bjhunt" dans 113 fichiers.
24. Retirer `curl | bash` installer (H4) — fournir tarballs signés + checksums.
25. LiteLLM config : clés providers en secret files Docker, pas env plaintext (H3).
26. TLS inter-container (M2).

### W5 — Qualité / polish
27. Tests unitaires parser SSE étendus (plus de cas) + tests backend Hono streamSSE.
28. Frontend : `prefers-reduced-motion` sur toutes les animations (WCAG 2.2).
29. Logout UI unifié (éviter les 2 chemins incorrects actuels).
30. CookieConsent bilingue FR/EN.
31. Loading skeletons sur dashboard findings/engagements.
32. Nettoyer les anciennes conversations de test dans le chat.

---

## Ce que je DOIS lire AVANT de toucher au code

1. Ce fichier (CLAUDE.md) en entier.
2. [`docs/AUDIT-2026-04-17.md`](docs/AUDIT-2026-04-17.md) — rapport consolidé.
3. Si je touche le chat : [`docs/audit-2026-04-17/partial/agent-1-chat-frontend.md`](docs/audit-2026-04-17/partial/agent-1-chat-frontend.md) et [`docs/audit-2026-04-17/partial/agent-2-chat-backend.md`](docs/audit-2026-04-17/partial/agent-2-chat-backend.md).
4. Si je touche la sécurité : [`docs/audit-2026-04-17/partial/agent-3-backend-api.md`](docs/audit-2026-04-17/partial/agent-3-backend-api.md) + [`agent-4-frontend.md`](docs/audit-2026-04-17/partial/agent-4-frontend.md).
5. Si je touche l'engine : [`docs/audit-2026-04-17/partial/agent-5-engine-decepticon.md`](docs/audit-2026-04-17/partial/agent-5-engine-decepticon.md).
6. Si je touche l'infra : [`docs/audit-2026-04-17/partial/agent-6-infra-security.md`](docs/audit-2026-04-17/partial/agent-6-infra-security.md).
7. Specs des vagues : `docs/superpowers/specs/`.
