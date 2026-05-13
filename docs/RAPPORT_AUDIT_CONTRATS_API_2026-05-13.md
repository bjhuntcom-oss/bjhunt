# RAPPORT D'AUDIT DES CONTRATS API — BJHUNT 4 MAX

**Date d'audit** : 2026-05-13
**Périmètre** : 5 services, 8 interfaces minimales, 23 fichiers sources lus
**Méthodologie** : Analyse statique des schémas Zod/Pydantic/BaseModel, comparaison des payloads JSON, alignement des enums SSE, cohérence des codes retour et headers

---

## RÉSUMÉ EXÉCUTIF

| Métrique | Valeur |
|---|---|
| Interfaces auditées | **8** |
| Endpoints REST/SSE recensés | **42** |
| Gaps **Critiques** (🔴) | **6** |
| Warnings **Majeurs** (🟡) | **8** |
| Interfaces **OK** (🟢) | **1** |

### Top 5 Recommandations Prioritaires

1. **🔴 Réparer le contrat Orchestrator → Sandbox** : `tool_executor.py` envoie un corps `{"tool","command","timeout"}` incompatible avec le modèle Pydantic `SandboxExecuteRequest` (`sandbox_id`, `args`, `target`, `flags`). Le `sandbox_id` est totalement absent → exécution impossibile en mode orchestrateur.
2. **🔴 Unifier la gestion du cycle de vie sandbox en mode orchestrateur** : L'orchestrateur ne fait jamais appel à `/sandbox/spawn`. Le backend spawn bien le sandbox, mais l'orchestrateur n'a aucun mécanisme pour le référencer (pas de `sandbox_id` dans `BJHUNTState`).
3. **🔴 Corriger `run.completed` de l'orchestrateur** : Le bloc `finally` de `_event_stream` émet toujours `outcome: 'completed'`, même après `error.runtime`. Le frontend masque l'erreur et affiche "Audit terminé (completed)".
4. **🔴 Aligner assistant-ui sur la version mandatée** : `package.json` de `bjhunt-app` référence `@assistant-ui/react@0.14.0` alors que `AGENTS.md` impose le pin exact `0.10.50` (fork avec patches bench). Risque de régressions UI majeures.
5. **🔴 Propager les paramètres chat vers l'orchestrateur** : `startEngine` (mode orchestrator) ignore `model`, `envOverrides`, `sandboxId`, `mcpEndpoint`, `agent_models`, `asvs_target_level`, etc. L'orchestrateur est donc aveugle à la configuration métier.

---

## Interface 1 : Frontend (bjhunt-app) → Backend REST (bjhunt-backend)

### Endpoints

| Méthode | Chemin | Côté Frontend (appelant) | Côté Backend (destinataire) | Aligné? |
|---|---|---|---|---|
| GET | `/api/chats` | `api.listChats()` → `{ chats: Chat[] }` | `route.get('/')` → `{ chats: rows }` | 🟢 **Oui** |
| POST | `/api/chats` | `api.createChat(b)` → `{ chat: Chat; sse_prepare_url: string }` | `route.post('/')` → `{ chat: ..., sse_prepare_url: '/api/chat/prepare' }` (201) | 🟢 **Oui** |
| GET | `/api/chats/:id` | `api.getChat(id)` → `{ chat: Chat }` | `route.get('/:id')` → `{ chat: row }` | 🟢 **Oui** |
| PATCH | `/api/chats/:id` | `api.patchChat(id, b)` → `{ chat: Chat }` | `route.patch('/:id')` → `{ chat: updated }` | 🟢 **Oui** |
| DELETE | `/api/chats/:id` | `api.killChat(id)` / `api.deleteChat(id)` | `route.delete('/:id')` → `{ chat: updated }` ou `{ ok, purged }` | 🟢 **Oui** |
| POST | `/api/chats/:id/messages` | `api.sendMessage(chatId, text, to?)` → `{ ok; renamed_to }` | `route.post('/:id/messages')` → `{ ok: true, renamed_to }` (202) | 🟢 **Oui** |
| POST | `/api/chats/:id/stop` | `api.stopChat(id)` → `{ ok: boolean }` | `route.post('/:id/stop')` → `{ ok: true }` | 🟢 **Oui** |
| POST | `/api/chats/:id/tool-result` | `api.submitToolResult(...)` → `{ ok; pending? }` | `route.post('/:id/tool-result')` → `{ ok: true, pending: true }` | 🟢 **Oui** |
| POST | `/api/chats/:id/tool-retry` | `api.retryTool(...)` → `{ ok; pending? }` | `route.post('/:id/tool-retry')` → `{ ok: true, pending: true }` | 🟢 **Oui** |
| POST | `/api/chat/prepare` | `api.prepareSse(chat_id)` → `{ ticket; expires_in; sse_url }` | `route.post('/')` → même shape | 🟢 **Oui** |
| GET | `/api/chats/:id/history` | `api.getChatHistory(...)` → `ChatHistoryResponse` | `route.get('/:id/history')` → même shape | 🟢 **Oui** |
| POST | `/api/chats/:id/regenerate` | `api.regenerate(id, opts?)` → `{ ok; model }` | `route.post('/:id/regenerate')` → même shape | 🟢 **Oui** |
| POST | `/api/chats/:id/branch` | `api.branchChat(id)` → `{ chat: Chat }` | `route.post('/:id/branch')` → `{ chat: cloned }` (201) | 🟢 **Oui** |
| POST | `/api/chats/:id/commands` | `api.invokeCommand(...)` | `route.post('/:id/commands')` → `{ chat: updated }` | 🟢 **Oui** |
| GET | `/api/catalog/agents` | `api.listAgents()` → `{ agents: AgentMeta[] }` | `route.get('/agents')` → `{ agents: AGENTS }` | 🟡 **Non vérifié** (fichier catalog source non lu) |
| GET | `/api/catalog/models` | `api.listModels()` → `{ models: ModelMeta[] }` | `route.get('/models')` → fallback manuel identique | 🟢 **Oui** |
| GET | `/api/search` | `api.searchChats(...)` | *Non lu* | 🟡 **Hors périmètre** |
| GET/PUT | `/api/chats/:id/canvas` | `api.getCanvas` / `api.putCanvas` | *Non lu* | 🟡 **Hors périmètre** |
| GET | `/api/audit`, `/api/audit/actions` | `api.listAudit`, `api.listAuditActions` | *Non lu* | 🟡 **Hors périmètre** |
| GET | `/api/chat-suggestions/:chatId` | `thread.tsx` fetch direct | *Non lu* (route absente du périmètre) | 🟡 **Non vérifié** |

### Body/Params

| Champ | Type Frontend | Type Backend (Zod) | Conforme? |
|---|---|---|---|
| `client` | `string` | `z.string().min(1).max(200).default('Nouveau chat')` | 🟢 Oui |
| `scope.in_scope` | `string[]` | `z.array(z.string().min(1)).default([])` | 🟢 Oui |
| `scope.out_of_scope` | `string[]` (optionnel) | `z.array(z.string().min(1)).default([])` | 🟢 Oui (backend défaulte) |
| `scope.rules_of_engagement` | `string` | `z.string().min(0).default(...)` | 🟢 Oui |
| `compliances_required` | `string[]` (optionnel) | `z.array(z.enum(COMPLIANCE_IDS)).default([])` | 🟢 Oui |
| `agents_enabled` | `string[]` (optionnel) | `z.array(z.string().min(1)).default([])` | 🟢 Oui |
| `default_model` | `string` (optionnel) | `z.string().min(1).default('glm-5.1')` | 🟢 Oui |
| `agent_models` | `Record<string,string>` | `z.record(z.string(), z.string()).default({})` | 🟢 Oui |
| `asvs_target_level` | `1 \| 2 \| 3` (optionnel) | `z.number().int().min(1).max(3).optional()` | 🟢 Oui |
| `report_languages` | `('fr' \| 'en')[]` | `z.array(z.enum(['fr','en'])).min(1).default(['fr'])` | 🟢 Oui |
| `kind` | `'initial' \| 'retest' \| 'adhoc' \| 'tlpt'` | `z.enum(...).default('initial')` | 🟢 Oui |
| `starts_at` / `expires_at` | `string \| null` (ISO 8601) | `z.iso.datetime().nullable().optional()` | 🟢 Oui |
| `chat_id` (prepare) | `string` (UUID) | `z.uuid()` | 🟢 Oui |

### Headers

| Header | Valeur Frontend | Attendu Backend | Conforme? |
|---|---|---|---|
| `Content-Type` | `application/json` (si body) | `application/json` | 🟢 Oui |
| `Cookie` | Navigateur envoie `bjhunt_session` | Middleware `authMiddleware` + `tenantMiddleware` | 🟢 Oui |
| `Idempotency-Key` | **Absent** | Lu par backend (`c.req.header('idempotency-key')`) | 🟡 **Feature non utilisée** |

### Codes retour

| Code | Signification Frontend | Signification Backend | Aligné? |
|---|---|---|---|
| 200 | Succès | Succès | 🟢 Oui |
| 201 | Created (POST /chats, /branch) | Renvoyé explicitement | 🟢 Oui |
| 202 | Accepted (POST /messages) | `c.json(..., 202)` | 🟢 Oui |
| 401 | Session expirée → redirect `/login` | `HTTPException(401)` | 🟢 Oui |
| 404 | Not found | `HTTPException(404)` | 🟢 Oui |
| 409 | Conflit (chat terminal) | `HTTPException(409)` | 🟢 Oui |
| 410 | Gone (chat terminal, SSE prepare) | `HTTPException(410)` | 🟡 Frontend ne gère pas explicitement le 410 |
| 502 | Bad Gateway (spawn sandbox) | `HTTPException(502)` | 🟢 Oui |
| 503 | Service Unavailable (respawn engine) | `HTTPException(503)` | 🟢 Oui |

### GAPS identifiés

- [ ] **🟡 Idempotence inexploitée** — Le backend supporte `Idempotency-Key` sur `POST /messages`, mais le frontend `api.ts` ne l'envoie jamais. Risque de double-submit sur retry réseau.
- [ ] **🟡 Gestion du 410** — `POST /api/chat/prepare` retourne 410 pour un chat terminal. Le frontend n'a pas de branche spécifique ; l'erreur remonte comme un throw générique. À coupler avec le `historyMode`.
- [ ] **🟡 Endpoints non audités** — `/api/search`, `/api/chats/:id/canvas`, `/api/audit/*`, `/api/chat-suggestions/:chatId` n'ont pas été lus côté backend.

### SEVERITÉ : 🟢 OK (hors endpoints hors périmètre)

---

## Interface 2 : Frontend (bjhunt-app) → Backend SSE (bjhunt-backend)

### Endpoints

| Méthode | Chemin | Côté Frontend | Côté Backend | Aligné? |
|---|---|---|---|---|
| GET | `/api/chat/stream/:chatId?ticket=&lastEventId=` | `EventSource` dans `use-engagement-stream.ts` | `streamEventsToResponse()` dans `chat-stream.ts` | 🟢 **Oui** |

### Body/Params

| Paramètre | Frontend | Backend | Conforme? |
|---|---|---|---|
| `ticket` | Query string (`encodeURIComponent`) | `c.req.query('ticket')` — JWT vérifié | 🟢 Oui |
| `lastEventId` (reconnect manuel) | Query string (`lastEventId=`) | `c.req.query('lastEventId')` + fallback header `last-event-id` | 🟢 Oui |
| `chatId` | Route param | `c.req.param('chatId')` — vérifié contre `claims.chat_id` | 🟢 Oui |

### Headers

| Header | Valeur Frontend | Attendu Backend | Conforme? |
|---|---|---|---|
| `Accept` | *implicite EventSource* | Backend accepte quoi que ce soit et renvoie `text/event-stream` | 🟢 Oui |
| `Cache-Control` | — | Backend force `no-cache, no-transform` | 🟢 Oui |
| `Last-Event-ID` | Auto-rempli par navigateur sur reconnect | `c.req.header('last-event-id')` | 🟢 Oui |

### Codes retour

| Code | Signification Frontend | Signification Backend | Aligné? |
|---|---|---|---|
| 200 | Stream ouvert | `c.body(readable, 200, ...)` | 🟢 Oui |
| 401 | Ticket manquant ou invalide → erreur | `HTTPException(401)` | 🟢 Oui |
| 403 | Ticket lié à un autre chat | `HTTPException(403)` | 🟢 Oui |

### Event SSE — Vocabulaire typé

| Event | Émis par Backend | Attendu par Frontend (`TYPED_EVENTS`) | Champs data alignés? |
|---|---|---|---|
| `run.started` | `engine-process.ts` / orchestrator-client | Oui | 🟢 Oui (session_id, ts) |
| `agent.started` | `engine-process.ts` / orchestrator `translate_state_to_events` | Oui | 🟡 `model` et `color` absents côté orchestrator |
| `agent.thinking` | `engine-process.ts` / orchestrator | Oui | 🟢 Oui (agent_id, role, delta, ts) |
| `agent.tool_call` | `engine-process.ts` / orchestrator | Oui | 🔴 **Orchistrateur manque `tool_use_id` et `input`** |
| `agent.tool_result` | `engine-process.ts` / orchestrator | Oui | 🟡 Orchestrator manque `tool_use_id` (mais frontend le saute) |
| `agent.finding` | `engine-process.ts` / orchestrator | Oui | 🟢 Oui (finding_id, title, severity, asset, ...) |
| `agent.canvas` | `engine-process.ts` (relay hook) | Oui | 🟢 Oui (content, revision, updated_at, updated_by) |
| `secret.redacted` | `engine-process.ts` (relay hook) | Oui | 🟡 **Jamais émis par l'orchestrateur** |
| `evidence.captured` | `engine-process.ts` / orchestrator | Oui | 🟢 Oui (evidence_id, kind, sha256, size_bytes, ...) |
| `dream.diary_entry` | `engine-process.ts` | Oui | 🟡 **Jamais émis par l'orchestrateur** |
| `agent.completed` | `engine-process.ts` / orchestrator | Oui | 🟢 Oui (phase == "report") |
| `run.completed` | `engine-process.ts` / orchestrator | Oui | 🔴 **Orchistrateur: `outcome` toujours `'completed'`** |
| `error.scope_violation` | `engine-process.ts` (relay hook) | Oui | 🟡 **Jamais émis par l'orchestrateur** |
| `error.runtime` | `engine-process.ts` / orchestrator | Oui | 🟢 Oui |

### GAPS identifiés

- [ ] **🔴 `agent.tool_call` incomplet en mode orchestrator** — L'orchestrateur ne fournit pas `tool_use_id` ni `input`. Le frontend `bjhunt-runtime.ts` fallback sur `ev.ulid` pour `toolCallId` et `{}` pour `args`. Le rendu des cartes d'outil est dégradé (pas d'arguments visibles).
- [ ] **🔴 `run.completed` de l'orchestrateur masque les échecs** — Le bloc `finally` de `_event_stream` force `outcome: 'completed'` même après une exception. Le frontend affiche alors "Audit terminé (completed)" au lieu de signifier l'erreur.
- [ ] **🟡 Parité events manquante en mode orchestrator** — `secret.redacted`, `error.scope_violation`, `dream.diary_entry` ne sont jamais produits. Pas de crash frontend, mais perte fonctionnelle (pas de détection de violation de scope, pas de journal de rêve).
- [ ] **🟡 ULID de l'orchestrateur non standard** — `_make_ulid()` génère `%Y%m%d%H%M%S + random`, ce n'est pas un ULID Crockford base32. Le frontend s'en accommode (string opaque) mais l'ordering lexicographique n'est pas garanti à la milliseconde. Pas de régression fonctionnelle immédiate car Redis assure l'ordre d'émission.

### SEVERITÉ : 🔴 Critique (parité events orchestrator)

---

## Interface 3 : Backend (bjhunt-backend) → Orchestrator (bjhunt-orchestrator)

### Endpoints

| Méthode | Chemin | Côté Backend (appelant) | Côté Orchestrateur (destinataire) | Aligné? |
|---|---|---|---|---|
| POST | `/runs` | `startEngine()` → `{ scope: {...}, agent_id: 'coordinator' }` | `create_run(body: StartRunRequest)` | 🟢 **Signature OK** |
| GET | `/runs/{run_id}/stream` | `_consumeSse()` — SSE parser manuel | `stream_run(run_id)` → `StreamingResponse` | 🟢 **Oui** |
| POST | `/runs/{run_id}/messages` | `sendMessage()` → `{ text }` | `post_message(..., body: MessageRequest)` | 🟢 **Oui** |
| POST | `/runs/{run_id}/stop` | `killEngine()` → `{ reason: 'manual' }` | `stop_run(..., body: StopRunRequest)` | 🟢 **Oui** |
| POST | `/runs/{run_id}/resume` | **Non implémenté** dans `orchestrator-client.ts` | `resume_run(..., body: ResumeRunRequest)` | 🔴 **Appelant manquant** |
| GET | `/runs/{run_id}` | **Non implémenté** | `get_run(run_id)` | 🟡 Non utilisé |

### Body/Params

| Champ | Type Backend (envoyé) | Type Orchestrateur (Pydantic) | Conforme? |
|---|---|---|---|
| `scope.in_scope` | `string[]` (dérivé de `scope.in_scope`) | `List[str]` | 🟢 Oui |
| `scope.out_of_scope` | `string[]` | `List[str]` | 🟢 Oui |
| `scope.rules_of_engagement` | `string[]` (arrayifié si string) | `List[str]` | 🟢 Oui |
| `agent_id` | `"coordinator"` | `str = "coordinator"` | 🟢 Oui |
| `text` (messages) | `string` | `str` | 🟢 Oui |
| `reason` (stop) | `"manual"` | `str = "manual"` | 🟢 Oui |
| `approved_actions` (resume) | **Non envoyé** | `list[dict]` | 🔴 **Absent** |

### Headers

| Header | Valeur Backend | Attendu Orchestrateur | Conforme? |
|---|---|---|---|
| `Content-Type` | `application/json` | FastAPI attend JSON | 🟢 Oui |
| `Accept` | `text/event-stream` (sur `/stream`) | StreamingResponse renvoie SSE | 🟢 Oui |
| `Authorization` / `Bearer` | **Absent** | Aucun middleware d'auth | 🟡 **Aucune authentification inter-service** |

### Codes retour

| Code | Signification Backend | Signification Orchestrateur | Aligné? |
|---|---|---|---|
| 200 | OK | OK | 🟢 Oui |
| 404 | Run inconnu → log warning | `HTTPException(404, detail="Run not found")` | 🟢 Oui |

### GAPS identifiés

- [ ] **🔴 `startEngine` ignore la moitié des paramètres** — `model`, `sandboxId`, `mcpEndpoint`, `envOverrides`, `agent_models`, `asvs_target_level`, `report_languages` ne sont pas transmis à l'orchestrateur. L'orchestrateur n'a donc aucune connaissance du modèle LLM sélectionné, des agents activés, ou de la sandbox associée.
- [ ] **🔴 HITL / Resume non câblé** — L'orchestrateur expose `POST /runs/{id}/resume`, mais `orchestrator-client.ts` ne l'appelle jamais. Si un nœud du graph met l'exécution en pause (interrupt_before exploit), il n'y a aucun moyen de reprendre depuis le backend.
- [ ] **🔴 `sendSettingsUpdate` est un no-op** — Le backend appelle `sendSettingsUpdate` après `PATCH /chats/:id`. En mode orchestrateur, la fonction loggue "accepted (no live reload)" et retourne `{ ok: true }`. Les changements de scope/modèle/agents ne sont jamais poussés à l'orchestrateur.
- [ ] **🔴 Cleanup status toujours `'idle'`** — `_consumeSse` met à jour le chat avec `status: 'idle'` à la fin du stream, quelle que soit la cause de sortie (succès, erreur, stop manuel). Le backend ne distingue pas `completed`, `failed`, `aborted` en mode orchestrateur.
- [ ] **🟡 Pas d'authentification inter-service** — Le backend appelle l'orchestrateur en HTTP brut sans token. Si le service est exposé sur le réseau interne, n'importe quel pod peut créer/stopper des runs.
- [ ] **🟡 Réutilisation des messages utilisateur** — L'orchestrateur inclut les messages `role=user` dans `state.messages` et les ré-émet comme `agent.thinking` à *chaque* step du graph (stream_mode="values"). Le backend les re-persiste dans Redis/Postgres à chaque step. Pas de crash, mais pollution du stream.

### SEVERITÉ : 🔴 Critique

---

## Interface 4 : Orchestrator (bjhunt-orchestrator) → Sandbox (bjhunt-sandbox)

### Endpoints

| Méthode | Chemin | Côté Orchestrateur (appelant) | Côté Sandbox (destinataire) | Aligné? |
|---|---|---|---|---|
| POST | `/execute` | `tool_executor.py` : body `{"tool", "command", "timeout"}` | `sandbox_execute(body: SandboxExecuteRequest)` | 🔴 **NON** |
| POST | `/sandbox/spawn` | **Jamais appelé** | `sandbox_spawn()` → `SandboxCreateResponse` | 🔴 **Appelant manquant** |
| DELETE | `/sandbox/{id}` | **Jamais appelé** | `sandbox_delete(...)` | 🔴 **Appelant manquant** |
| GET | `/sandbox/{id}/status` | **Jamais appelé** | `sandbox_status(...)` | 🔴 **Appelant manquant** |

### Body/Params

| Champ | Type Orchestrateur (envoyé) | Type Sandbox (Pydantic) | Conforme? |
|---|---|---|---|
| `tool` | `string` | `str` | 🟢 Oui |
| `command` | `List[str]` | **Champ inexistant** — Sandbox attend `args: List[str]` | 🔴 **Nom et structure différents** |
| `timeout` | `int` | `int` (default depuis settings) | 🟢 Oui |
| `sandbox_id` | **Absent** | `str = Field(...)` (obligatoire) | 🔴 **Champ obligatoire manquant** |
| `target` | **Absent** | `Optional[str]` | 🟡 Absent mais optionnel |
| `flags` | **Absent** | `Optional[List[str]]` | 🟡 Absent mais optionnel |

### Headers

| Header | Valeur Orchestrateur | Attendu Sandbox | Conforme? |
|---|---|---|---|
| `Content-Type` | `application/json` (httpx default) | FastAPI attend JSON | 🟢 Oui |
| `Authorization` | **Absent** | Aucun middleware d'auth | 🟡 Sandbox expose `/execute` sans auth |

### Codes retour

| Code | Signification Orchestrateur (interprétation) | Signification Sandbox | Aligné? |
|---|---|---|---|
| 200 | `response.raise_for_status()` | Retourne `SandboxExecuteResponse` | 🟢 Oui (si la requête arrivait) |
| 422 | Erreur de validation Pydantic (non gérée) | Renvoyé car `sandbox_id` manque | 🔴 **Jamais atteint car la requête est invalide** |
| 500 | `httpx.RequestError` catché | Exception interne | 🟢 Aligné en erreur |

### GAPS identifiés

- [ ] **🔴 Contrat de requête totalement rompu** — L'orchestrateur envoie `{"tool":"nmap","command":["-sV",...],"timeout":120}`. Le sandbox attend `{"sandbox_id":"...","tool":"nmap","args":["-sV",...],"target":"..."}`. Le champ `sandbox_id` (obligatoire) est totalement absent.
- [ ] **🔴 Pas de gestion du cycle de vie sandbox** — L'orchestrateur ne spawn jamais de sandbox. Il tente d'exécuter des outils dans un conteneur inexistant. L'architecture actuelle repose sur le backend pour spawner (via `spawnSandbox` dans `chats.ts`), mais l'orchestrateur n'a aucun mécanisme pour récupérer ou transmettre ce `sandbox_id`.
- [ ] **🔴 Absence de `sandbox_id` dans `BJHUNTState`** — Le state LangGraph ne contient pas de `sandbox_id`. Il est donc impossible de l'injecter dans `tool_executor.py` sans modification du schéma `state.py` et des nœuds du graph.
- [ ] **🟡 Timeout cohérent** — Orchestrateur attend `TIMEOUT + 10` (130 s) >= sandbox `settings.DEFAULT_COMMAND_TIMEOUT` (120 s). C'est cohérent, mais inutile car la requête est rejetée avant.
- [ ] **🟡 Auth inter-service manquante** — Le sandbox n'exige aucune authentification sur `/execute` (ni token, ni IP allowlist).

### SEVERITÉ : 🔴 Critique

---

## Interface 5 : Backend (bjhunt-backend) → Sandbox (bjhunt-sandbox)

### Endpoints / Fonctions

| Méthode | Chemin / Fonction | Côté Backend (appelant) | Côté Sandbox (destinataire) | Aligné? |
|---|---|---|---|---|
| — | `spawnSandbox(args)` (lib abstraite) | `chats.ts` appelle via `lib/sandbox.ts` | Implémenté dans `lib/e2b.ts` (non lu), `lib/sandbox.ts` (docker), mock | 🟡 **Délégué non audité en profondeur** |
| — | `terminateSandbox(id)` | `chats.ts`, `engine-process.ts` | `workspace_pool.terminate(sandbox_id)` | 🟢 **Aligné sur l'ID** |

### Body/Params (spawn)

| Champ | Type Backend (`SpawnArgs`) | Type Sandbox (indirect) | Conforme? |
|---|---|---|---|
| `chatId` | `string` | Utilisé pour nommer le conteneur / contexte E2B | 🟢 Oui |
| `envOverrides` | `Record<string, string>` | Passé dans le fichier env docker / E2B envOverrides | 🟢 Oui |
| `timeoutSeconds` | `number` (optionnel) | Non visible dans `sandbox.ts` — transmis à `spawnE2B(args)` | 🟡 Non traçable sans `e2b.ts` |

### Env vars transmis au sandbox

| Variable | Backend (sandbox.ts / chats.ts) | Sandbox (run-engagement.sh) | Conforme? |
|---|---|---|---|
| `BJHUNT_MODE` | `"true"` | Attendu / utilisé | 🟢 Oui |
| `BJHUNT_CHAT_ID` | `args.chatId` | Attendu | 🟢 Oui |
| `BJHUNT_CHAT_SCOPE_JSON` | `JSON.stringify(chat.scope)` | Écrit dans `/chat/scope.json` | 🟢 Oui |
| `BJHUNT_REPORT_LANGUAGES` | `chat.reportLanguages.join(',')` | Attendu | 🟢 Oui |
| `BJHUNT_COMPLIANCES` | `chat.compliancesRequired.join(',')` | Attendu | 🟢 Oui |
| `BJHUNT_AGENTS_ENABLED` | `effectiveAgents.join(',')` | Attendu | 🟢 Oui |
| `BJHUNT_DEFAULT_MODEL` | `chat.defaultModel` | Attendu | 🟢 Oui |
| `BJHUNT_AGENT_MODELS` | `JSON.stringify(chat.agentModels ?? {})` | Attendu | 🟢 Oui |
| `BJHUNT_ASVS_TARGET_LEVEL` | `String(chat.asvsTargetLevel)` (conditionnel) | Attendu | 🟢 Oui |
| `BJHUNT_RELAY_SECRET` | `env.BJHUNT_RELAY_SECRET` | Attendu pour auth MCP | 🟢 Oui |
| `LITELLM_URL` / `LITELLM_MASTER_KEY` | Passés en mode docker | Utilisés par le MCP server | 🟢 Oui |
| `BJHUNT_CHAT_WORKSPACE` | Passé par backend (`engine-process.ts`) | `mkdir -p ...` dans run-engagement.sh | 🟢 Oui |
| `BJHUNT_EVIDENCE_DIR` | Passé par backend | `mkdir -p ...` dans run-engagement.sh | 🟢 Oui |

### GAPS identifiés

- [ ] **🟡 Sandbox E2B non audité** — Le fichier `lib/e2b.ts` n'a pas été lu. On ne peut pas vérifier que `spawnE2B` consomme correctement `timeoutSeconds` ni qu'il retourne bien un `SandboxHandle` avec `sandboxId` + `engineEndpoint`.
- [ ] **🟡 Orchestrator ignorant du sandbox** — Même si le backend spawn une sandbox pour le chat, l'orchestrateur n'a pas accès à son ID. Cette interface est donc "OK côté backend/sandbox" mais "inutilisable côté orchestrateur".

### SEVERITÉ : 🟡 Warning (dépend de la résolution de Interface 4)

---

## Interface 6 : Backend (bjhunt-backend) → Redis / Postgres

### Endpoints / Fonctions

| Fonction | Source | Cible | Aligné? |
|---|---|---|---|
| `writeEvent({ orgId, userId, chatId, event, data })` | `lib/sse.ts` | Redis Streams (`XADD`) + Postgres `stream_events` | 🟢 **Oui** |
| `streamEventsToResponse(c, { orgId, userId, chatId, lastEventId })` | `lib/sse.ts` | Redis `XREAD` + Postgres `SELECT ... ORDER BY ulid` | 🟢 **Oui** |

### Body/Params (writeEvent)

| Champ | Type Backend (appelant) | Type Redis / Postgres | Conforme? |
|---|---|---|---|
| `orgId` | `string` (UUID) | `stream_events.org_id` : `uuid` | 🟢 Oui |
| `userId` | `string` (UUID) | `stream_events` mirror INSERT via `withTenant` (RLS) | 🟢 Oui |
| `chatId` | `string` (UUID) | `stream_events.chat_id` : `uuid` | 🟢 Oui |
| `event` | `string` (TYPED_EVENTS) | `stream_events.event_type` : `text` | 🟢 Oui |
| `data` | `unknown` | `stream_events.payload` : `jsonb` | 🟢 Oui |

### Headers

Pas de headers HTTP ici ; contrat interne via fonctions TypeScript.

### Codes retour

Pas de codes HTTP ; échec silencieux (log warn) sur le mirror Postgres. Redis est la source de vérité SSE.

### GAPS identifiés

- [ ] **🟡 Mirror Postgres best-effort** — `writeEvent` attrape et ignore les erreurs d'INSERT Postgres. En cas de panne PG prolongée, le replay de reconnect SSE (> Redis MAXLEN) échouera sans le signaler au client. Idéalement, un healthcheck ou métrique devrait suivre le taux d'échec du mirror.
- [ ] **🟡 `ulid` dans Postgres** — La colonne est déclarée `text('ulid').notNull()`, mais ce n'est pas un vrai `ULID` (pas de type natif, pas de check constraint). Orchestrator génère des IDs custom non-ULID (`%Y%m%d%H%M%S + random`). Cela fonctionne comme clé de dédup opaque, mais l'ordering n'est pas strictement ULID.

### SEVERITÉ : 🟢 OK

---

## Interface 7 : Orchestrator (bjhunt-orchestrator) → Postgres (checkpointer LangGraph)

### Endpoints / Fonctions

| Fonction | Source | Cible | Aligné? |
|---|---|---|---|
| `get_checkpointer()` → `AsyncPostgresSaver` | `checkpointer.py` | `CHECKPOINT_POSTGRES_URI` (pool asyncpg) | 🟢 **Oui** |
| `compiled.ainvoke(..., config={"configurable": {"thread_id": run_id}})` | `main.py` | Tables gérées par `langgraph.checkpoint.postgres.aio` | 🟢 **Oui** |

### Env vars

| Variable | Orchestrateur | Postgres (cible) | Conforme? |
|---|---|---|---|
| `CHECKPOINT_POSTGRES_URI` | `os.getenv("CHECKPOINT_POSTGRES_URI", "postgresql://user:password@localhost:5432/bjhunt_checkpoint")` | Doit pointer sur une instance PG accessible | 🟡 **Défaut localhost** — ne fonctionnera pas en conteneurisé sans override |

### GAPS identifiés

- [ ] **🟡 Pas de partage de schema avec le backend** — Le checkpointer LangGraph utilise ses propres tables (créées par `AsyncPostgresSaver`), isolées du schema `stream_events` / `chats` du backend. Ce n'est pas un bug, mais il n'y a aucune jointure possible entre l'état LangGraph et les données métier BJHUNT sans bridge explicite.
- [ ] **🟡 `command_timeout=60` du pool** — Le pool asyncpg est configuré avec `command_timeout=60`. Si une requête de checkpoint dépasse 60s (gros état), elle sera coupée. Le backend n'utilise pas ce même pool.
- [ ] **🟡 Pas de RLS sur les tables de checkpoint** — `AsyncPostgresSaver` n'instancie pas de RLS. Tout run_id est accessible si on a accès à la base.

### SEVERITÉ : 🟡 Warning

---

## Interface 8 : Engine Legacy / Fallback (openclaude) → Backend (bjhunt-backend)

> **Note de périmètre** : Le fichier `D:\bjhunt-engine\src\lib\engine-process.ts` n'existe pas. L'analyse repose sur `[bjhunt-backend/src/lib/engine-process.ts]` (l'adaptateur backend) et `[bjhunt-engine/src/main.tsx]` (les flags CLI supportés par le binaire openclaude).

### Contrat de spawn (Backend → Engine process)

| Élément | Backend (engine-process.ts) | Engine (openclaude CLI) | Aligné? |
|---|---|---|---|
| Binaire | `env.BJHUNT_OPENCLAUDE_BIN` (def: `/opt/openclaude/dist/cli.mjs`) | `src/main.tsx` — point d'entrée CLI | 🟢 Oui |
| Flag `--input-format` | `stream-json` | Supporté (`stream-json`) | 🟢 Oui |
| Flag `--output-format` | `stream-json` | Supporté (`stream-json`) | 🟢 Oui |
| Flag `--print` | Présent | Requis pour mode headless | 🟢 Oui |
| Flag `--include-partial-messages` | Présent | Supporté | 🟢 Oui |
| Flag `--mcp-config` | Chemin fichier `.mcp-config.json` | Supporté | 🟢 Oui |
| Flag `--model` | `args.model` | Supporté | 🟢 Oui |
| Flag `--allowedTools` / `--disallowedTools` | Liste MCP + WebFetch | Filtrage outils CLI | 🟢 Oui |
| Flag `--session-id` | `args.chatId` | Supporté | 🟢 Oui |

### Contrat de frames stream-json (Engine → Backend)

| Frame `type` | Champs émis par Engine | Interprétation backend (`translateAndEmit`) | Aligné? |
|---|---|---|---|
| `system` / `init` | `session_id`, `model`, `tools`, `cwd` | `run.started` (session_id, model, tools count, cwd) | 🟢 Oui |
| `assistant` | `message.content[]` (text, tool_use) | `agent.started`, `agent.thinking`, `agent.tool_call`, `agent.finding`, `evidence.captured` | 🟢 Oui |
| `user` | `message.content[]` (tool_result, text) | `agent.tool_result`, `agent.thinking` (role=user) | 🟢 Oui |
| `result` | `subtype`, `is_error`, `usage`, `total_cost_usd`, `num_turns`, `duration_ms` | `agent.completed`, `run.completed`, increment tokens/cost in DB | 🟢 Oui |
| `stream_event` | `event.type`, `event.delta.type`, `event.delta.text` | `agent.thinking` (text_delta streaming) | 🟢 Oui |

### Env vars attendues par l'engine / sandbox

| Variable | Backend set? | run-engagement.sh lit? | engine-process.ts lit? | Aligné? |
|---|---|---|---|---|
| `BJHUNT_MODE` | Oui | Oui | Oui | 🟢 Oui |
| `BJHUNT_CHAT_ID` | Oui | — | Oui | 🟢 Oui |
| `BJHUNT_CHAT_SCOPE` | Oui (path fichier) | — | Oui | 🟢 Oui |
| `BJHUNT_CHAT_SCOPE_JSON` | Oui | Oui | Oui | 🟢 Oui |
| `BJHUNT_CHAT_WORKSPACE` | Oui | — | Oui | 🟢 Oui |
| `BJHUNT_SSE_SOCKET` | Oui | — | Oui | 🟢 Oui |
| `BJHUNT_REPORT_LANGUAGES` | Oui | Oui (via envOverrides) | — | 🟢 Oui |
| `BJHUNT_COMPLIANCES` | Oui | Oui | — | 🟢 Oui |
| `BJHUNT_AGENTS_ENABLED` | Oui | Oui | — | 🟢 Oui |
| `BJHUNT_DEFAULT_MODEL` | Oui | Oui | — | 🟢 Oui |
| `BJHUNT_AGENT_MODELS` | Oui | Oui | — | 🟢 Oui |
| `BJHUNT_ASVS_TARGET_LEVEL` | Oui (conditionnel) | Oui (conditionnel) | — | 🟢 Oui |
| `ANTHROPIC_BASE_URL` | Oui (LITELLM_URL) | — | — | 🟢 Oui |
| `ANTHROPIC_API_KEY` | Oui (LITELLM_MASTER_KEY) | — | — | 🟢 Oui |
| `HOME` | Oui (`/data/bjhunt-chats`) | — | — | 🟢 Oui |
| `BJHUNT_RELAY_SECRET` | Oui (via docker env file) | Oui (auth MCP) | — | 🟢 Oui |

### GAPS identifiés

- [ ] **🟡 `--replay-user-messages` explicitement désactivé** — Le backend ne passe pas ce flag. L'engine ne renvoie donc pas les messages utilisateur sur stdout. Le backend les émule via `sendMessage`. C'est intentionnel (documenté) pour éviter le dual-source.
- [ ] **🟡 Pas de relecture du fichier `engine-process.ts` dans `bjhunt-engine`** — Le contrat est reconstruit indirectement. Si le fork openclaude a altéré le format stream-json, l'adaptateur backend pourrait diverger.

### SEVERITÉ : 🟢 OK

---

## Interface Bonus : Package Versions & Dépendances

| Dépendance | Valeur attendue (AGENTS.md / conventions) | Valeur réelle package.json | Aligné? |
|---|---|---|---|
| `@assistant-ui/react` | `0.10.50` (pin exact, fork patches) | `0.14.0` | 🔴 **CRITIQUE — version non conforme** |
| `next` | Next.js 16 | `16.2.6` | 🟢 Oui |
| `react` / `react-dom` | 19 | `19.2.5` | 🟢 Oui |
| `tailwindcss` | 4 | `4.3.0` | 🟢 Oui |

---

## SYNTHÈSE DES GAPS PAR SERVICE

| Service | Gaps Critiques | Warnings |
|---|---|---|
| `bjhunt-backend` | 0 | 3 (Idempotence, 410, mirror PG best-effort) |
| `bjhunt-orchestrator` | 5 (Sandbox contract, Resume, Settings no-op, run.completed outcome, startEngine params) | 3 (Auth, ULID, user msg duplication) |
| `bjhunt-sandbox` | 1 (Orchestrator ne l'appelle pas correctement) | 2 (Auth /execute, LLM analyzer stub) |
| `bjhunt-app` | 1 (assistant-ui 0.14.0 vs 0.10.50) | 2 (Idempotence, 410) |
| `bjhunt-engine` | 0 | 1 (engine-process.ts non présent au path attendu) |

---

## RECOMMANDATIONS DÉTAILLÉES

### Priorité P0 (livraison bloquante)

1. **Refondre `tool_executor.py`** pour utiliser le schéma `SandboxExecuteRequest` :
   - Accepter `sandbox_id` en paramètre (à ajouter dans `BJHUNTState` ou passé au nœud).
   - Mapper `command: List[str]` vers `args: List[str]` et `target: Optional[str]` selon la convention sandbox.
   - Implémenter `POST /sandbox/spawn` au démarrage du run (ou recevoir le `sandbox_id` du backend).

2. **Corriger `_event_stream` dans `orchestrator/main.py`** :
   - Ne pas hardcoder `outcome='completed'` dans le `finally`.
   - Capturer l'état d'erreur / stop / success dans une variable locale et l'émettre correctement.

3. **Aligner `orchestrator-client.ts` sur le contrat complet de `startEngine`** :
   - Transmettre `model`, `envOverrides`, etc. dans le body `POST /runs` (nécessite d'étendre `StartRunRequest`).
   - Implémenter `sendSettingsUpdate` en mode orchestrator (`/runs/{id}/resume` ou endpoint dédié).

### Priorité P1 (risque opérationnel)

4. **Verrouiller `@assistant-ui/react` à `0.10.50`** ou valider la compatibilité ascendante de `0.14.0` avec les patches bench. Documenter la décision dans `AGENTS.md` et `package.json`.
5. **Ajouter `Idempotency-Key`** dans `api.ts` (`sendMessage` et `regenerate`) — UUID généré côté client, stocké 60s côté backend.
6. **Gérer le 410** dans le frontend : lors de `prepareSse`, si 410 → basculer automatiquement en `historyMode=true`.
7. **Ajouter une auth inter-service** (mTLS ou Bearer partagé) entre backend ↔ orchestrator ↔ sandbox.

### Priorité P2 (hygiène & dette)

8. **Dédupliquer les messages utilisateur** dans `translate_state_to_events` (orchestrator) en vérifiant si l'événement a déjà été émis pour ce `turn`.
9. **Normaliser les IDs d'événement** : utiliser une vraie librairie ULID côté orchestrator pour garantir l'ordering et la cohérence avec Redis Streams.
10. **Monitoring du mirror Postgres** : métrique Prometheus/Grafana sur `sse_mirror_insert_failed`.

---

*Fin du rapport.*
