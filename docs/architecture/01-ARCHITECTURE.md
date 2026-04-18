# 01 — Architecture Systeme

## Vue d'ensemble

```
INTERNET
   │
   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  VERCEL (Edge CDN)                                                   │
│  bjhunt.com / www.bjhunt.com                                        │
│                                                                      │
│  Next.js 15 (App Router)                                             │
│  ├── Pages marketing (home, pricing, investors, legal, contact)     │
│  ├── Auth (login, register, forgot-password, reset-password)        │
│  ├── Dashboard User (overview, audits, chat, settings, API keys)    │
│  ├── Dashboard Admin (users, agents, LLM, logs, monitoring)         │
│  └── SSE Client (EventSource → api.bjhunt.com/stream/{jobId})      │
└────────────────────────┬─────────────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌──────────────────────────────────────────────────────────────────────┐
│  VPS HOSTINGER — 82.25.117.79 (Paris)                                │
│  8 vCPU │ 32GB RAM │ 400GB NVMe │ Ubuntu 25.10                      │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  sslh (port 443) — Multiplex SSH + TLS                        │  │
│  │  SSH → localhost:22  │  TLS → localhost:8443                   │  │
│  └──────────┬────────────────────┬───────────────────────────────┘  │
│             │                    │                                    │
│          SSH:22              TLS:8443                                 │
│             │                    │                                    │
│             │  ┌─────────────────▼──────────────────────────────┐    │
│             │  │  CADDY (reverse proxy)                         │    │
│             │  │  :80 (redirect) + :8443 (TLS)                  │    │
│             │  │                                                │    │
│             │  │  api.bjhunt.com → backend:3001                 │    │
│             │  │  api.bjhunt.com/stream/* → backend:3001        │    │
│             │  │    (flush_interval -1, no buffering)           │    │
│             │  └──────────────────┬─────────────────────────────┘    │
│             │                     │                                   │
│             │  ┌──────────────────▼─────────────────────────────┐    │
│             │  │  BACKEND API (Hono + Bun)                      │    │
│             │  │  Port 3001 — bjhunt-mgmt network               │    │
│             │  │                                                │    │
│             │  │  ├── Auth (register, login, logout, sessions)  │    │
│             │  │  ├── RBAC (user, admin, super_admin)           │    │
│             │  │  ├── Job Manager (BullMQ → Redis)              │    │
│             │  │  ├── Stream Relay (SSE transparent proxy)      │    │
│             │  │  ├── Admin API (users, settings, monitoring)   │    │
│             │  │  └── Health (/live, /ready, /version)          │    │
│             │  └──────┬───────────────┬────────────────────────┘    │
│             │         │               │                              │
│             │         │          ┌────▼───────────────────────┐      │
│             │         │          │  REDIS 7                   │      │
│             │         │          │  ├── BullMQ job queue      │      │
│             │         │          │  ├── Rate limiting         │      │
│             │         │          │  ├── Session cache         │      │
│             │         │          │  └── Pub/Sub (events)      │      │
│             │         │          └────────────────────────────┘      │
│             │         │                                              │
│             │    ┌────▼───────────────────────────────────────┐      │
│             │    │  LANGGRAPH SERVER (Decepticon Engine)      │      │
│             │    │  Port 2024 — bjhunt-mgmt network           │      │
│             │    │  Python 3.13, LangGraph, LangChain         │      │
│             │    │                                            │      │
│             │    │  ┌──────────────────────────────────────┐  │      │
│             │    │  │  ORCHESTRATEUR DECEPTICON            │  │      │
│             │    │  │  ├── Soundwave (planning)            │  │      │
│             │    │  │  ├── Recon (OSINT, scan)             │  │      │
│             │    │  │  ├── Exploit (SQLi, SSTI, creds)     │  │      │
│             │    │  │  ├── PostExploit (privesc, lateral)  │  │      │
│             │    │  │  ├── Analyst (code review, CVE)      │  │      │
│             │    │  │  ├── Reverser (ELF/PE, Ghidra)       │  │      │
│             │    │  │  ├── Contract Auditor (Solidity)     │  │      │
│             │    │  │  ├── Cloud Hunter (AWS/K8s)          │  │      │
│             │    │  │  ├── AD Operator (BloodHound)        │  │      │
│             │    │  │  └── VulnResearch pipeline           │  │      │
│             │    │  │      (Scanner→Detector→Verifier→     │  │      │
│             │    │  │       Patcher→Exploiter→Defender)     │  │      │
│             │    │  └──────────────────────────────────────┘  │      │
│             │    └──────┬─────────────────────────────────────┘      │
│             │           │                                            │
│             │    ┌──────▼─────────────────────────────────────┐      │
│             │    │  LITELLM PROXY                             │      │
│             │    │  Port 4000 — bjhunt-mgmt network            │      │
│             │    │  Routes vers: Anthropic, OpenAI,           │      │
│             │    │  Ollama Cloud, Google                       │      │
│             │    │  Spend tracking → PostgreSQL               │      │
│             │    └────────────────────────────────────────────┘      │
│             │                                                        │
│  ┌──────────▼────────────────────────────────────────────────────┐   │
│  │  DOCKER NETWORKS                                              │   │
│  │                                                               │   │
│  │  bjhunt-mgmt (bridge)                                        │   │
│  │  ├── caddy                                                   │   │
│  │  ├── backend                                                 │   │
│  │  ├── langgraph                                               │   │
│  │  ├── litellm                                                 │   │
│  │  ├── postgres                                                │   │
│  │  └── redis                                                   │   │
│  │                                                               │   │
│  │  bjhunt-sandbox (bridge, internal)                            │   │
│  │  ├── langgraph (dual-homed)                                  │   │
│  │  ├── kali-sandbox-{session-id} (ephemere)                    │   │
│  │  └── neo4j                                                   │   │
│  │                                                               │   │
│  │  NOTE: sandbox containers n'ont PAS acces a bjhunt-mgmt      │   │
│  │  Ils ne peuvent pas atteindre Caddy, Backend, Redis, PG      │   │
│  └───────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │  POSTGRESQL 17     │  │  NEO4J 5.24        │                     │
│  │  bjhunt-mgmt       │  │  bjhunt-sandbox    │                     │
│  │                    │  │                    │                     │
│  │  ├── users         │  │  Attack chain      │                     │
│  │  ├── organizations │  │  knowledge graph   │                     │
│  │  ├── sessions      │  │  (nodes: hosts,    │                     │
│  │  ├── engagements   │  │   services, vulns, │                     │
│  │  ├── findings      │  │   credentials,     │                     │
│  │  ├── api_keys      │  │   attack paths)    │                     │
│  │  ├── audit_logs    │  │                    │                     │
│  │  ├── jobs          │  └────────────────────┘                     │
│  │  ├── quotas        │                                             │
│  │  └── litellm_spend │                                             │
│  └────────────────────┘                                             │
└──────────────────────────────────────────────────────────────────────┘
```

## Flux de donnees principaux

### Flux 1 — Lancement d'audit (happy path)

```
1. User clique "New Audit" dans le dashboard
2. Frontend POST /api/engagements { target, scope, roe }
3. Backend valide input (Zod), verifie quotas user
4. Backend cree engagement dans PostgreSQL
5. Backend pousse job dans BullMQ (Redis)
6. Frontend ouvre EventSource sur /stream/{jobId}
7. Worker BullMQ prend le job
8. Worker assigne un container Kali du warm pool
9. Worker appelle LangGraph POST /threads/{id}/runs/stream
10. LangGraph demarre l'orchestrateur Decepticon
11. Decepticon delegue a Soundwave (planning)
12. Soundwave cree CONOPS + OPPLAN
13. Decepticon delegue a Recon (scanning)
14. Recon execute nmap, nuclei dans le sandbox Kali
15. Chaque output est streame: LangGraph → Backend → Frontend
16. Findings decouverts sont persistes dans PostgreSQL + Neo4j
17. Decepticon delegue a Exploit, PostExploit, etc.
18. Boucle vaccinale: Attack → Defense → Verification
19. Rapport final genere
20. Container Kali detruit, pool replenish
21. User recoit notification "Audit complete"
```

### Flux 2 — Streaming live (detail technique)

```
LLM Provider (Anthropic/OpenAI)
    │ stream=True, token par token
    ▼
LangGraph Agent Runtime
    │ Event types: on_llm_stream, on_tool_start, on_tool_end, on_chain_end
    │ Encode en SSE (text/event-stream)
    ▼
Backend Hono (relay transparent)
    │ ReadableStream.pipeTo() — ZERO copie
    │ Headers: X-Accel-Buffering: no
    ▼
Caddy (reverse proxy)
    │ flush_interval -1 — flush immediat
    ▼
Frontend EventSource
    │ Parse event types, route vers composants UI
    ▼
React Components
    ├── AgentThinking (tokens un par un, typing effect)
    ├── ToolExecution (terminal live, commandes + output)
    ├── FindingCard (pop en temps reel avec severity badge)
    ├── ProgressBar (phase actuelle, agents actifs)
    └── AgentTransition (animation de switch entre agents)
```

### Flux 3 — Authentification

```
1. User POST /api/auth/login { email, password }
2. Backend verifie password (Argon2id)
3. Backend cree session dans PostgreSQL
4. Backend set cookie HttpOnly Secure SameSite=Lax
5. Chaque requete suivante: middleware extrait session du cookie
6. Sessions expirent apres 30 jours d'inactivite
7. Refresh automatique: session prolongee a chaque requete
```

## Composants et responsabilites

### Frontend (Next.js 15 sur Vercel)
- **SSR** pour les pages marketing (SEO)
- **CSR** pour le dashboard (interactivite)
- **SSE client** pour le streaming live
- **Server Actions** pour les mutations auth
- **Middleware** pour le CSP nonce-based et la locale detection
- **i18n** avec next-intl (FR/EN)

### Backend API (Hono + Bun)
- **Authentification** : register, login, logout, forgot/reset password, API keys
- **Autorisation** : RBAC (user, admin, super_admin), ownership checks
- **Job management** : creation, queue, statut, annulation
- **Stream relay** : proxy SSE transparent vers LangGraph
- **Admin** : CRUD users, monitoring agents, config LLM, audit logs
- **Health** : /live (process up), /ready (DB + Redis connected), /version

### LangGraph Server (Decepticon)
- **Orchestration** multi-agent avec state machine
- **Streaming** natif (events, messages, updates)
- **Thread-based** : chaque audit = un thread LangGraph avec state persiste
- **Tools** : execution de commandes dans le sandbox Kali
- **Boucle vaccinale** : Attack → Defense → Verification

### Kali Sandbox
- **Ephemere** : cree par job, detruit apres
- **Isole** : reseau bjhunt-sandbox, pas d'acces au management
- **Outille** : nmap, nuclei, sqlmap, hydra, sliver, tmux, etc.
- **Limite** : 2GB RAM, 2 vCPU max par container
- **Warm pool** : 2-3 containers pre-crees pour eviter le cold start

### PostgreSQL 17
- **Multi-tenant** via Row-Level Security (RLS)
- **Schema** : users, orgs, sessions, engagements, findings, jobs, api_keys, audit_logs, quotas
- **Spend tracking** pour LiteLLM
- **Backup** : pg_dump quotidien + snapshot VPS hebdomadaire

### Redis 7
- **BullMQ** : job queue pour les audits (priorite, retry, concurrency)
- **Rate limiting** : sliding window par IP et par user
- **Session cache** : resolution rapide des sessions (evite hit PG a chaque requete)
- **Pub/Sub** : notifications temps reel (job complete, finding critique)

### Neo4j 5.24
- **Knowledge graph** des chaines d'attaque
- **Nodes** : Host, Service, Vulnerability, Credential, AttackPath
- **Relations** : EXPOSES, VULNERABLE_TO, LEADS_TO, AUTHENTICATES
- **Queries Cypher** pour la visualisation des attack paths
- **Isole** sur bjhunt-sandbox (seul LangGraph y accede)

### LiteLLM Proxy
- **Routing** multi-provider : Anthropic, OpenAI, Ollama Cloud, Google
- **Fallback** : si un provider est down, bascule automatiquement
- **Spend tracking** : cout par requete, par user, par provider
- **Rate limiting** : quotas par plan (Free: 10 req/min, Pro: 100 req/min)
- **Config** : `config/litellm.yaml`

### Caddy
- **Auto-TLS** via Let's Encrypt
- **Reverse proxy** vers backend (port 3001)
- **Streaming** : `flush_interval -1` sur les routes /stream/*
- **HTTP/3** active par defaut
- **Security headers** : HSTS, X-Frame-Options, X-Content-Type-Options
