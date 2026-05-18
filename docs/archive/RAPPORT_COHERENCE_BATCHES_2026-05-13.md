# RAPPORT DE COHERENCE INTER-BATCHES — BJHUNT 4 MAX
**Date : 2026-05-13**
**Agent : Superviseur BJHUNT 4 MAX**
**Perimetre : 4 batches d'implementation + architecture existante (backend, frontend, docker-compose)**

---

## RESUME EXECUTIF

| Metrique | Valeur |
|---|---|
| **Incoherences 🔴** | 6 |
| **Warnings 🟡** | 7 |
| **Verifications OK ✅** | 7 |
| **Severite globale** | **HAUTE** — 6 incoherences bloquantes dont 3 P0 |
| **Etat d'avancement reel** | Batch 1 deja fait (personas copies). Batches 2, 3, 4 n'ont **aucun artefact** produit dans la codebase |

**Constat principal** : L'architecture cible documentee dans `ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md` (395 lignes) est coherente et bien pensee, mais **aucun des fichiers de code des Batches 2, 3, 4 n'a ete cree** dans `D:\bjhunt-orchestrator\`. Seul le Batch 1 (copie des personas) est effectivement realise. Le Batch 4 a produit un document de recherche Mastra mais pas le document de decision ADR formel.

---

## 1. VERIFICATION DETAILLEE PAR CHECKLIST

### 1.1. Les nouvelles nodes sont dans graph.py (build_graph)

| Verification | Fichiers | Statut |
|---|---|---|
| Nodes Batch 2 (scope_guard, evidence_capture, redact_secrets, detect_disclosure, canvas_broadcast) dans build_graph() | `graph.py` | 🔴 INCOHERENCE |
| Node Batch 3 (openhands_runtime) dans build_graph() | `graph.py` | 🔴 INCOHERENCE |

**Detail** : `graph.py` definit un graphe lineaire `coordinator -> recon -> scan -> exploit -> report_generator -> END`. Les 5 hooks `.cjs` a migrer n'ont **aucune node correspondante** dans le graphe. Aucune reference a OpenHands non plus.

**Consequence** : Meme si les fichiers Python existaient, le graphe ne les executerait pas.

**Suggestion** : 
- Integrer les hooks comme des nodes conditionnelles ou comme des `pre/post` hooks sur les nodes existantes (LangGraph supporte les `NodeSpec` avec callbacks)
- `scope_guard` devrait etre une node `PreToolUse` interceptant tous les tool calls
- `evidence_capture` une node `PostToolUse`
- `canvas_broadcast` une node `PostToolUse`
- `detect_disclosure` et `redact_secrets` des nodes `UserPromptSubmit` (pre-message processing)

---

### 1.2. Les imports dans __init__.py des nodes sont a jour

| Verification | Fichiers | Statut |
|---|---|---|
| __init__.py exporte les nouvelles nodes | `nodes/__init__.py` | 🔴 INCOHERENCE |

**Detail** : `nodes/__init__.py` n'exporte que les 5 nodes existantes + `execute_tool`. Aucune des nouvelles nodes des batches 2 ou 3 n'est importee.

```python
# nodes/__init__.py actuel
from .coordinator import coordinator_node
from .recon import recon_node
from .scan import scan_node
from .exploit import exploit_node
from .report_generator import report_generator_node
from .tool_executor import execute_tool
```

**Suggestion** : Ajouter les imports pour `scope_guard_node`, `evidence_capture_node`, etc. au fur et a mesure de leur creation.

---

### 1.3. tool_executor.py appelle les nouvelles fonctions avec les bons params

| Verification | Fichiers | Statut |
|---|---|---|
| execute_tool() est compatible avec les params des hooks migres | `tool_executor.py` | 🟡 WARNING |
| execute_tool() est compatible avec OpenHands Runtime (Batch 3) | `tool_executor.py` | 🔴 INCOHERENCE |

**Detail** : 
- `execute_tool()` (l.34-112) est un wrapper HTTP POST vers `http://bjhunt-sandbox:8000/sandbox/execute`. Il attend un `sandbox_id`, un `tool`, des `args`, un `target` et des `flags`.
- Les hooks `.cjs` de l'engine appellent `curl`/`wget`/`nmap` directement dans la sandbox Kali — ils ne passent pas par `execute_tool()` dans l'architecture actuelle. Dans l'architecture cible, ils DOIVENT passer par le tool_executor ou par OpenHands.
- `execute_tool()` ignore totalement les `SecurityAnalyzer` d'OpenHands (Pattern, PolicyRail, LLM). Si Batch 3 remplace la sandbox E2B par OpenHands, `tool_executor.py` doit etre reecrit pour utiliser `openhands_client.execute_action()` au lieu de `httpx.post(SANDBOX_URL)`.

**Suggestion** : 
- Creer un `OpenHandsClient` dans `tool_executor.py` (ou un fichier separe `openhands_client.py`) qui wrap l'API OpenHands
- Backward-compat : detecter le mode via `BJHUNT_SANDBOX_MODE=e2b|openhands`

---

### 1.4. events.py importe et appelle les nouvelles fonctions

| Verification | Fichiers | Statut |
|---|---|---|
| translate_state_to_events() gere les nouveaux events (scope_violation, evidence_captured, dream, canvas) | `events.py` | ✅ OK |

**Detail** : `events.py` gere deja les events suivants dans `translate_state_to_events()` :
- `agent.started` (l.39-49)
- `agent.thinking` (l.52-100)
- `agent.finding` via fenced `bjhunt-finding` (l.67-77)
- `evidence.captured` via fenced `bjhunt-evidence` (l.78-88)
- `dream.diary_entry` via fenced `bjhunt-dream` (l.90-100)
- `agent.tool_call` + `agent.tool_result` (l.103-131)
- `error.scope_violation` (l.134-146)
- `run.completed` + `agent.completed` (l.149-168)

**Ce qui manque** : 
- Pas de `secret.redacted` event (redact-secrets.cjs)
- Pas de `agent.canvas` / `canvas.write` event (canvas-broadcast.cjs)
- Pas de traitement pour les detection de `detect-disclosure-attempt` (mais ce hook ne produit pas d'event SSE — il injecte juste un `additionalContext`)

C'est un warning mineur car ces events peuvent etre ajoutes facilement.

---

### 1.5. registry.py peut etre importe par les nodes qui veulent charger une persona

| Verification | Fichiers | Statut |
|---|---|---|
| PersonaRegistry est accessible depuis les nodes | `registry.py`, `coordinator.py` | 🟡 WARNING |

**Detail** : 
- `PersonaRegistry` (l.8-30) charge les personas depuis `personas/prompts/*.md` (41 fichiers)
- Le `coordinator.py` actuel n'importe **pas** `PersonaRegistry` — il utilise un `SEQUENCE` hard-code (l.4) `["planning", "recon", "scan", "report"]`
- Aucune node n'utilise les personas pour le moment
- Les personas sont charges mais jamais lus par le runtime !

**Suggestion** : 
- Le `coordinator_node` devrait utiliser `PersonaRegistry.load()` pour selectionner dynamiquement les agents a deployer selon les `agents_enabled` et `compliances_required`
- Les nodes `recon`, `scan`, `exploit` devraient utiliser `PersonaRegistry.get(agent_id)` pour recuperer le system prompt adapte

---

### 1.6. Les nouvelles env vars sont documentees dans docker-compose.yml

| Verification | Fichiers | Statut |
|---|---|---|
| docker-compose.yml contient les env vars pour LangGraph (Batch 1-2) | `docker-compose.yml` | 🟡 WARNING |
| docker-compose.yml contient les env vars pour OpenHands (Batch 3) | `docker-compose.yml` | 🔴 INCOHERENCE |
| docker-compose.yml contient les env vars recommandees par le doc Mastra | `docker-compose.yml` | 🟡 WARNING |

**Detail** : 
- `docker-compose.yml` declare deja pour le service `orchestrator` : `CHECKPOINT_POSTGRES_URI`, `BJHUNT_SANDBOX_URL`, `BJHUNT_TOOL_TIMEOUT`, `BJHUNT_ORCHESTRATOR_SECRET`, `PORT`, `HOST`
- Le document `ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md` (l.267) recommande 7 nouvelles env vars **non presentes** dans docker-compose.yml :
  - `MASTRA_STORAGE_URL` 
  - `LANGGRAPH_API_URL`
  - `OPENHANDS_API_URL`
  - `OTEL_EXPORTER_OTLP_ENDPOINT`
  - `MASTRA_COSTGUARD_MAX_AUDIT_USD`
  - `BJHUNT_SANDBOX_IMAGE`
  - `BJHUNT_DISABLE_LEGACY_ENGINE`
- Aucun service `bjhunt-sandbox-openhands` ou `bjhunt-mastra` n'est defini dans le compose

**Suggestion** : Ajouter un service `openhands-sandbox` et `mastra-backend` (ou etendre le service `backend` existant) avec les env vars recommandeES.

---

### 1.7. Les nouvelles routes (openhands) sont coherentes avec les appels cote orchestrateur

| Verification | Fichiers | Statut |
|---|---|---|
| Routes sandbox dans main.py correspondent aux appels de tool_executor.py | `main.py` (sandbox), `tool_executor.py` | 🔴 INCOHERENCE |

**Detail** : 
- `tool_executor.py` (orchestrator) appelle `POST {SANDBOX_URL}/sandbox/spawn` et `POST {SANDBOX_URL}/sandbox/execute` et `DELETE {SANDBOX_URL}/sandbox/{sandbox_id}`
- Le document d'architecture cible (l.141-145, l.321-333) recommande que le sandbox OpenHands expose `POST /sandbox/spawn`, des handlers pour `TerminalAction`, `CmdRunAction`, etc., et un `EventStream` append-only
- Il n'y a **aucun fichier** `main.py` ou equivalent dans un service sandbox OpenHands — le seul `main.py` existant est celui de l'orchestrator
- Le `docker-compose.yml` reference un service `sandbox` base sur `../bjhunt-sandbox/sandbox/Dockerfile` — mais le path `../bjhunt-sandbox/` n'existe probablement pas comme repo (pas liste dans l'AGENTS.md)

**Suggestion** : 
- Creer un repo ou un dossier `bjhunt-sandbox/` avec un `main.py` OpenHands exposant les routes attendues
- Mettre a jour `tool_executor.py` pour appeler le bon endpoint selon le mode

---

### 1.8. Pas de break dans le flux SSE (orchestrator → backend → frontend)

| Verification | Fichiers | Statut |
|---|---|---|
| evenements SSE produits par l'orchestrator sont consommes par le backend | `events.py`, `orchestrator-client.ts` | ✅ OK |
| evenements SSE backend sont consommes par le frontend | `orchestrator-client.ts`, `bjhunt-runtime.ts` | ✅ OK |
| Les types d'events sont compatibles sur toute la chaine | `events.py`, `orchestrator-client.ts`, `bjhunt-runtime.ts` | 🟡 WARNING |

**Detail** : Le flux SSE est bien defini :
1. **Orchestrateur** (`events.py`) produit des events types (run.started, agent.started, agent.thinking, agent.tool_call, agent.tool_result, agent.finding, evidence.captured, dream.diary_entry, error.scope_violation, agent.completed, run.completed)
2. **Backend** (`orchestrator-client.ts`) consomme le stream SSE via fetch + ReadableStream, parse les events SSE, et les forward via `writeEvent()` vers Redis (XADD) + Postgres (INSERT stream_events)
3. **Frontend** (`bjhunt-runtime.ts`) recoit les events via `useEngagementStream()` et les projette en `ThreadMessageLike[]`

Verification de compatibilite :
- `events.py` emet `agent.started` avec `agent_id`, `agent_type`, `model`, `ts` → frontend ignore cet event (l.164-168 `bjhunt-runtime.ts`)
- `events.py` emet `agent.tool_call` avec `tool`, `tool_label`, `tool_use_id`, `input` → frontend le lit (l.171-183)
- `events.py` emet `agent.tool_result` avec `ok`, `summary`, `ts` → frontend le lit (l.184-191)
- `events.py` emet `agent.finding` avec `finding_id`, `title`, etc. → frontend le lit (l.193-201)
- `events.py` emet `evidence.captured` avec `evidence_id`, `sha256`, etc. → frontend le lit (l.202-209)
- `events.py` emet `dream.diary_entry` avec `diary_id`, `title`, etc. → frontend le lit (l.211-218)
- `events.py` emet `error.scope_violation` avec `blocked_target` → frontend le lit (l.220-228)
- `events.py` emet `run.completed` avec `outcome` → frontend le lit (l.242-248)

**⚠️ Warning** : Le frontend ignore `agent.started` et `agent.completed`. Si le Batch 2 ajoute de nouveaux agents (scope_guard, evidence_collector, etc.), leurs events `agent.started` seront egalement ignores, ce qui pourrait confondre l'operateur.

Le frontend gere `secret.redacted` (l.165-167) mais `events.py` ne l'emet **pas**. C'est le hook `.cjs` redact-secrets qui l'emet directement via le socket SSE — dans l'architecture LangGraph, cet event doit etre emis par une node Python.

Le frontend gere aussi `agent.canvas` (l.166) mais `events.py` ne l'emet pas non plus.

---

## 2. ANALYSE PAR BATCH

### 2.1 Batch 1 — Copier 38 personas engine → orchestrator + update registry.py

| Artefact attendu | Statut | Fichier |
|---|---|---|
| 38 personas copies dans `personas/prompts/` | ✅ OK | `D:\bjhunt-orchestrator\orchestrator\personas\prompts\` (41 fichiers) |
| `registry.py` mis a jour pour charger les personas | ✅ OK | `D:\bjhunt-orchestrator\orchestrator\personas\registry.py` |
| Les nodes utilisent le registry | 🟡 WARNING | Aucune node n'appelle `PersonaRegistry.load()` ou `.get()` |

**Verification du contenu** : 41 fichiers dans `prompts/` dont 38 personas + 2 templates + 1 README. Correspond au catalogue attendu (coordinator, recon-osint, web-pentester, ad-internal, report-pci-dss-v4, etc.).

**Gap** : Le `coordinator_node` (l.4) utilise une `SEQUENCE` hard-codee sans reference aux personas. Pour que le Batch 1 soit completement integre, il faut :
- Que `coordinator_node` charge `PersonaRegistry.load()` et selectionne les agents selon `agents_enabled`
- Que chaque node specialisee (`recon`, `scan`, etc.) utilise `PersonaRegistry.get(agent_id)` pour son system prompt

---

### 2.2 Batch 2 — Migrer 5 hooks .cjs → nodes LangGraph Python

| Artefact attendu | Statut | Fichier source engine | Emplacement cible |
|---|---|---|---|
| `scope_guard.py` | 🔴 ABSENT | `D:\bjhunt-engine\bjhunt\hooks\scope-guard.cjs` (541 lignes) | `orchestrator/nodes/scope_guard.py` |
| `evidence_capture.py` | 🔴 ABSENT | `D:\bjhunt-engine\bjhunt\hooks\evidence-capture.cjs` (239 lignes) | `orchestrator/nodes/evidence_capture.py` |
| `redact_secrets.py` | 🔴 ABSENT | `D:\bjhunt-engine\bjhunt\hooks\redact-secrets.cjs` (132 lignes) | `orchestrator/nodes/redact_secrets.py` |
| `detect_disclosure.py` | 🔴 ABSENT | `D:\bjhunt-engine\bjhunt\hooks\detect-disclosure-attempt.cjs` (107 lignes) | `orchestrator/nodes/detect_disclosure.py` |
| `canvas_broadcast.py` | 🔴 ABSENT | `D:\bjhunt-engine\bjhunt\hooks\canvas-broadcast.cjs` (79 lignes) | `orchestrator/nodes/canvas_broadcast.py` |
| Imports dans `nodes/__init__.py` | 🔴 ABSENT | — | `nodes/__init__.py` |
| Integration dans `graph.py` | 🔴 ABSENT | — | `graph.py` |

**Analyse de complexite** :
- **scope-guard.cjs** (541L) : Le hook le plus complexe. Parse les tool inputs, extrait URLs/IPs/CIDRs/hosts/fs paths, cross-check avec `scope.in_scope/out_of_scope`, verifie `expires_at`, bloque les self-targets (bjhunt.com, wireguard mesh, cloud metadata). **Complexite de migration : Haute**.
- **evidence-capture.cjs** (239L) : sha256 + redactions + ledger JSONL. **Complexite de migration : Moyenne**.
- **redact-secrets.cjs** (132L) : 15 patterns regex de detection. **Complexite de migration : Faible**.
- **detect-disclosure-attempt.cjs** (107L) : 20 patterns regex. **Complexite de migration : Faible**.
- **canvas-broadcast.cjs** (79L) : Forward de `mcp__tools__write_canvas` vers SSE socket. **Complexite de migration : Faible**.

**Risque d'integration** : Les hooks `.cjs` utilisent `process.env.BJHUNT_SSE_SOCKET` pour emettre des events SSE directement. Dans l'architecture LangGraph, ces emissions doivent passer par le state et etre traduites en events par `translate_state_to_events()`.

---

### 2.3 Batch 3 — MCP Kali → OpenHands Runtime migration

| Artefact attendu | Statut | Emplacement cible |
|---|---|---|
| `openhands_runtime.py` ou equivalent | 🔴 ABSENT | `orchestrator/nodes/` ou service separe |
| `Dockerfile.kali` (OpenHands) | 🔴 ABSENT | `D:\bjhunt-sandbox\sandbox\Dockerfile` |
| Mise a jour `tool_executor.py` | 🔴 ABSENT | `orchestrator/nodes/tool_executor.py` |
| Client OpenHands dans backend | 🔴 ABSENT | `D:\bjhunt-backend\src\lib\openhands-client.ts` |
| Service sandbox dans `docker-compose.yml` | 🔴 ABSENT | `D:\bjhunt-v2\docker-compose.yml` |

**Analyse de la source kali-mcp-server.cjs** (592 lignes) :
- MCP Streamable HTTP (POST /mcp)
- 7 outils : execute_command, read_file, write_file, glob_files, search_content, web_search, write_canvas
- Auth Bearer token HMAC-SHA256
- Origin validation DNS rebinding
- Toutes les commandes executees dans /chat (workspace)

**Ce que OpenHands doit remplacer** :
- `DockerWorkspace` au lieu du spawn Docker manuel
- `SecurityAnalyzer` (Pattern, PolicyRail, LLM) au lieu des hooks scope-guard/evidence-capture
- `EventStream` append-only au lieu du event-relay.cjs
- `AgentSkills` au lieu des personas markdown
- API FastAPI standardisee

**Risque majeur** : L'architecture cible (l.101) met `bjhunt-sandbox` comme un service Python separe avec son propre `DockerWorkspace`. Mais le `docker-compose.yml` actuel utilise un service `sandbox` qui build depuis `../bjhunt-sandbox/sandbox/Dockerfile`. Le repo `bjhunt-sandbox` n'est pas liste dans l'AGENTS.md — il faut le creer.

---

### 2.4 Batch 4 — Mastra evaluation + document de decision

| Artefact attendu | Statut | Fichier |
|---|---|---|
| Document de recherche Mastra | ✅ OK | `D:\bjhunt-v2\docs\recherche-mastra-complete.md` (727 lignes) |
| Document de decision (ADR) | 🟡 WARNING | Pas d'ADR specifique Mastra dans `10-DECISIONS.md` |
| Document d'architecture cible hybride | ✅ OK | `D:\bjhunt-v2\docs\ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md` (395 lignes) |

**Analyse du document de recherche** : Le document `recherche-mastra-complete.md` est exhaustif (sections A a J, tableaux comparatifs, code samples). Il couvre :
- Architecture fondamentale (agents, workflows, memory, RAG)
- Agents (creation, tools, supervisor pattern, streaming)
- Workflows (graph, branches, parallelisme, suspend/resume)
- Memory (stores, observational memory, semantic recall)
- Observability (OTEL, cost guard, tracing)
- Deploiement (Hono server, adapters, SSE)
- Cas d'usage cybersecurite BJHUNT
- Comparatif avec LangGraph, Vercel AI SDK, OpenAI Assistants

**Gap** : Le document d'architecture cible (`ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md`) est une **proposition d'architecture** (Draft, statut "Revue architecte principal"). Il n'a pas ete formalise en ADR dans `10-DECISIONS.md`. Les decisions cles (choix LangGraph pour orchestration, OpenHands pour sandbox, Mastra pour backend API) ne sont pas enregistrees comme ADR acceptees.

**Risque** : Sans ADR formelle, les 4 agents travaillent sur une cible mouvante. Si le document d'architecture change pendant l'implementation, les artefacts produits peuvent devenir incoherents.

---

## 3. INCOHERENCES TRANSVERSALES

### INC-01 🔴 — Langage : TypeScript vs Python

**Description** : L'ADR-003 (mono-langage TS) est en conflit direct avec l'architecture cible qui introduit un service Python `bjhunt-orchestrator` (LangGraph) + un service Python `bjhunt-sandbox` (OpenHands).

**Fichiers concernes** : `10-DECISIONS.md` ADR-003, `ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md` l.38-39

**Analyse** : Le document d'architecture justifie l'exception (l.38-39) : "Il est justifie de faire une exception ciblee : un service bjhunt-orchestrator en Python qui expose une API REST/SSE, appele par le backend TS. Cela preserve le mono-langage TS pour 90% de la codebase."

**Suggestion** : 
- Creer une **ADR-012** qui remplace ou amende l'ADR-003, documentant l'exception Python pour les 2 services d'orchestration
- Justifier par : LangGraph JS moins mature, OpenHands SDK Python-only, cout de reimplementation > cout de maintien bi-langage

---

### INC-02 🔴 — Single Source of Truth pour les events SSE

**Description** : 3 composants peuvent emettre des events SSE dans l'architecture cible : LangGraph (orchestrator), Mastra (backend), OpenHands (sandbox). Aucun mecanisme de deduplication ou de routage unique n'est defini.

**Fichiers concernes** : `events.py`, `orchestrator-client.ts`, (futur) `mastra/index.ts`, (futur) `openhands_runtime.py`

**Analyse** : L'audit ARCH-03 du document d'architecture souligne deja ce probleme : "run.started et run.completed sont emis en double (backend + relay)". L'architecture cible aggrave le probleme en ajoutant Mastra et OpenHands comme emetteurs potentiels.

**Suggestion** : 
- Designer le `bjhunt-orchestrator` (LangGraph) comme **unique source de verite** pour les events de lifecycle (run.started, run.completed, agent.*)
- Les events OpenHands (observations, security alerts) doivent etre forwardes VERS LangGraph, qui les integre dans son state et les re-emet normalises
- Mastra ne doit emettre QUE les events de streaming LLM (text-delta) et deleguer le reste a LangGraph

---

### INC-03 🔴 — Etat partage entre LangGraph et Mastra

**Description** : LangGraph maintient un `BJHUNTState` (TypedDict Python) avec `findings`, `scope`, `tool_results`, etc. Mastra maintient sa propre `Memory` (TS) avec `threads`, `resources`, `observational memory`. Ces deux etats representent le meme audit mais ne sont pas synchronises.

**Fichiers concernes** : `state.py` (BJHUNTState), `recherche-mastra-complete.md` section D

**Suggestion** : 
- Definir un **contrat d'etat canonique** (JSON Schema ou Pydantic partage) entre LangGraph et Mastra
- LangGraph est le "master" de l'etat d'audit (findings, tool_results, phase)
- Mastra est le "master" de l'etat conversationnel (messages, memory, preferences)
- Un adapter `mastra-to-langgraph-state.ts` et `langgraph-to-mastra-state.py` assure la synchronisation bidirectionnelle

---

### INC-04 🟡 — Les personas sont charges mais inutilises

**Description** : 38 personas sont correctement copies et le `PersonaRegistry` fonctionne, mais **aucune node n'importe ni n'utilise** le registry.

**Fichiers concernes** : `personas/registry.py`, `nodes/coordinator.py`, `nodes/recon.py`, `nodes/scan.py`, `nodes/exploit.py`

**Suggestion** : 
- `coordinator_node` doit charger la liste des personas et les mapper aux phases (recon, scan, exploit, report)
- Les nodes specialisees doivent recuperer leur system prompt via `PersonaRegistry.get(agent_id)["prompt"]`

---

### INC-05 🟡 — Le docker-compose.yml ne reflete pas l'architecture cible

**Description** : Le `docker-compose.yml` actuel definit 6 services (postgres, redis, sandbox, orchestrator, backend, litellm). L'architecture cible en necessite 7+ (ajout de `openhands-sandbox`, potentiellement `mastra-backend` separe).

**Fichiers concernes** : `docker-compose.yml`, `ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md` l.96-103

**Env vars manquantes** : 7 variables recommandees par l'architecture cible (l.267) sont absentes.

**Suggestion** : 
- Ajouter les services manquants au fur et a mesure de l'implementation
- Documenter les nouvelles env vars dans `.env.example`

---

### INC-06 🟡 — tool_executor.py est couple a l'API sandbox actuelle

**Description** : `execute_tool()` appelle `POST {SANDBOX_URL}/sandbox/execute` avec un payload specifique (`sandbox_id`, `tool`, `args`, `target`, `flags`). Si le Batch 3 remplace le backend sandbox par OpenHands, cette interface doit changer.

**Fichiers concernes** : `tool_executor.py`, (futur) `openhands_client.py`

**Suggestion** : 
- Abstraire l'interface d'execution dans une classe `SandboxClient` avec deux implementations : `E2BSandboxClient` et `OpenHandsClient`
- Le choix du client depend de `BJHUNT_SANDBOX_MODE` (comme le fait deja `sandbox.ts` dans le backend)

---

### INC-07 🟡 — Gap entre events emis et events geres par le frontend

**Description** : Le frontend (`bjhunt-runtime.ts`) gere `secret.redacted` (l.165) et `agent.canvas` (l.166) mais l'orchestrator (`events.py`) ne les emet pas. Inversement, l'orchestrator emet `agent.started` et `agent.completed` que le frontend ignore.

**Fichiers concernes** : `events.py`, `bjhunt-runtime.ts`

**Suggestion** : 
- Ajouter l'emission de `secret.redacted` dans `events.py` (ou via une node dediee)
- Ajouter l'emission de `agent.canvas` dans `events.py` (pour le canvas-broadcast)
- Optionnel : afficher les `agent.started`/`agent.completed` dans le frontend comme des messages system

---

## 4. RECOMMANDATIONS POUR LES FIXES

### Priorite P0 — Bloquant l'implementation

1. **Formaliser l'ADR-012** (exception mono-langage) dans `10-DECISIONS.md` avant toute implementation Batch 2 et 3
2. **Definir le contrat d'etat canonique** entre LangGraph et Mastra (JSON Schema partage)
3. **Implementer Batch 2 d'abord** (hooks → nodes Python) car ils sont necessaires pour Batch 3 (OpenHands remplace les hooks + sandbox)

### Priorite P1 — Important pour la coherence

4. **Mettre a jour `docker-compose.yml`** avec les services et env vars de l'architecture cible
5. **Brancher `coordinator_node` sur `PersonaRegistry`** pour utiliser les 38 personas
6. **Synchroniser les events SSE** entre `events.py` (orchestrator) et `bjhunt-runtime.ts` (frontend)

### Priorite P2 — Amelioration continue

7. **Creer les fichiers manquants** dans l'ordre : Batch 2 nodes (5 fichiers) → Batch 3 OpenHands (3+ fichiers) → Batch 4 ADR formelle
8. **Abstraire `execute_tool()`** avec une interface `SandboxClient` pour preparer Batch 3
9. **Ajouter des tests d'integration** entre les nodes existantes et les nouvelles nodes

---

## 5. PLAN DE RESOLUTION SEQUENTIEL

| Etape | Action | Batch concernee | Depend de |
|---|---|---|---|
| 1 | Ecrire ADR-012 (exception mono-langage Python) | Batch 4 | — |
| 2 | Brancher `coordinator_node` sur `PersonaRegistry` | Batch 1 (finalisation) | Etape 1 |
| 3 | Creer `nodes/scope_guard.py` (migration scope-guard.cjs) | Batch 2 | Etape 1 |
| 4 | Creer `nodes/evidence_capture.py` (migration evidence-capture.cjs) | Batch 2 | Etape 3 |
| 5 | Creer `nodes/redact_secrets.py` (migration redact-secrets.cjs) | Batch 2 | Etape 3 |
| 6 | Creer `nodes/detect_disclosure.py` (migration detect-disclosure.cjs) | Batch 2 | Etape 3 |
| 7 | Creer `nodes/canvas_broadcast.py` (migration canvas-broadcast.cjs) | Batch 2 | Etape 3 |
| 8 | Integrer les 5 nouvelles nodes dans `graph.py` + `__init__.py` | Batch 2 | Etapes 3-7 |
| 9 | Creer `D:\bjhunt-sandbox\` repo avec `main.py` OpenHands | Batch 3 | Etape 8 |
| 10 | Adapter `tool_executor.py` avec `SandboxClient` abstrait | Batch 3 | Etape 9 |
| 11 | Mettre a jour `docker-compose.yml` avec services openhands + env vars | Batch 3 | Etape 9 |
| 12 | Formaliser ADR Mastra dans `10-DECISIONS.md` | Batch 4 | Etape 1 |
| 13 | Synchroniser events SSE entre orchestrator et frontend | Transversal | Etapes 8, 10 |

---

## 6. SCORE DE COHERENCE PAR COMPOSANT

| Composant | Score | Commentaire |
|---|---|---|
| **Orchestrator (Python)** | 60/100 | Structure OK, personas presents mais inutilises, hooks non migres |
| **Backend (TypeScript)** | 85/100 | Client SSE et adapter solides, manque client OpenHands |
| **Frontend (TypeScript)** | 80/100 | Runtime SSE robuste, manque support pour nouveaux agents |
| **Infra (docker-compose)** | 55/100 | Services existants OK, mais ne reflete pas l'architecture cible |
| **Documentation** | 75/100 | Architecture cible bien documentee, manque ADRs formelles |
| **Personas/Hooks** | 40/100 | Personas copies (OK) mais hooks en .cjs uniquement, aucun portage Python |

---

*Rapport genere automatiquement par l'agent superviseur BJHUNT 4 MAX.*
*Prochaine etape : execution du plan de resolution sequentiel (Section 5).*
