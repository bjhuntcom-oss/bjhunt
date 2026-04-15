# BJHUNT — AI-Powered Autonomous Cybersecurity Platform

> CE FICHIER EST LE CONTEXTE COMPLET DU PROJET. Lis-le entierement avant de faire quoi que ce soit.
> Il n'y a PAS de memoire partagee entre sessions. Tout est ici.

## Mission immediate

**Cloner, auditer et adapter https://github.com/PurpleAILAB/Decepticon comme backend/engine de BJHUNT.**

Le dossier `engine/` dans ce repo contient une copie statique de Decepticon qui a ete faite le 15 avril 2026. Elle n'est PAS a jour et n'a PAS ete adaptee. Il faut :

1. **Recloner** le vrai repo `https://github.com/PurpleAILAB/Decepticon` dans `engine/` (supprimer l'ancien, refaire un clone propre sans le `.git/`)
2. **Auditer a fond** tout le code Python du engine — securite, architecture, agents, tools, middleware, config, docker, CI
3. **Adapter pour BJHUNT** — renommer/rebrander, securiser les credentials par defaut, ajouter l'auth API, adapter les Dockerfiles, integrer avec notre frontend Next.js
4. **Construire le backend API** dans `backend/` — couche Hono+Bun qui orchestre Decepticon, gere l'auth, les users, le multi-tenant
5. **Creer le Docker Compose de production** qui fait tourner tout ensemble sur le VPS
6. **Configurer les GitHub Actions** pour le CI/CD complet (lint, test, build, security scan, deploy)
7. **Deployer** le tout sur le VPS

---

## Qu'est-ce que BJHUNT

Plateforme SaaS de cybersecurite offensive propulsee par l'IA. Le frontend (Next.js) est la partie visible — dashboard, chat, pages marketing. Le backend orchestre le moteur Decepticon qui fait le vrai travail : des agents IA autonomes qui planifient et executent des audits de securite dans des sandboxes Kali isoles.

## Qu'est-ce que Decepticon (https://github.com/PurpleAILAB/Decepticon)

Framework de red team autonome par agents IA. Cree par PurpleAILAB (equipe coreenne), licence Apache-2.0, version 1.0.3.

### Architecture Decepticon

```
Ink CLI (React/TSX)  ──HTTP──>  LangGraph API (Python 3.13, port 2024)
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              LiteLLM Proxy    Docker Sandbox    Neo4j Graph
              (port 4000)      (Kali Linux)      (Attack KG)
              Anthropic/       nmap, nuclei,
              OpenAI/Google    sqlmap, hydra,
                               sliver C2
```

### Les 17 agents IA
- **Decepticon** — orchestrateur principal, coordonne les 9 sous-agents
- **Soundwave** — planification d'engagement (RoE, CONOPS, OPPLAN), interview operateur
- **Recon** — OSINT, enumeration sous-domaines, scan de ports, detection de services
- **Exploit** — SQLi, SSTI, Kerberoasting, ADCS, attaques credentials
- **PostExploit** — acces credentials, escalade privileges, mouvement lateral, C2
- **Analyst** — code review, analyse statique, CVE sweeps, fuzzing, construction de chaines
- **Reverser** — ELF/PE/firmware triage, detection packer, ROP gadgets, scripts Ghidra
- **Contract Auditor** — Solidity/EVM : reentrancy, flash loans, Slither, Foundry PoC
- **Cloud Hunter** — AWS IAM privesc, S3 takeover, K8s RBAC, secrets Terraform
- **AD Operator** — BloodHound, Kerberoast, AS-REP roast, ADCS ESC1-15, DCSync
- **VulnResearch** — coordinateur pipeline de recherche de vulnerabilites
- **Scanner** — agent de scan
- **Detector** — detection de vulnerabilites
- **Verifier** — verification de vulnerabilites
- **Patcher** — generation de patchs
- **Exploiter** — generation d'exploits
- **Defender** — agent defensif (vaccine : attaque → defense → verification)

### Structure des fichiers Decepticon
```
Decepticon/
  decepticon/                    Python core
    agents/                      17 agents specialises + prompts/
    backends/                    docker_sandbox.py, defense.py
    core/                        config.py, engagement.py, schemas.py, types.py
    llm/                         factory.py, models.py, router.py
    middleware/                  safe_command.py, opplan.py, skills.py
    tools/                       bash/, web/, ad/, cloud/, contracts/, defense/, references/, reporting/, research/, reversing/
    orchestrator.py              Boucle vaccine (attaque → defense → verification)
    observability/               Metriques, tracing
  clients/cli/                   React/Ink terminal CLI (TypeScript, Node 22)
  skills/                        SKILL.md par technique
  containers/                    Dockerfiles (sandbox, langgraph, cli, c2-sliver)
  config/litellm.yaml            Config LiteLLM multi-provider
  docker-compose.yml             Infrastructure complete
  scripts/install.sh             Installeur one-line
  tests/unit/                    Tests Python
  docs/                          Architecture, vision, recherche
```

### Technologies Decepticon
- Python 3.13, LangGraph, LangChain, deepagents
- LiteLLM proxy multi-provider (Anthropic, OpenAI, Google)
- PostgreSQL 17 (LiteLLM spend tracking uniquement)
- Neo4j 5.24 (knowledge graph des chaines d'attaque)
- Docker Compose avec isolation reseau (decepticon-net vs sandbox-net)
- Kali Linux sandbox avec tmux, NET_RAW + NET_ADMIN
- Sliver C2 (framework swappable)
- uv (Python), npm workspaces (CLI)

### Vulnerabilites connues de Decepticon (a corriger lors de l'adaptation)
- **C1** : Credentials par defaut — `sk-decepticon-master`, `POSTGRES_PASSWORD=decepticon`, `NEO4J_PASSWORD=decepticon-graph`
- **C2** : Docker socket monte read-only dans LangGraph → peut lire env vars de tous les containers
- **C3** : Sandbox root avec NET_RAW + NET_ADMIN (necessaire pour nmap SYN, mais dangereux)
- **H1** : SafeCommandMiddleware contournable (`exec`, `source /tmp/x.sh`, `$(cat /tmp/cmd)`, `CMD=pkill; $CMD bash`)
- **H2** : LangGraph API (port 2024) sans aucune authentification — ouvert a quiconque a acces reseau
- **H3** : LiteLLM proxy expose toutes les cles API des providers
- **H4** : install.sh utilise `curl | bash` (risque supply chain)
- **M1** : Pas de validation d'input sur le parametre `command` du bash tool
- **M2** : Pas de TLS entre containers
- **M3** : Neo4j APOC non restreint (acces filesystem)

### Ce que Decepticon fournit et qu'on garde
- Orchestration multi-agent avec kill chain complet
- Sandbox Kali isole avec 100+ outils
- Schemas Pydantic pour RoE, CONOPS, OPPLAN, Findings
- Integration MITRE ATT&CK, CVSS
- Knowledge graph Neo4j
- LiteLLM multi-LLM
- Skills system (technique documents progressifs)
- CI/CD (lint, test, Trivy, CodeQL, gitleaks, cosign)

### Ce que Decepticon NE fournit PAS (a construire)
- Authentification utilisateur / RBAC
- Interface web (il n'a qu'un CLI terminal)
- Multi-tenant / isolation des donnees entre utilisateurs
- API authentifiee
- Billing / abonnements
- Job queue / execution asynchrone
- Schema relationnel pour les donnees applicatives
- Scaling horizontal

---

## Etat actuel du projet (15 avril 2026)

### Ce qui EXISTE dans ce repo
- **Frontend Next.js 15** complet : `app/`, `components/`, `lib/`, `messages/` — 138 fichiers, ~1MB
  - Pages : home, pricing, investors, legal, contact, beta, login, forgot-password, reset-password
  - Dashboard : overview, chat AI, settings, API keys, audits
  - Dashboard admin : users, agents, gateway, LLM, logs, monitoring, settings
  - Components : shadcn/ui, animations (hex-grid, radar, etc.), chat (input, messages, sidebar, model selector, file upload, voice recorder)
  - i18n : FR/EN complet (next-intl)
- **Engine Decepticon** dans `engine/` — copie du 15 avril, PAS encore adaptee
- **GitHub Actions** : CI (ci.yml) + Deploy VPS (deploy-vps.yml)
- **MCP config** : `.mcp.json` avec Hostinger, Playwright, AIDesigner
- **Ops** : Caddyfile, deploy script

### Ce qui N'EXISTE PAS (a creer)
- `backend/` — API Hono+Bun (auth, RBAC, jobs, orchestration Decepticon)
- `docker-compose.yml` de production (racine du repo)
- `.env.example` complet
- Integration frontend ↔ backend (les routes API frontend appellent un backend qui n'existe plus)
- Deploiement fonctionnel sur le VPS

### Points d'attention sur le frontend existant
- `app/api/auth/[...slug]/route.ts` — proxy catch-all vers le backend (GET, POST, DELETE, PATCH)
- `app/api/beta/route.ts` et `app/api/contact/route.ts` — rate limiter in-memory (pas Redis, ne survit pas au restart)
- `app/actions/auth.ts` — server actions pour login/register/logout
- `middleware.ts` — CSP `strict-dynamic` nonce-based (pas de `unsafe-eval`)
- `lib/backend-client.ts` — `getBackendBaseUrl()` retourne `process.env.BJHUNT_BACKEND_URL` ou `https://api.bjhunt.com`
- `lib/chat/use-chat-api.ts` — hook React pour le chat AI avec SSE streaming
- `components/dashboard/dashboard-shell.tsx` — shell du dashboard, reference `NEXT_PUBLIC_BACKEND_URL`
- Les pages dashboard admin referencent des endpoints backend (`/api/admin/*`, `/api/chat/*`, `/api/scans/*`) qui n'existent plus

---

## Architecture cible

```
INTERNET
   │
   ▼
┌──────────────────────┐
│  Vercel (frontend)   │  bjhunt.com / www.bjhunt.com
│  Next.js 15          │  Pages marketing + Dashboard + Chat UI
└──────────┬───────────┘
           │ HTTPS
           ▼
┌──────────────────────┐
│  VPS Hostinger       │  82.25.117.79
│  ┌────────────────┐  │
│  │ sslh (port 443)│  │  Multiplex SSH + HTTPS
│  └───┬────────┬───┘  │
│      │        │      │
│   SSH:22   TLS:8443  │
│      │        │      │
│      │  ┌─────▼────┐ │
│      │  │  Caddy    │ │  Reverse proxy
│      │  │  80+8443  │ │  api.bjhunt.com → backend:3001
│      │  └─────┬─────┘ │  chat.bjhunt.com → langgraph:2024
│      │        │       │
│  ┌───▼────────▼────┐  │
│  │ Backend API     │  │  Hono+Bun, port 3001
│  │ Auth, RBAC,     │  │  A CONSTRUIRE
│  │ Jobs, Billing   │  │
│  └────────┬────────┘  │
│           │           │
│  ┌────────▼────────┐  │
│  │ LangGraph API   │  │  Decepticon engine, port 2024
│  │ 17 agents IA    │  │  Python 3.13
│  └────────┬────────┘  │
│           │           │
│  ┌────────▼────────┐  │
│  │ Kali Sandbox    │  │  Docker, reseau isole
│  │ nmap, nuclei,   │  │  sandbox-net (pas d'acces management)
│  │ sqlmap, sliver  │  │
│  └─────────────────┘  │
│                       │
│  ┌──────┐ ┌────────┐  │
│  │ PG17 │ │ Redis7 │  │  Donnees persistantes
│  └──────┘ └────────┘  │
│  ┌──────────────────┐  │
│  │ Neo4j 5.24       │  │  Attack chain knowledge graph
│  └──────────────────┘  │
└───────────────────────┘
```

---

## VPS Hostinger — Configuration complete

### Connexion SSH
```bash
ssh bjhunt-vps
# equivalent a : ssh -p 443 -i ~/.ssh/bjhunt_vps root@82.25.117.79
```

La config SSH est dans `~/.ssh/config` :
```
Host bjhunt-vps
    HostName 82.25.117.79
    Port 443
    User root
    IdentityFile ~/.ssh/bjhunt_vps
    IdentitiesOnly yes
```

### Pourquoi port 443
Le FAI de l'utilisateur **bloque TOUS les ports sauf 80 et 443**. SSH passe par sslh qui multiplex SSH et HTTPS sur le port 443. **Ne jamais tenter SSH sur le port 22**, ca timeout.

### Specs VPS
- **IP** : 82.25.117.79 (IPv6: 2a02:4780:28:3349::1)
- **OS** : Ubuntu 25.10
- **Plan** : KVM 8 — 8 vCPU, 32GB RAM, 400GB disk
- **Disque utilise** : 27GB (7%) — nettoye le 14 avril 2026
- **Datacenter** : Paris (id: 15)
- **VPS ID** : 1295179 (pour API Hostinger / MCP)
- **Firewall ID** : 255451
- **Expiration** : 25 janvier 2027
- **Auto-renewal** : active

### Services actifs sur le VPS
- **sslh** : systemd, ecoute 0.0.0.0:443, dispatch SSH→localhost:22 + TLS→localhost:8443
  - Config : `/etc/default/sslh`
  - DAEMON_OPTS : `--user sslh --listen 0.0.0.0:443 --ssh 127.0.0.1:22 --tls 127.0.0.1:8443`
- **sshd** : systemd, ecoute port 22 + 8022, cle ed25519 dans `/root/.ssh/authorized_keys`
- **UFW** : actif, default deny incoming, allow outgoing
  - Ports TCP ouverts : 22, 80, 443, 2222, 8022, 25, 587, 465, 993, 4190, 8888, 5000, 3005, 8080, 18789, 19000:19999
- **Docker** : installe mais aucun container actif (tout a ete nettoye)

### Firewall Hostinger (niveau hyperviseur)
- Port 22 TCP any → accept
- Port 80 TCP any → accept
- Port 443 TCP any → accept
- Port 2222 TCP any → accept
- Port 8022 TCP any → accept

### Etat du disque VPS
```
/dev/sda1  387G  27G  360G  7%  /
```
Docker : aucune image, aucun container, aucun volume actif.

### Structure fichiers VPS
```
/opt/bjhunt/app/       ← clone de ce repo (bjhuntcom-oss/bjhunt)
/opt/bjhunt/stack/     ← docker-compose et .env (preserve de l'ancien)
/opt/bjhunt/stack/.env ← secrets de production (PG password, API keys, etc.)
/srv/bjhunt/           ← donnees persistantes (postgres, runtimes, uploads)
```

### Audit securite VPS (14 avril 2026) — PROPRE
- Aucune backdoor trouvee
- Seul user root (UID 0)
- Aucun crypto-miner
- Aucune connexion suspecte
- /tmp et /dev/shm propres
- SUID binaires tous normaux (containerd)
- Monarx antimalware installe
- Snapshot de sauvegarde cree

---

## MCP Servers

Configures dans `.mcp.json` a la racine du repo.

### Hostinger MCP (`hostinger-mcp`)
Gestion complete du VPS depuis Claude Code : machines virtuelles, firewall, DNS, backups, snapshots, cles SSH, metriques.
- Type : stdio, `npx hostinger-api-mcp@latest`
- API Token : hardcoded dans `.mcp.json` (NE PAS utiliser `${input:...}` — ca se perd entre sessions)
- Outils principaux : `VPS_getVirtualMachinesV1`, `VPS_getFirewallListV1`, `VPS_syncFirewallV1`, `VPS_createSnapshotV1`, `VPS_getMetricsV1`, `VPS_getProjectListV1`, `VPS_getProjectLogsV1`, `DNS_getDNSRecordsV1`

### Playwright MCP (`mcp-playwright`)
Automatisation navigateur : tests E2E, connexions web, audit visuel.
- Type : stdio, `npx -y @playwright/mcp@latest`
- Sessions existantes : Hostinger hPanel connecte, Vercel connecte, GitHub connecte (tout via Google `bjhuntcom@gmail.com`)

### AIDesigner MCP (`aidesigner`)
- Type : http, URL `https://api.aidesigner.ai/api/v1/mcp`

### Kali MCP Server (`kali-mcp-server`) — DISABLED
- Type : sse, URL `http://localhost:8000/sse`
- Pas encore deploye

---

## Comptes et credentials

- **GitHub** : `bjhuntcom-oss` — connecte via Google `bjhuntcom@gmail.com`
  - **ATTENTION** : 2FA non active ! Deadline **27 mai 2026** sinon compte restreint
  - Repo actuel : `bjhuntcom-oss/bjhunt`
  - Repo legacy : `bjhuntcom-oss/bjhunt-v1-legacy`
- **Vercel** : `bjhunts-projects` (plan Hobby) — connecte via GitHub
  - Projet `bjhunt` deploye automatiquement depuis le repo GitHub
- **Hostinger** : API key dans `.mcp.json`
- **Ollama Cloud** : API key `9c6a5c691a4e4ac6980225065e8f44b1.vMDEl3SWpffjmhLd__jc9mPJ`
  - Provider `ollama-cloud` dans l'ancienne config gateway
  - Base URL : `https://ollama.com/v1`
  - Modeles : GLM-5.1, GLM-5, GLM-4.7, DeepSeek-V3.2, DeepSeek-V3.1, Kimi K2
- **Email utilisateur** : `leformateurcha@gmail.com` (compte Claude/Anthropic)

---

## Regles de developpement

- Code securise — c'est une plateforme de cybersecurite, la securite est NON-NEGOCIABLE
- SQL toujours parametre, jamais d'interpolation de strings
- Argon2id pour les passwords, AES-256-GCM pour les secrets
- RLS PostgreSQL pour l'isolation multi-tenant
- Pas de `unsafe-eval` dans le CSP
- Valider TOUS les inputs avec Zod (backend) et aussi cote frontend
- Rate limiting Redis sur TOUS les endpoints publics
- Pas de secrets dans le code — tout dans `.env`
- Docker pour l'isolation — jamais d'execution directe sur le host
- Tests de securite dans le CI (Trivy, Gitleaks)
- Commits avec prefix conventionnel : `feat:`, `fix:`, `chore:`, `ci:`, `docs:`, `refactor:`
- Ajouter `Co-Authored-By: Claude <noreply@anthropic.com>` dans les commits

---

## TODO — Ce qu'il faut faire (dans l'ordre)

### Etape 1 : Re-clone et audit Decepticon
1. Supprimer `engine/` actuel
2. `git clone https://github.com/PurpleAILAB/Decepticon.git engine/` (sans le .git/)
3. Auditer TOUT le code Python : `decepticon/agents/`, `decepticon/tools/`, `decepticon/core/`, `decepticon/middleware/`, `decepticon/llm/`
4. Auditer les Dockerfiles dans `containers/`
5. Auditer `docker-compose.yml` et `config/litellm.yaml`
6. Auditer les tests dans `tests/`
7. Lire et comprendre la doc dans `docs/`
8. Identifier tout ce qui doit etre modifie pour l'adaptation BJHUNT

### Etape 2 : Adapter Decepticon pour BJHUNT
1. Securiser les credentials par defaut (generer des vrais secrets)
2. Ajouter une couche d'auth sur l'API LangGraph (port 2024)
3. Renforcer le SafeCommandMiddleware (bloquer `exec`, `source`, `$()`)
4. Retirer le montage Docker socket si possible
5. Adapter la config LiteLLM pour nos providers (Ollama Cloud, Anthropic, OpenAI)
6. Adapter les Dockerfiles pour notre stack
7. Rebrander les references Decepticon → BJHUNT

### Etape 3 : Construire le backend API
1. Creer `backend/` avec Hono + Bun
2. Schema PostgreSQL : users, organizations, sessions, engagements, findings, api_keys, audit_logs, platform_settings
3. Auth : register, login, logout, sessions Lucia, password reset, API keys
4. Middleware : CORS (whitelist origins), CSRF (origin check), rate limiting Redis, session resolution
5. Routes admin : users CRUD, settings, audit logs, providers, agents
6. Routes engagements : CRUD engagement, lancement d'agent, suivi statut, resultats
7. Integration Decepticon : HTTP client vers LangGraph API (port 2024), streaming SSE
8. Health checks : /api/health/live, /api/health/ready, /api/health/version

### Etape 4 : Docker Compose production
1. `docker-compose.yml` a la racine du repo
2. Services : caddy, backend, langgraph (decepticon), postgres, redis, neo4j, sandbox (kali), litellm
3. Reseaux isoles : `bjhunt-mgmt` (caddy, backend, langgraph, pg, redis) + `bjhunt-sandbox` (sandbox, neo4j)
4. Volumes persistants pour PG, Redis, Neo4j, uploads
5. Caddy config : api.bjhunt.com → backend:3001, chat.bjhunt.com → langgraph:2024

### Etape 5 : Connecter le frontend
1. Verifier que `lib/backend-client.ts` pointe vers le bon URL
2. Adapter les pages auth (login, register, forgot-password)
3. Adapter le dashboard (overview, settings, API keys)
4. Adapter le dashboard admin (users, providers, agents, logs)
5. Connecter le chat AI au backend → LangGraph streaming

### Etape 6 : Premier deploiement
1. Push sur GitHub → CI passe
2. SSH bjhunt-vps → `cd /opt/bjhunt/app && git pull`
3. Copier `.env` → `docker compose up -d`
4. Verifier health checks
5. Tester le frontend
6. Configurer le DNS si necessaire

### Etape 7 : Finalisation
1. Activer 2FA GitHub (deadline 27 mai)
2. Opt-out Copilot training (avant 24 avril)
3. Configurer monitoring (metriques, alertes)
4. Tests E2E avec Playwright
