# 02 — Backend cible (rebuild)

> Décidé en Phase 2 (recherche du 2026-04-29) après la purge du backend legacy Hono+Bun + Decepticon.

## Stack retenue

| Couche | Choix | Pourquoi |
|---|---|---|
| **Orchestration multi-agent** | OpenHands SDK V1 + LangGraph | Hybride : LangGraph pour le graph state + checkpointing, OpenHands pour le workspace Docker per-engagement et le SecurityAnalyzer typé |
| **Runtime backend HTTP** | Hono sur Bun | Conservé : router minimal, SSE first-class, perf top |
| **LLM router** | LiteLLM proxy | Multi-provider (Ollama Cloud, Anthropic, OpenAI, futur RunPod self-hosted) |
| **Persistence conversations** | LangGraph Postgres checkpointer | Replay natif via `thread_id`, pas à coder |
| **Streaming events miroir** | Postgres `stream_events` table + Redis Streams | Persist 7j RLS + replay via cursor `Last-Event-ID` |
| **Sandbox tools execution** | OpenHands DockerWorkspace per-engagement, exécuté sur Fly.io Firecracker microVM | Isolation hardware-level — non négociable pour exec exploits |
| **Knowledge graph attaque** | Neo4j 5.24 community | Reuse from legacy, attack chains modeling |
| **Cache + queue** | Redis 7 | Sessions, rate-limit, pub/sub cancellation |
| **Auth** | À décider — candidats : BetterAuth, Auth.js v5, Clerk, custom | Voir [10-DECISIONS.md](10-DECISIONS.md) |
| **Object storage** | Cloudflare R2 | Reports PDF, evidence files, sandbox artifacts ; backup target |
| **Observability** | OpenTelemetry → Grafana Cloud OR Sentry | À trancher au moment du rebuild |
| **Inference IA** | Modal (H100/A100 scale-to-zero) | Quand on quitte Ollama Cloud ou pour boost ponctuel |

## Architecture cible (vue logique)

```
                     ┌────────────────────┐
                     │ Frontend Next.js   │
                     │ (Vercel)           │
                     └─────────┬──────────┘
                               │
                               │ POST /api/chat/prepare (cookie auth)
                               │ ← {runId, ticket(JWT 5min, org_id)}
                               │
                               │ GET /api/chat/stream/:runId?ticket=&cursor=
                               │       Last-Event-ID: <seq>     (SSE long-lived)
                               ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │  Backend Hono+Bun (Fly.io Firecracker, 2-50 microVMs auto-scale) │
   │  ┌───────────────────────────────────────────────────────────┐   │
   │  │ Edge layer                                                │   │
   │  │ - verify ticket + extract org_id                         │   │
   │  │ - withOrg(org_id, ...) sets Postgres app.current_org_id  │   │
   │  │ - AbortSignal end-to-end                                  │   │
   │  └───────────────────────────────────────────────────────────┘   │
   │  ┌───────────────────────────────────────────────────────────┐   │
   │  │ Stream relay                                              │   │
   │  │ - Redis XREAD stream:{org_id}:{run_id}                    │   │
   │  │ - Cursor replay from Last-Event-ID                        │   │
   │  │ - Heartbeat ping every 15s                                │   │
   │  └───────────────────────────────────────────────────────────┘   │
   │  ┌───────────────────────────────────────────────────────────┐   │
   │  │ Orchestrator (Python, LangGraph)                          │   │
   │  │ - thread_id = {org_id}:{run_id}                           │   │
   │  │ - stream_mode = ["values", "custom", "messages"]         │   │
   │  │ - checkpointer = PostgresSaver                            │   │
   │  │ - 17 sub-agents (cf 07-AGENTS-CATALOG.md)                 │   │
   │  └───────────────────────────────────────────────────────────┘   │
   │              │                                                   │
   │              ▼                                                   │
   │  ┌───────────────────────────────────────────────────────────┐   │
   │  │ OpenHands DockerWorkspace per-engagement                  │   │
   │  │ - 1 sandbox Kali per active engagement (TTL 30min idle)   │   │
   │  │ - SecurityAnalyzer (LOW/MED/HIGH per command)             │   │
   │  │ - Tool budget enforced (max 100 tools/audit Pro tier)     │   │
   │  └───────────────────────────────────────────────────────────┘   │
   │              │                                                   │
   │              │ LLM calls via LiteLLM                             │
   │              ▼                                                   │
   │  ┌───────────────────────────────────────────────────────────┐   │
   │  │ LiteLLM proxy → Ollama Cloud (GLM-5.1, DeepSeek, Kimi)    │   │
   │  │                → Modal H100/A100 (heavy reasoning)        │   │
   │  │                → Anthropic Claude 4.7 (fallback premium)  │   │
   │  └───────────────────────────────────────────────────────────┘   │
   └──────────────────────────────────────────────────────────────────┘
                               │
                               │ Persistence (private wireguard)
                               ▼
              ┌──────────────────────────────────────┐
              │  Hetzner Cloud Falkenstein (DE)      │
              │  ┌────────────────────────────────┐  │
              │  │ Postgres 17                    │  │
              │  │  - tenant data + RLS FORCE     │  │
              │  │  - LangGraph checkpoints       │  │
              │  │  - stream_events (7j RLS)      │  │
              │  └────────────────────────────────┘  │
              │  ┌────────────────────────────────┐  │
              │  │ Neo4j 5.24                     │  │
              │  │  - 1 DB per tenant             │  │
              │  │  - attack chains, asset graph  │  │
              │  └────────────────────────────────┘  │
              │  ┌────────────────────────────────┐  │
              │  │ Redis 7                        │  │
              │  │  - sessions, rate-limit        │  │
              │  │  - Streams stream:{org}:{run}  │  │
              │  │  - pub/sub cancellation        │  │
              │  └────────────────────────────────┘  │
              │  Daily backup → Cloudflare R2        │
              └──────────────────────────────────────┘
```

## Modules backend

```
backend/
├── src/
│   ├── server.ts                       # Hono entrypoint, middleware chain
│   ├── auth/                           # Sessions + 2FA + RBAC (TBD framework)
│   ├── chat/
│   │   ├── prepare.ts                  # POST /api/chat/prepare → ticket
│   │   ├── stream.ts                   # GET /api/chat/stream/:runId (SSE)
│   │   ├── replay.ts                   # GET /api/chat/stream/:runId/replay?cursor=
│   │   └── cancel.ts                   # POST /api/chat/:runId/cancel
│   ├── orchestrator/
│   │   ├── agent.py                    # LangGraph orchestrator (Python)
│   │   ├── subagents/                  # 17 specialized agents
│   │   ├── tools/                      # Tool registry (nmap, sqlmap, nuclei, ...)
│   │   ├── workspace.py                # OpenHands DockerWorkspace wrapper
│   │   └── analyzer.py                 # SecurityAnalyzer (cmd → severity)
│   ├── stream/
│   │   ├── publisher.ts                # Redis XADD + Postgres mirror
│   │   ├── subscriber.ts               # Redis XREAD + cursor replay
│   │   └── events.ts                   # 12 typed event schemas (Zod)
│   ├── tenancy/
│   │   ├── with-org.ts                 # withOrg(orgId, fn) RLS context
│   │   ├── quota.ts                    # Tier limits enforcement
│   │   └── isolation.ts                # Sandbox/Neo4j per-tenant
│   ├── findings/
│   │   ├── ingest.ts                   # Tool output → structured Finding
│   │   ├── store.ts                    # Persist + dedupe
│   │   └── export.ts                   # PDF/JSON/SARIF rendering
│   ├── billing/                        # Stripe (post-MVP)
│   ├── admin/                          # Internal admin (logs, users, quotas)
│   └── lib/
│       ├── db.ts                       # Postgres client (appSql + adminSql)
│       ├── redis.ts                    # Redis client
│       ├── litellm.ts                  # LiteLLM proxy client
│       ├── crypto.ts                   # AES-GCM for secrets at rest
│       └── errors.ts                   # AppError taxonomy
├── migrations/                         # Postgres schema migrations
├── Dockerfile                          # Bun base, multi-stage
├── package.json
└── README.md
```

## Choix de framework agentique — détail

**OpenHands SDK V1** (MIT, arxiv:2511.03690 nov 2025) apporte ce que LangGraph n'a pas :

| Besoin | LangGraph seul | OpenHands seul | Hybride retenu |
|---|---|---|---|
| Graph state machine | ✅ Natif | ❌ Linear ReAct | LangGraph |
| Multi-agent sub-graph | ✅ Send API | ⚠️ Sequential delegations | LangGraph |
| Streaming token + state | ✅ stream_mode | ✅ EventStream | LangGraph (plus mature SSE) |
| Checkpointing | ✅ Postgres saver | ❌ JSON disk | LangGraph |
| **DockerWorkspace per-tenant** | ❌ DIY | ✅ Built-in | **OpenHands** |
| **SecurityAnalyzer typé** | ❌ DIY | ✅ Built-in | **OpenHands** |
| MCP server support | ⚠️ Via wrapper | ✅ Native | OpenHands |
| Multi-LLM router | ⚠️ Via LangChain | ✅ LiteLLM natif | OpenHands |

LiteLLM est commun aux deux → switch Ollama Cloud → RunPod self-hosted = 1 ligne de config.

## Migration depuis le legacy

L'engine Decepticon (17 agents, vendor PurpleAILAB Apache-2.0) est archivé dans le repo privé `bjhuntcom-oss/bjhunt-legacy-engine`.

Pour le rebuild, on peut :
1. **Réimplémenter from scratch** avec OpenHands ABCs (`Agent`, `Workspace`, `Tool`) — recommandé pour un design propre
2. **Adapter les SKILL.md** (skills de techniques d'attaque) en outils OpenHands MCP — réutilisable
3. **Ne pas réutiliser** les Python middleware legacy (SafeCommandMiddleware, etc.) — remplacer par `SecurityAnalyzer` OpenHands

## Critères de succès du rebuild

- [ ] POC : 1 user, 1 audit, 1 sandbox éphémère, streaming complet en SSE
- [ ] 5 audits parallèles sans interférence cross-tenant (test isolation)
- [ ] Reprise audit après deconnexion réseau client (replay cursor)
- [ ] Cost per audit < $0.50 (LLM + sandbox compute)
- [ ] Latency premier token < 2s
- [ ] Disponibilité backend > 99.5%
