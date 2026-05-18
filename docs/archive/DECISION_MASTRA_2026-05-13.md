# DÉCISION TECHNIQUE — Intégration de Mastra dans BJHUNT

> **Référence** : BJHUNT-DEC-2026-002  
> **Date** : 2026-05-13  
> **Auteur** : BJHUNT 4 MAX Agent d'évaluation  
> **Statut** : Recommandation  
> **Sources** : mastra.ai/docs, GitHub mastra-ai/mastra (23.8k stars, v1.32.0), audit codebase BJHUNT complet  
> **Contexte préalable** : `recherche-mastra-complete.md` (13 mai 2026)

---

## Résumé exécutif

Mastra est un framework TypeScript mature (23.8k stars, 14 986 commits) qui propose agents, workflows, memory, RAG et observability. Son intérêt principal pour BJHUNT est de **remplacer LangGraph (Python)** par un orchestrateur TypeScript natif et de **combler le gap mémoire/RAG** actuellement inexistant. Cependant, les dépendances `@mastra/core`, `@mastra/memory` et `@mastra/observability` sont **déjà présentes dans le `package.json` backend sans être utilisées dans le code source**. La recommandation est une **intégration partielle et progressive** : adopter Mastra Workflows pour l'orchestration (remplacement de LangGraph), activer Mastra Memory pour le RAG documentaire des rapports de conformité, et utiliser Mastra Observability en complément de Sentry. **Ne pas migrer** : l'auth (BetterAuth reste supérieur), le streaming SSE (Redis Streams custom > Mastra streaming), la gestion sandbox E2B, et le multi-tenant RLS.

---

## 1. État des lieux

### 1.1 Dépendances Mastra déjà installées

`bjhunt-backend/package.json` contient :
- `@mastra/core: ^1.33.0` (non utilisé)
- `@mastra/memory: ^1.18.0` (non utilisé)
- `@mastra/observability: ^1.12.0` (non utilisé)

Aucun import de `@mastra/*` n'existe dans `src/`. Les packages sont installés mais dormants.

### 1.2 Architecture actuelle de l'orchestration

**LangGraph (Python)** dans `bjhunt-orchestrator/` :
- `graph.py` : `StateGraph(BJHUNTState)` avec nodes `coordinator → recon → scan → exploit → report_generator`
- `state.py` : TypedDict avec `messages`, `findings`, `scope`, `phase`, `tool_results`, etc.
- `events.py` : traduction checkpoints → vocabulaire SSE BJHUNT (12 events typés)
- `main.py` : FastAPI server exposant `/runs`, `/runs/{id}/stream` (SSE), `/runs/{id}/messages`, etc.
- Checkpointer LangGraph pour persistance via `asyncpg`

**Engine adapter** (`engine-adapter.ts`) :
- Pattern façade qui route `BJHUNT_ENGINE_MODE=orchestrator|openclaude`
- `orchestrator-client.ts` traduit les appels backend → HTTP vers le FastAPI orchestrator
- Support HITL (`submitToolDecision`), settings updates live, scope file writes

**SSE** (`sse.ts`) :
- Redis Streams (XADD/XREAD avec BLOCK) pour le live
- Postgres mirror (`stream_events`) pour resume via Last-Event-ID (7j retention)
- 12 events typés (`run.started`, `agent.started`, `agent.thinking`, `agent.tool_call`, `agent.tool_result`, `agent.finding`, `agent.canvas`, `secret.redacted`, `evidence.captured`, `dream.diary_entry`, `agent.completed`, `run.completed`) + `error.scope_violation` + `error.runtime`

---

## 2. Analyse comparative détaillée

### 2.1 Matrice fonctionnelle

| Fonctionnalité | Actuel BJHUNT | Mastra | Adéquation |
|---|---|---|---|
| **Workflow engine** | LangGraph StateGraph (Python, ~64 lignes de graph) | `createWorkflow` + `.then()/.branch()/.parallel()` (TS natif) | Mastra plus concis, type-safe, pas de bridge Python↔TS |
| **Agent orchestration** | StateGraph avec nodes coordinator/recon/scan/exploit/report | Supervisor pattern natif + sub-agents | Mastra plus riche (memory, streaming, delegation hooks) |
| **Memory / RAG** | **N/A** — pas implémenté | `Memory` class + Observational Memory + Semantic Recall + `MDocument` chunking + PgVector | **Gap majeur comblé** |
| **Observability** | Sentry (manuel, traces échantillonnées 5%) | OpenTelemetry natif + Studio UI + metrics auto (coût/tokens) | Mastra supérieur pour debugging agentique |
| **SSE streaming** | Redis Streams + Postgres mirror + resume Last-Event-ID | Streaming via AI SDK (textStream, events workflow) | BJHUNT custom **supérieur** (resume, mirror, Redis) |
| **Auth** | BetterAuth (email+pwd, 2FA TOTP, passkey, org plugin) | Basic JWT / Clerk / Auth0 / BetterAuth via adapters | **Ne pas migrer** — BetterAuth intégré et éprouvé |
| **Multi-tenant / RLS** | Drizzle + Postgres policies RLS FORCE + `withTenant()` wrapper | N/A — pas de couche multi-tenant native | **Ne pas migrer** — BJHUNT custom est critique |
| **Sandbox lifecycle** | E2B / Docker / mock (tri-mode) avec spawn/kill/healthcheck | N/A — pas de sandbox management | **Ne pas migrer** |
| **Scope guard / Hooks** | 3 hooks `.cjs` (scope-guard, evidence-capture, redact-secrets) | Tool approval + guardrails | BJHUNT hooks **supérieurs** (fail-closed, chain-of-custody) |
| **Human-in-the-loop** | LangGraph interrupts + `submitToolDecision` | `suspend()/resume()` + `requireApproval` | Équivalent fonctionnel |
| **PDF reporting** | Typst 14 templates + PKCS#7 signing | N/A — pas de reporting PDF | **Ne pas migrer** |

### 2.2 Comparaison LangGraph vs Mastra Workflows

| Critère | LangGraph (Python) Actuel | Mastra Workflows |
|---|---|---|
| Langage | Python (FastAPI + asyncpg) | TypeScript (Bun natif) |
| Type safety | TypedDict (runtime-checked) | Zod/Valibot/ArkType (compile-time) |
| Verbosité | 64 lignes de graph + 68 state + 217 events | ~80 lignes équivalentes |
| Bridge overhead | HTTP FastAPI ↔ Bun backend | Direct (même runtime Bun) |
| Memory/RAG | Non inclus | Intégré |
| Observability | Non inclus | Intégré |
| Checkpointer | asyncpg LangGraph checkpointer | Storage adapter (LibSQL/PG) |
| Streaming | astream("values") + traduction customs vers SSE | stream natif mais vocabulaire différent |
| Maturité | Très mature (LangChain écosystème) | Jeune mais rapide (v1.32, 23.8k stars) |
| Lock-in | Dépend de LangChain/LangSmith | Apache 2.0, multi-provider |

---

## 3. Analyse de risque par option

### Option A : Intégration complète (tout migrer vers Mastra)

| Dimension | Analyse |
|---|---|
| **Impact code** | ~2000+ lignes à réécrire : `engine-adapter.ts`, `orchestrator-client.ts`, `sse.ts`, `auth.ts`, `sandbox.ts`, `db.ts` |
| **Risque régression** | **CRITIQUE** : auth BetterAuth perdue → failles sécurité ; SSE custom (Redis+mirror+resume) remplacé par streaming Mastra moins robuste ; RLS multi-tenant perdu ; sandbox E2B non géré |
| **Bénéfice** | Unification TypeScript intégrale, DX uniforme |
| **Coût** | 4-6 semaines développeur, risques sécurité inacceptables |
| **Compatibilité** | **Incompatible** avec l'architecture hybride existante |
| **Verdict** | ❌ **REJETÉ** |

### Option B : Intégration partielle (workflows + memory + observability)

| Dimension | Analyse |
|---|---|
| **Impact code** | ~500 lignes : nouveau `mastra-orchestrator.ts` + modification `engine-adapter.ts` + activation memory/observability |
| **Risque régression** | **FAIBLE** : auth/sandbox/SSE/RLS/hooks intacts ; seul le bridge orchestrateur change |
| **Bénéfice** | Orchestration TS native, memory/RAG comblés, observabilité agentique, plus de bridge Python↔TS, suppression de `bjhunt-orchestrator/` entier |
| **Coût** | 1.5-2 semaines développeur |
| **Compatibilité** | Excellente — Mastra tourne dans le même runtime Bun que le backend, partage Redis/Postgres |
| **Verdict** | ✅ **RECOMMANDÉ** |

### Option C : Ne pas intégrer

| Dimension | Analyse |
|---|---|
| **Impact code** | 0 ligne |
| **Risque régression** | Aucun |
| **Bénéfice** | Aucun — stagnation sur les gaps (memory, RAG) |
| **Coût** | 0 à court terme ; dette croissante (bridge Python↔TS à maintenir) |
| **Compatibilité** | Statu quo |
| **Verdict** | ⚠️ **VIABLE COURT TERME, NON RECOMMANDÉ LONG TERME** |

---

## 4. Recommandation

### **Intégration partielle et progressive de Mastra**

Ne **PAS** intégrer Mastra d'un bloc. Intégrer **3 composants spécifiques** de manière incrémentale, en préservant les composants BJHUNT critiques existants.

#### 4.1 Ce qu'on intègre

| Composant Mastra | Justification | Priorité |
|---|---|---|
| **Mastra Workflows** | Remplace LangGraph (Python) → suppression du bridge HTTP, orchestration TS native dans le même runtime Bun, plus concis (`.then/.branch/.parallel` vs StateGraph manuel) | **P0** |
| **Mastra Memory + RAG** | Comble le gap mémoire documentaire : chunking des politiques de sécurité/réglementations, retrieval sémantique pour les agents de reporting, Observational Memory pour les longs audits | **P1** |
| **Mastra Observability** | Complète Sentry avec traces agentiques OpenTelemetry, monitoring coût LLM (CostGuard), métriques tokens/latence, debugging visuel via Studio | **P1** |

#### 4.2 Ce qu'on NE migre PAS

| Composant BJHUNT | Justification |
|---|---|
| **BetterAuth** | Auth complète (email+pwd, 2FA TOTP, passkey WebAuthn, org plugin) — Mastra n'offre pas d'équivalent |
| **SSE Redis Streams** | Architecture custom avec Redis Streams + Postgres mirror + resume Last-Event-ID — supérieure au streaming Mastra pour la fiabilité et la reprise |
| **Multi-tenant RLS** | `withTenant()` wrapper + Postgres RLS FORCE — critique et non réplicable dans Mastra |
| **Sandbox E2B/Docker** | Gestion complète du cycle de vie (spawn/kill/healthcheck/reap) — hors scope Mastra |
| **Hooks .cjs** | scope-guard fail-closed, evidence-capture avec sha256+ledger, redact-secrets 15+ patterns — spécifiques BJHUNT et éprouvés |
| **PDF Typst + PKCS#7** | 14 templates compliance + signature — hors scope Mastra |

---

## 5. Plan de migration

### Phase A : Mastra Workflows (remplacement orchestrateur) — P0

**Objectif** : Supprimer `bjhunt-orchestrator/` (Python/LangGraph/FastAPI) et le remplacer par un orchestrateur Mastra Workflows TS natif dans `bjhunt-backend`.

**Étapes** :

1. **Créer `src/mastra/workflows/audit-workflow.ts`**
   - Traduire le StateGraph en `createWorkflow` Mastra :
     ```typescript
     export const auditWorkflow = createWorkflow({
       id: 'audit',
       inputSchema: z.object({ chatId: z.string(), scope: ScopeSchema, /* ... */ }),
       outputSchema: z.object({ outcome: z.string(), reportRefs: z.record(z.string()) }),
     })
       .then(coordinatorStep)
       .branch([reconBranch, scanBranch, exploitBranch, reportBranch])
       .commit()
     ```
   - Traduire chaque node Python en `createStep` TS avec les tools natifs

2. **Créer `src/mastra/agents/*.ts`**
   - Traduire les 38 personas markdown en agents Mastra avec `instructions`, `model`, `tools`
   - Conserver la sélection dynamique agents via `agentsEnabled`

3. **Créer `src/lib/mastra-orchestrator.ts`**
   - Nouveau backend pour `engine-adapter.ts` :
     - `startOrchestrator()` → `mastra.getWorkflow('audit').createRun().start()`
     - `sendMessage()` → inject dans le workflow state
     - `killOrchestrator()` → `run.stop()`
     - Bridge events Mastra → `writeEvent()` (Redis SSE + Postgres mirror)
   - Traduire les events workflow Mastra (`workflow-start`, `step-start`, `step-finish`, etc.) en vocabulaire SSE BJHUNT (`agent.started`, `agent.thinking`, etc.)

4. **Adapter `engine-adapter.ts`**
   - Nouveau mode `BJHUNT_ENGINE_MODE=mastra`
   - Le fallback `openclaude` reste intact
   - L'ancien mode `orchestrator` est marqué `@deprecated`

5. **Tests**
   - Traduire `tests/smoke/run-e2e.sh` pour le mode mastra
   - Ajouter des tests unitaires sur la traduction d'events Mastra → BJHUNT

6. **Cleanup**
   - Supprimer `bjhunt-orchestrator/`
   - Supprimer `orchestrator-client.ts`
   - Retirer la dépendance Python du déploiement

**Livrables** : PR unique avec ~400-600 lignes nouvelles, suppression de ~1000 lignes Python.

### Phase B : Mastra Memory + RAG — P1

**Objectif** : Activer la mémoire documentaire pour le RAG des politiques de conformité.

**Étapes** :

1. **Configurer le storage Mastra**
   - Utiliser le Postgres existant (`@mastra/pg`) comme storage adapter
   - Router le domaine `memory` via `MastraCompositeStore` (défaut = PG, pas besoin de libSQL supplémentaire)

2. **Indexer les documents de conformité**
   - Chunker les 14 frameworks de compliance (OWASP ASVS, PCI-DSS, ISO 27001, etc.) via `MDocument.chunk()`
   - Embedder avec `openai/text-embedding-3-small` (ou modèle local)
   - Stocker dans PgVector (extension déjà installée sur Hostinger)

3. **Brancher sur les agents de reporting**
   - Les agents reporting (`report-pci-dss-v4`, `report-iso-27001-2022`, etc.) utilisent le RAG pour référencer les exigences exactes
   - L'agent coordinator peut interroger le knowledge base pour contextualiser les findings

4. **Activer Observational Memory** (optionnel, Phase 3)
   - Pour les audits > 500 messages, compression automatique de l'historique

**Livrables** : Script d'indexation + configuration Mastra instance + agents reporting enrichis.

### Phase C : Mastra Observability — P1

**Objectif** : Compléter Sentry avec des traces agentiques.

**Étapes** :

1. **Configurer `Observability` dans l'instance Mastra**
   - `MastraStorageExporter` → persiste dans PG (domaine `observability`)
   - `MastraPlatformExporter` → conditionnel si `MASTRA_PLATFORM_ACCESS_TOKEN`
   - Pas de DuckDB/ClickHouse en Phase 2 (overkill pour le volume actuel)

2. **Activer le CostGuard**
   - `CostGuardProcessor` avec budget par chat/thread
   - Alertes Sentry si dépassement

3. **Studio Mastra** (optionnel)
   - `npx mastra dev` pour le debugging local
   - Pas déployé en production

**Livrables** : Configuration observability + CostGuard + complémentarité avec Sentry.

---

## 6. Architecture cible

```
┌─────────────────────────────────────────────────────────┐
│ bjhunt-backend (Hono + Bun, port 8080)                  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Mastra Instance (même runtime Bun)                  │ │
│ │                                                     │ │
│ │ ┌─────────────────┐ ┌──────────────┐ ┌───────────┐ │ │
│ │ │ Workflows       │ │ Memory + RAG │ │ Observab. │ │ │
│ │ │ (orchestration) │ │ (PgVector)   │ │ (OTel)    │ │ │
│ │ └────────┬────────┘ └──────────────┘ └───────────┘ │ │
│ └──────────┼──────────────────────────────────────────┘ │
│            │                                            │
│ ┌──────────┴──────────────────────────────────────────┐ │
│ │ Couches BJHUNT préservées                           │ │
│ │                                                     │ │
│ │ ┌──────────┐ ┌────────┐ ┌───────┐ ┌─────────────┐ │ │
│ │ │BetterAuth│ │SSE     │ │Sandbox│ │RLS/withTenant│ │ │
│ │ │(sessions)│ │(Redis) │ │(E2B)  │ │(Postgres)    │ │ │
│ │ └──────────┘ └────────┘ └───────┘ └─────────────┘ │ │
│ └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 7. Impact sur le JOURNAL et la roadmap

### JOURNAL.md — ajouts proposés

```markdown
## 2026-05-13 — Décision Mastra : intégration partielle progressive

### Analyse comparative complète
- Docs : `DECISION_MASTRA_2026-05-13.md`
- Décision : intégrer Workflows (remplace LangGraph), Memory+RAG, Observability
- Ne pas intégrer : Auth (BetterAuth), SSE (Redis), RLS, Sandbox E2B, Hooks .cjs

### Package.json
- `@mastra/core`, `@mastra/memory`, `@mastra/observability` déjà installés mais inutilisés
- Activation planifiée Phase 2.3 (workflows) → 2.4 (memory) → 2.5 (observability)

### Prochaines étapes
- [ ] PR `feat/mastra-workflows` : orchestrateur Mastra remplace LangGraph Python
- [ ] PR `feat/mastra-memory` : RAG documentaire compliance
- [ ] PR `feat/mastra-observability` : traces agentiques + CostGuard
```

### Roadmap impact

| Phase | Impact Mastra |
|---|---|
| Phase 2.3 (courant) | Ajout Mastra Workflows comme 3e mode engine (`BJHUNT_ENGINE_MODE=mastra`) |
| Phase 2.4 | Activation Mastra Memory + RAG compliance |
| Phase 2.5 | Activation Mastra Observability |
| Phase 3+ | Suppression définitive de `bjhunt-orchestrator/` (Python) quand mastra mode est stable |

### Coût vs bénéfice

| Item | Estimation |
|---|---|
| Temps développeur total | 1.5-2 semaines (P0) + 1 semaine (P1) |
| Code supprimé (Python orchestrator) | ~1000 lignes (main.py + graph.py + state.py + events.py + nodes/) |
| Code ajouté (TS Mastra workflows + memory + obs) | ~800 lignes |
| Dépendances supprimées | Python, FastAPI, LangGraph, asyncpg, uvicorn → 0 dépendance Python |
| Risques éliminés | Bridge HTTP Python↔TS, double sérialisation JSON, deux runtimes à debugger |
| Bénéfice DX | Orchestration + backend dans le même processus Bun, debugging unifié, type safety bout en bout |

---

## 8. Alternatives si non-intégration

Si la décision est de ne pas intégrer Mastra du tout, voici les alternatives pour chaque gap :

| Gap | Alternative sans Mastra |
|---|---|
| **Orchestration** | Garder LangGraph (Python) — dette du bridge HTTP maintenue |
| **Memory / RAG** | Implémenter manuellement avec PgVector (déjà présent) + `@xenova/transformers` pour embeddings locaux, ou API OpenAI embeddings |
| **Observability agentique** | Continuer avec Sentry seul (traces limitées, pas de vision agentique) + logs structurés manuels |
| **Chunking** | Librairie dédiée type `llamaindex` TS ou implementation custom |

Ces alternatives sont viables mais représentent une **dette d'intégration** croissante : chaque feature devrait être construite from scratch plutôt que d'utiliser un framework éprouvé.

---

## 9. Références

- [Mastra Documentation](https://mastra.ai/docs)
- [Mastra GitHub](https://github.com/mastra-ai/mastra) — 23.8k stars, Apache 2.0
- [Recherche Mastra complète](recherche-mastra-complete.md) — analyse détaillée de toutes les features
- [JOURNAL.md](JOURNAL.md) — historique du projet
- [ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md](ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md) — architecture hybride cible

---

*Document généré par BJHUNT 4 MAX Agent d'évaluation technique. À valider par le lead technique avant exécution.*
