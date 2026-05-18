# JOURNAL DE BORD — BJHUNT

> Journal chronologique des actions, decisions et resultats. Mis a jour au fur et a mesure.

---

## 2026-04-29 (Day 1) — Reset, planification, setup plateformes

[... 1800+ lignes precedentes ...]

---

## 2026-05-13 (Day 2) — Agentique BJHUNT 4 MAX : Queue fix + Architecture hybride LangGraph/OpenHands/Mastra

### Frontend — UI/UX Chat (Phase finalisee)
- Queue system : patch `@assistant-ui/core` (patch persistant `patches/@assistant-ui+core+0.2.0.patch`)
- Badge "en attente" : `ClockIcon` + animation pulse
- Command palette ⌘K : actions, modeles, chats recents
- Notifications navigateur : badge onglet `(•) ` + `Notification API`
- Right panels dropdown : 8 panels depuis le composer
- Raccourcis clavier : ⌘N, ⌘B, ⌘,, ⌘/, Esc, up/down
- Deploy : bjhunt-61bro9a5q-bjhunts-projects.vercel.app

### Audits architecturaux (8 agents en parallele)
- Audit architecture actuelle : 3 repos, 500+ lignes
- Research LangGraph : docs + GitHub + blog, 400+ lignes
- Research OpenHands : docs + paper arXiv, 250+ lignes
- Research Mastra : docs + GitHub, 300+ lignes
- Audit backend granulaire : 41 fichiers, 1000+ lignes
- Audit engine fork : 2238 fichiers, 2000+ lignes
- Audit croise front/back : 600+ lignes

### Livrables crees
- `docs/ARCHITECTURE_CIBLE_HYBRIDE_2026-05-13.md`
- `docs/AUDIT_BACKEND_DETAILLE_2026-05-13.md`
- `docs/AUDIT_ENGINE_DETAILLE_2026-05-13.md`
- `docs/AUDIT_FRONTEND_BACKEND_CROISE_2026-05-13.md`

### Services hybrides implementes
| Service | Fichiers | Langage | Statut |
|---|---|---|---|
| `bjhunt-orchestrator` | 21 fichiers (~700 lignes) | Python 3.12 | Compilé + Docker |
| `bjhunt-sandbox` | 20 fichiers (~954 lignes) | Python 3.12 | Compilé + Docker |

### Quick fixes
- Drift `PatchChatBody.status` : corrigé
- Events SSE morts nettoyes : `agent.progress`, `agent.handoff`
- Listener `onBjhunt('ui')` pour open-panel / toggle-sidebar

### Implémentation orchestrator SSE + backend adapter (2026-05-13 suite)

- **`bjhunt-orchestrator`** :
  - `main.py` : endpoint SSE `/runs/{run_id}/stream` avec `StreamingResponse`, heartbeat ping, reconnect auto
  - `POST /runs/{run_id}/messages` : forward operator message dans LangGraph state
  - `POST /runs/{run_id}/stop` : kill-switch via `AbortController`
  - `events.py` : `translate_state_to_events()` — traduit BJHUNTState → 12 events BJHUNT (agent.started, agent.thinking, agent.tool_call, agent.tool_result, agent.finding, evidence.captured, agent.completed, run.completed, error.runtime)

- **`bjhunt-backend`** :
  - `env.ts` : `BJHUNT_ENGINE_MODE=openclaude|orchestrator`, `BJHUNT_ORCHESTRATOR_URL=http://bjhunt-orchestrator:8000`
  - `lib/orchestrator-client.ts` (~245 lignes) : client HTTP SSE avec `AbortController`, parse SSE en temps réel, dispatch vers `writeEvent()` (Redis+Postgres), reconnect exponentiel, terminal cleanup
  - `lib/engine-adapter.ts` (~90 lignes) : façade dispatch `openclaude` vs `orchestrator` via feature flag — interface identique à `engine-process.ts`
  - `routes/chats.ts` : import remplacé par `engine-adapter.ts`
  - `index.ts` : import `killAllEngines` via `engine-adapter.ts`
  - `tsc --noEmit` = 0 erreur ✅

**Commits** :
- `bjhunt-backend` : `feat: orchestrator SSE streaming + engine-adapter facade`
- `bjhunt-orchestrator` : `fix: tool contract, sandbox lifecycle, run outcome, Dockerfile`
- `bjhunt-app` : `fix: tool-result rendering, run.started dual-write`

### Audit 4 agents enterprise-grade + fixes P0 (2026-05-13 suite)

4 rapports d'audit genere dans `docs/` :
- `RAPPORT_AUDIT_CONTRATS_API_2026-05-13.md` (488 lignes)
- `RAPPORT_AUDIT_TYPES_SCHEMAS_2026-05-13.md` (343 lignes)
- `RAPPORT_AUDIT_DEPLOIEMENT_2026-05-13.md` (343 lignes)
- `RAPPORT_AUDIT_SSE_UX_2026-05-13.md` (533 lignes)

**Fixes P0 appliques** :

| # | Gap | Fix | Fichiers modifies |
|---|---|---|---|
| 1 | Tool contract mismatch (`tool_executor.py` → sandbox) | Rewrote `tool_executor.py` : `spawn_sandbox()`, `delete_sandbox()`, `execute_tool()` avec payload compatible `SandboxExecuteRequest` (`sandbox_id`, `tool`, `args`, `target`, `flags`, `timeout`). `sandbox_id` injecte depuis `BJHUNTState`. | `orchestrator/nodes/tool_executor.py` |
| 2 | Orchestrator never spawned sandbox | Added `sandbox_id` a `BJHUNTState` + `coordinator_node` auto-spawns sandbox on first transition out of planning. `recon.py`, `scan.py`, `exploit.py` passent `sandbox_id`. | `orchestrator/state.py`, `orchestrator/nodes/coordinator.py`, `orchestrator/nodes/recon.py`, `orchestrator/nodes/scan.py`, `orchestrator/nodes/exploit.py` |
| 3 | `run.completed` always `outcome:"completed"` | `_event_stream` trace `outcome` variable, mis a jour sur `phase == "stopped"` → `aborted`, et `Exception` → `failed`. `finally` emet la vraie valeur. | `orchestrator/main.py` |
| 4 | HITL `/resume` not wired | Added `submitToolDecision()` in `orchestrator-client.ts` → `POST /runs/{id}/resume`. `engine-adapter.ts` exports `submitToolDecision()` dispatch. | `orchestrator-client.ts`, `engine-adapter.ts` |
| 5 | Backend ignored spawn args (model, envOverrides, sandboxId) | `startEngine` → `POST /runs` body now includes `model`, `sandbox_id`, `env_overrides`. `StartRunRequest` Pydantic model updated. | `orchestrator-client.ts`, `orchestrator/main.py` |
| 6 | `_consumeSse` cleanup always `status:"idle"` | Added `outcome` tracking in `OrchestratorRun`. Terminal cleanup uses real `outcome` from `run.completed`. | `orchestrator-client.ts` |
| 7 | Inter-service auth missing | Added `BJHUNT_ORCHESTRATOR_SECRET` env var + `orchHeaders()` helper injecting `Authorization: Bearer {token}` on every request. | `env.ts`, `orchestrator-client.ts`, `orchestrator/main.py` |
| 8 | Orchestrator Dockerfile no HEALTHCHECK | `Dockerfile` : non-root user `bjhunt`, `HEALTHCHECK` GET `/health`, `start.sh` with Postgres wait loop. New `start.sh` executable. | `orchestrator/Dockerfile`, `orchestrator/start.sh` |
| 9 | `agent.tool_result` invisible in frontend | Removed `agent.tool_result` from `continue` filter in `processNewEvents`. Added explicit `case 'agent.tool_result':` rendering as assistant message with icon and summary. | `bjhunt-runtime.ts` |
| 10 | `run.started` dual-write (legacy mode) | Added `turn:true` guard — only renders "--- Audit demarre ---" system bubble when `turn !== true`. Prevents duplication on every operator message in `sendMessage()`. | `bjhunt-runtime.ts` |

**Verifications post-fix** :
- `tsc --noEmit` backend = 0 erreur
- `tsc --noEmit` frontend = 0 erreur
- `python -m py_compile` orchestrator (11 fichiers) = 0 erreur
- `python -m py_compile` sandbox = 0 erreur

### Prochaines etapes
1. Personas : copier 38 fichiers `.md` vers `orchestrator/personas/prompts/`
2. Hooks : migrer 5 hooks `.cjs` → nodes LangGraph
3. MCP Kali : migrer vers OpenHands Runtime
4. Mastra : evaluer integration reelle ou simplifier backend
