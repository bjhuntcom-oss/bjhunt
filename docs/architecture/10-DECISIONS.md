# 10 — Décisions d'architecture (ADR)

> Une ADR par décision structurante. Format : contexte, décision, alternatives écartées, conséquences.

## ADR-001 — Purge totale du backend legacy
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Le repo monorepo contenait un backend Hono+Bun custom + un fork Decepticon (17 agents Python LangGraph) + un VPS Hostinger avec 12 services Docker. ~50 findings audit non résolus, dette W4-W11 estimée 13-15j. Pas de monétisation effective. Le rebuild from-scratch coûte ≤ combler la dette.

**Décision** : Purger backend, engine, ops, dashboard. Garder uniquement frontend marketing public. Archiver l'engine dans `bjhunt-legacy-engine` privé.

**Alternatives écartées** : continuer la dette (ROI négatif), refonte progressive (trop lent).

**Conséquences** :
- ✅ Repo propre
- ✅ VPS Hostinger libéré (2.9 GB / 387 GB)
- ❌ Aucun produit fonctionnel temporairement (4-8 sem rebuild)

---

## ADR-002 — Fork openclaude (TS) comme base agent runtime
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Phase 2 recherche A→Z a comparé 30+ frameworks agentiques + approches build-vs-buy. L'utilisateur veut modifier des prompts/agents existants (pas écrire from scratch), en TypeScript (mono-langage avec frontend Next.js), sur une base déjà mature.

**Décision** : Fork **`Gitlawb/openclaude`** (~25k stars, MIT, TypeScript ~99%, multi-provider OpenAI-compat, 523 commits, mainteneur très actif — support Opus 4.7 mergé J0) dans `bjhuntcom-oss/bjhunt-engine` privé. Modifier prompts système + tools + agent personas pour métier cybersec offensive. Wrapper SaaS thin layer en Hono+Bun custom.

**Forces du fork** :
- 45 tools built-in (Bash, Read/Write/Edit, Glob, Grep, Agent, Task*, MCP, WebFetch, etc.)
- gRPC streaming bidirectionnel (mappé 1:1 sur nos 12 events SSE)
- Multi-LLM routing natif via `agentRouting` (compatible LiteLLM)
- MCP support natif + plugin system + slash commands
- Sub-agents : `LocalAgentTask` + `RemoteAgentTask` cadre prêt pour Soundwave/Recon/Exploit/Reporter

**Alternatives écartées** :
- *LangGraph + Decepticon* : Python, bi-langage, déjà rejeté avec la purge
- *CrewAI / Pydantic AI / smolagents / OpenHands SDK* : Python, idem
- *Mastra* : TS bon, mais module enterprise sous ELv2 — friction si on veut RBAC enterprise
- *Vercel AI SDK seul + custom orchestrator* : viable mais 4-6 sem dev pour parité avec openclaude
- *Claude Agent SDK officiel Anthropic* : MIT propre, mais primitive — il faudrait reconstruire le chat agent loop par-dessus
- *warpdotdev/warp* : Rust desktop natif + AGPL v3 sur 80 % du repo → écarté

**Conséquences** :
- ✅ Mono-langage TS pour solo dev
- ✅ Time-to-MVP réduit (prompts + tools + streaming UX déjà conçus)
- ✅ Pas de dépendance framework Python

---

## ADR-003 — Mono-langage TypeScript / Bun pour le backend
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Le legacy avait 2 langages (TS frontend + Python engine). Pour solo dev, maintenir 2 toolchains = surcoût (build, tests, deps, refactor, on-call).

**Décision** : Tout TypeScript. Backend Hono sur Bun 2.0+. Orchestrator (fork openclaude modifié) en TS. Pas de Python.

**Alternatives écartées** :
- *Bi-langage TS+Python* : surcoût solo dev
- *Tout Rust* : courbe d'apprentissage trop raide
- *Tout Go* : abandonner l'expertise frontend équipe

**Conséquences** :
- ✅ Toolchain unique (bun, tsc, biome)
- ✅ Type sharing frontend/backend possible (Zod schemas)
- ✅ Embauche junior TS facile
- ❌ Écosystème ML/IA Python (LangChain, etc.) inaccessible — mais on n'en a pas besoin si openclaude couvre

---

## ADR-004 — Hosting backend : Fly.io (cdg + ams)
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : BJHUNT exécute des outils Kali (`nmap -sS` raw socket, sqlmap exploit chain). Container shared kernel = ÉLIMINATOIRE. SSE long-lived 5-30 min nécessaire.

**Décision** : Fly.io régions cdg (Paris) + ams (Amsterdam). Firecracker microVM = isolation hardware-level. Pas de timeout proxy SSE.

**Alternatives écartées** :
- *AWS Fargate* : Firecracker OK mais 3× prix, lock-in IAM, Cloud Act US-owner
- *GCP Cloud Run* : gVisor seul, NET_RAW bloqué = `nmap -sS` KO
- *Lambda / Vercel Edge / Cloudflare Workers* : timeouts SSE incompatibles audits 30 min
- *Coolify+Hetzner seul pour backend* : containers shared kernel, disqualifié pour exec exploits sandboxes
- *Modal* : gVisor partiel, Python SDK lock-in

**Conséquences** :
- ✅ Migration sortie facile (Docker)
- ✅ EU hardware (cdg + ams) pour latence + souveraineté partielle
- ❌ Fly.io = US-owner (pas total souverain mais hardware EU + SOC2 + GDPR)
- ❌ Fly GPU déprécie août 2026 (mais on n'utilise pas Fly GPU)

---

## ADR-005 — Sandbox : E2B.dev managed BYOC EU
**Date** : 2026-04-29
**Statut** : Accepté (avec plan migration Daytona à scale)

**Contexte** : 1 sandbox Kali per-engagement. Solo dev veut managed (pas coder le runtime sandbox).

**Décision** : E2B.dev avec BYOC sur région EU. Plan Pro $150/mo + $0.05/h base. Image custom `bjhunt-kali`.

**Alternatives écartées** :
- *Modal sandboxes* : gVisor partiel, Python SDK
- *Replit / CodeSandbox* : containers shared kernel, KO Kali
- *Daytona* : excellent OSS Apache mais self-host coûte 1 sem ops setup
- *Firecracker direct* (ignite, fly machines) : 2-3 sem dev pour spawn-orchestration robuste

**Migration future** : >$5k/mo sandbox usage → bascule Daytona self-host (1 sem migration)

**Conséquences** :
- ✅ Time-to-MVP <2 sem pour sandbox-ready
- ✅ Firecracker isolation hardware
- ❌ Vendor managed cost (acceptable jusqu'à scale)

---

## ADR-006 — DBs : Hetzner Cloud Falkenstein self-host
**Date** : 2026-04-29
**Statut** : Accepté

**Contexte** : Souveraineté EU pure pour données client (vulnérabilités, evidence, findings). Cloud Act US = risque commercial enterprise.

**Décision** : VPS CCX43 Hetzner Falkenstein DE (~€100/mo). Postgres 17 + Redis 7 + LiteLLM proxy + Caddy via Coolify (orchestration locale, OSS Apache). Backups vers Cloudflare R2 + Backblaze B2.

**Alternatives écartées** :
- *AWS RDS Paris* : 4-5× prix, US-owner (Cloud Act)
- *Supabase* : US-owner, EU regions OK, mais lock-in plateforme
- *Neon* : serverless Postgres, EU regions, US-owner, racheté Databricks
- *Aiven (Finlande)* : EU souverain, mais 3× prix Hetzner self-host
- *Self-host Hostinger VPS* : déjà testé legacy, downtime/uptime variable, abandonné

**Conséquences** :
- ✅ Souveraineté EU pure (DE jurisdiction)
- ✅ Prix imbattable
- ❌ Ops nous-mêmes (backup, patches, upgrades)
- ❌ Single-region (acceptable <5k users, multi-region Phase 5)

---

## ADR-007 — Streaming : SSE typé + Redis Streams + JWT ticket
**Date** : 2026-04-29
**Statut** : Accepté

**Décision** : SSE primary transport, JWT ticket court (5 min) pour auth, Redis Streams par tenant pour live tail + Postgres `stream_events` table pour persistence 7j. 12 events typés.

**Alternatives écartées** : WebSocket (overkill bidi pas requis), gRPC-web (overhead proto), HTTP/2 push (deprecated), cookies + EventSource (CORS cross-subdomain fragile).

**Conséquences** :
- ✅ Standard 2026 (OpenAI, Anthropic, Vercel AI SDK)
- ✅ Auto-reconnect natif
- ✅ Multi-tenant safe via channel naming + JWT verify

---

## ADR-008 — Multi-tenancy : Postgres RLS FORCE + 1 sandbox per engagement + pgvector (pas Neo4j)
**Date** : 2026-04-29
**Statut** : Accepté

**Décision** : 6 couches isolation. Postgres RLS FORCE + role app NOSUPERUSER NOBYPASSRLS + 1 E2B sandbox per engagement + SecretRegistry per-tenant + pgvector pour knowledge graph (au lieu de Neo4j separate-DB-per-tenant).

**Pourquoi pgvector au lieu de Neo4j** :
- 1 DB technology de moins à opérer (Hetzner self-host)
- RLS unifié avec le reste
- Suffit pour MVP (recursive CTEs Postgres pour attack chains)
- Migration possible plus tard si Cypher devient bloquant

**Conséquences** :
- ✅ Defense-in-depth
- ✅ Simplicité ops
- ❌ Performance graph queries < Neo4j (acceptable MVP)

---

## ADR-009 — Souveraineté EU & RGPD natif (avec exception LLM)
**Date** : 2026-04-29
**Statut** : Accepté

**Décision** : Toutes les données tenant (PG, Redis, R2 EU jurisdiction) hébergées en EU. **Exception LLM** : Ollama Cloud (US) reçoit des prompts dont les secrets sont masqués via SecretRegistry. À terme RunPod EU regions (Romania/Czech/Iceland) pour modèle propriétaire = full EU.

**Alternatives écartées** :
- *Tout US* : disqualifie marché EU enterprise
- *Tout EU strict (incluant LLM)* : LLM EU souverain coûteux + catalogue limité (Mistral, Scaleway), accepter Ollama Cloud US comme compromis temporaire avec mitigation SecretRegistry

**Conséquences** :
- ✅ Pitch souveraineté différenciant pour EU enterprise
- ✅ Compliance prête pour SOC2 + ISO 27001 future
- ⚠️ Disclosure obligatoire dans AUP que les prompts transitent par US

---

## ADR-010 — Auth : BetterAuth (TS, OSS)
**Date** : 2026-04-29
**Statut** : Accepté

**Décision** : BetterAuth (TS, sessions DB-backed Postgres, support 2FA TOTP, plugins extensibles). Self-host sur le backend Fly.io.

**Alternatives écartées** :
- *Auth.js v5 (NextAuth)* : très intégré Next mais sessions JWT par défaut (faiblesse pour révocation immédiate)
- *Clerk* : managed, top UX, mais $25/mo + lock-in cloud + data US
- *Custom* : surface attaque trop large pour solo dev ; déjà tenté legacy

**Conséquences** :
- ✅ Mono-langage TS
- ✅ Sessions DB-backed = révocation immédiate possible
- ✅ Self-host = data EU
- ❌ Moins mature que Clerk (acceptable, pourrait migrer plus tard)

---

## ADR-011 — Frontend marketing reste sur Vercel
**Date** : 2026-04-29
**Statut** : Accepté

**Décision** : Garder Vercel pour le marketing site. Le futur dashboard authentifié peut soit rester sur Vercel (preview deploys + edge SSR) soit basculer sur Fly.io selon les besoins SSE long.

**Alternatives écartées** : Auto-host Caddy + Next.js sur Hetzner (pas justifié vs gratuit Vercel), Cloudflare Pages (pas d'avantage net), AWS Amplify (pricing).

**Conséquences** :
- ✅ Zero-effort deploy + preview branches
- ❌ Vendor lock-in léger (mitigation : stack standard Next.js portable)

---

## Comment ajouter une nouvelle ADR

1. Numéro suivant
2. Date + Statut (Proposé / Accepté / Déprécié / Remplacé par ADR-XXX)
3. Sections : Contexte, Décision, Alternatives écartées, Conséquences
4. PR avec discussion préalable si décision majeure
5. Update `docs/README.md` index
