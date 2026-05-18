# RAPPORT D'AUDIT — COHÉRENCE DES TYPES, SCHÉMAS ET MODÈLES DE DONNÉES

**Projet** : BJHUNT 4 MAX  
**Date** : 2026-05-13  
**Scope** : Backend (Hono/Drizzle/Zod) + Orchestrator (Python/LangGraph/Pydantic) + Frontend (Next.js/TS)  
**Fichiers analysés** :
- `D:\bjhunt-backend\src\db\schema.ts`
- `D:\bjhunt-backend\src\routes\chats.ts`
- `D:\bjhunt-backend\src\lib\sse.ts`
- `D:\bjhunt-backend\src\catalog\agents.ts`
- `D:\bjhunt-backend\src\catalog\compliances.ts`
- `D:\bjhunt-backend\src\env.ts`
- `D:\bjhunt-backend\src\routes\catalog.ts`
- `D:\bjhunt-backend\migrations\0001_init.sql` a `0012_messages_attachments_memories_share_links_api_keys_usage.sql`
- `D:\bjhunt-orchestrator\orchestrator\state.py`
- `D:\bjhunt-orchestrator\orchestrator\events.py`
- `D:\bjhunt-orchestrator\orchestrator\main.py`
- `D:\bjhunt-orchestrator\orchestrator\nodes\tool_executor.py`
- `D:\bjhunt-orchestrator\orchestrator\personas\registry.py`
- `D:\bjhunt-app\lib\api.ts`
- `D:\bjhunt-app\lib\bjhunt-runtime.ts`
- `D:\bjhunt-app\hooks\use-engagement-stream.ts`
- `D:\bjhunt-app\components\assistant-ui\thread.tsx`
- `D:\bjhunt-engine\bjhunt\STREAMING_EVENTS.md` (référence explicative)

---

## Méthodologie

Audit enterprise-grade comparant :
1. **Schéma de persistance** (Drizzle + SQL migrations PostgreSQL)
2. **Validateurs d'entrée** (Zod côté backend)
3. **Types du state LangGraph** (TypedDict / Pydantic côté orchestrator)
4. **Types consommateurs** (TypeScript côté frontend)
5. **Shapes d'événements SSE** (TYPED_EVENTS backend vs émissions orchestrator vs consommation frontend)

Critères retenus : cohérence des enums, nullabilité, types scalaires équivalents, valeurs par défaut, contraintes d'intégrité, conformité RLS.

---

## Entité : Chat / Run / Engagement

### Définitions croisées
| Propriété | Backend (TS/Drizzle/Zod) | Orchestrator (Python/TypedDict/Pydantic) | Frontend (TS) | Aligné? |
|---|---|---|---|---|
| id | `uuid` (PK) | `run_id: str` (uuid généré dans `main.py`) | `string` | Oui (tous UUID v4) |
| org_id / tenant | `chats.orgId: uuid. notNull().references(orgs.id)` | **Absent** — pas de notion multi-tenant | `chat.orgId: string` | Non |
| user_id (opérateur) | `triggered_by: uuid? -> users.id` | **Absent** | N/A côté type `Chat` | Non |
| scope | `jsonb. notNull()` | `Scope: TypedDict` (injecté dans `BJHUNTState`) | `ChatScope` (objet structuré) | Partiel |
| status lifecycle | `text` CHECK `('draft','pending','running','idle','completed','aborted','failed','expired')` | `phase: str` ('planning','stopped','report', libre) | `'draft' \| 'pending' \| 'running' \| 'idle' \| 'completed' \| 'aborted' \| 'failed' \| 'expired'` | Non |
| outcome | `text` nullable (no CHECK) | `outcome` string libre dans `run.completed` | `string \| null` | Partiel |
| kind | `text` CHECK `('initial','retest','adhoc','tlpt')` | **Absent** | `'initial' \| 'retest' \| 'adhoc' \| 'tlpt'` | Non |
| compliances_required | `text[]` notNull default '{}', Zod `z.array(z.enum(COMPLIANCE_IDS))` | **Absent** | `string[]` | Partiel |
| agents_enabled | `text[]` notNull default '{}' | **Absent** | `string[]` | Partiel |
| default_model | `text` notNull default 'glm-5.1' | **Absent** (hors `agent_id` string) | `string` notNull default 'glm-5.1' | Non |
| agent_models | `jsonb` notNull default '{}', Zod `record(string,string)` | **Absent** | `Record<string,string>` | Non |
| report_languages | `text[]` notNull default ARRAY['fr'] | **Absent** | `('fr' \| 'en')[]` | Non |
| asvs_target_level | `integer?` | **Absent** | `1 \| 2 \| 3 \| null` | Non |
| retention_days | `integer` notNull default 365 | **Absent** | `number` default 365 | Partiel |
| signedAt / signedBy | `timestamptz?`, `uuid?` | **Absent** | `string \| null` | Non |
| starts_at / expires_at | `timestamptz?` | **Absent** | `string \| null` | Non |
| tokens_prompt / tokens_completion | `bigint` notNull default 0 (mode number) | **Absent** (pas de metering exposé) | `number` (token store) | Non |
| cost_eur_micros | `bigint` notNull default 0 | **Absent** | `number` (token store) | Non |
| e2b_sandbox_id | `text?` | **Absent** | `string \| null` | Oui (stub) |
| created_at / updated_at | `timestamptz` notNull defaultNow() | **Absent** | `string` | Oui |

### Gaps identifiés
- [ ] L'**orchestrator ne porte aucune notion de `org_id`** ni de `user_id`. Les runs sont stockés en mémoire (`RUNS: dict[str, Any]`) sans isolation cross-tenant. Si l'orchestrator est exposé en direct (ou si le backend ne relaie pas), il n'y a aucune barrière entre organisations.
- [ ] Le **cycle de vie** est fragmenté : le backend utilise 8 statuts textuels (avec CHECK en migration 0008), l'orchestrator utilise `phase: str` avec seulement 3 valeurs implicites. Le modèle Python n'a pas d'enum ni de validation de statut.
- [ ] Les **champs de configuration** (`kind`, `compliances_required`, `agents_enabled`, `default_model`, `report_languages`, `asvs_target_level`, `retention_days`, `signedAt`, etc.) sont absents de l'orchestrator. Lors du switch `BJHUNT_ENGINE_MODE=orchestrator`, ces informations transitent via variables d'environnement (`BJHUNT_COMPLIANCES`, `BJHUNT_AGENTS_ENABLED`, etc.) mais ne sont pas modélisées dans les Pydantic models (`StartRunRequest` se limite à `scope` + `agent_id`).
- [ ] Le **findings / evidence / metering** ne sont pas persistés par l'orchestrator ; ils sont soit émis en SSE, soit perdus si le service redémarre. Pas d'équivalent de la table `findings` ou `evidence` côté Python.

### SEVERITE : 🔴 Critique
> L'orchestrator est un point de rupture architectural majeur pour l'isolation multi-tenant et la richesse du modèle de données. Il ne peut pas remplacer le backend en l'état sans perte de conformity au schéma relationnel.

---

## Entité : Scope

### Définitions croisées
| Propriété | Backend (TS/Drizzle/Zod) | Orchestrator (Python/TypedDict) | Frontend (TS) | Aligné? |
|---|---|---|---|---|
| in_scope | `z.array(z.string().min(1)).default([])` -> `jsonb` | `List[str]` | `string[]` | Oui |
| out_of_scope | `z.array(z.string().min(1)).default([])` -> `jsonb` | `List[str]` | `string[]` | Oui |
| rules_of_engagement | `z.string().min(0).default('...')` -> **string** | `List[str]` | `string` | **Non** |
| allowed_hours | `z.string().optional()` | **Absent** | `string?` | Non |
| max_rps | `z.number().int().positive().optional()` | **Absent** | `number?` | Non |
| evasion | `z.boolean().optional()` | **Absent** | `boolean?` | Non |
| no_destructive | `z.boolean().default(true)` | **Absent** | `boolean?` | Non |

### Gaps identifiés
- [ ] `rules_of_engagement` : **string** côté Backend/Frontend, mais **`List[str]`** côté Orchestrator (`Scope.rules_of_engagement: List[str]`). Si le backend sérialise `scope` en JSON et l'envoie à l'orchestrator, le TypedDict provoquera une incohérence de type au runtime Python (mypy ne râlera peut-être pas car runtime unchecked, mais la shape est fausse).
- [ ] Les champs `allowed_hours`, `max_rps`, `evasion`, `no_destructive` sont absents du `Scope` Python. L'orchestrator ne peut donc pas respecter les règles de rate-limit, les fenêtres horaires ou les clauses de non-destruction définies par l'opérateur.

### SEVERITE : 🔴 Critique
> L'erreur de type sur `rules_of_engagement` (str vs list) est une faille de contrat inter-service. Elle provoquera des erreurs de parsing côté orchestrator ou des serialisations inattendues côté backend.

---

## Entité : SSE Events (14 TYPED_EVENTS)

### Définitions croisées — tableau des events

| Event | Backend (TYPED_EVENTS + shapes émises) | Orchestrator (events.py + main.py) | Frontend (hooks/use-engagement-stream.ts + bjhunt-runtime.ts) | Aligne? |
|---|---|---|---|---|
| `run.started` | Émis par backend via `engine-adapter` + sse.ts. Shape attendue: `{session_id, ts}` | Émis dans `_event_stream` avec `{'session_id': run_id, 'ts': ...}` | Reçu, reset `runEndedAt`, `runOutcome`. Oui. | 🟢 Oui |
| `agent.started` | Shape attendue STREAMING_EVENTS.md: `{run_id, agent_id, agent_type, spawned_by, model, input, color}` | Émis dans `translate_state_to_events` avec `{agent_id, agent_type, ts}` | Reçu dans reducer `agent.started` : attend `agent_id`, `agent_type`, `color`. L'orchestrator manque `color`, `model`, `input`. | 🟡 Warning |
| `agent.thinking` | Shape: `{run_id, agent_id, delta, low_priority?}` | Émis avec `{agent_id, role, delta, ts}`. Si `role == 'assistant'` -> delta. `role == 'user'` -> delta. | Frontend reducer et runtime traitent `delta` et `role`. L'orchestrator n'émet pas `low_priority`. | 🟡 Warning |
| `agent.tool_call` | Shape attendue: `{run_id, agent_id, tool_call_id, tool, input_summary, input_redacted, scope_check}` | Émis avec `{agent_id, agent_type, tool, tool_label, ts}`. **Manque `tool_call_id`, `input` / `input_summary`.** | Frontend `bjhunt-runtime.ts` attend `tool_use_id` et `input` pour le rendu tool-call (fallback `ev.ulid` et `{}`). La UI verra des tool-calls sans args. | 🟡 Warning |
| `agent.tool_result` | Shape: `{run_id, agent_id, tool_call_id, exit_code, duration_ms, output_inline, output_ref, truncated}` | Émis avec `{agent_id, tool, ok, summary, ts}`. **Manque `tool_call_id`, `exit_code`, `duration_ms`, `output_ref`.** | Frontend reducer **ignore** cet event (pass-through `continue`). Pas d'impact UI direct, mais perte de données. | 🟡 Warning |
| `agent.finding` | Shape riche (STREAMING_EVENTS.md): `{run_id, agent_id, finding_id, title, severity, asset, category, compliance_mappings, evidence_ids, ...}` | Émis depuis extraction JSON fenced dans `agent.thinking` : prend tous les champs du JSON extrait + `finding_id`. | Frontend `FindingEntry` consomme `finding_id`, `title`, `severity`, `asset`, `category`, `compliance_mappings`, `remediation`. OK si l'orchestrator émet des fenced blocks bien formés, mais pas garanti. | 🟡 Warning |
| `agent.canvas` | Shape STREAMING_EVENTS.md pas complètement documentée mais backend peut pousser un snapshot. | **Non émis** | Frontend `applyEvent` gère `agent.canvas` avec `{content, revision, updated_at, updated_by}`. | 🟡 Warning |
| `secret.redacted` | Shape: `{run_id, agent_id, tool_call_id, secret_kind, redacted_preview, reason}` | **Non émis** | Frontend reducer n'a pas de handler (ignore implicitement). | 🟢 OK (pas de consommateur actif) |
| `evidence.captured` | Shape: `{run_id, evidence_id, type/kind, sha256, size_bytes, r2_key, captured_at, agent_id, tool, redactions_applied}` | Émis depuis extraction JSON fenced : `{evidence_id, ...e, ts}`. Ne garantit **pas** `kind`, `size_bytes`, `redacted`. | Frontend attend `evidence_id`, `kind` (mappe à `type`), `sha256`, `size_bytes`, `redacted`. Risque de `undefined` si les fenced blocks ne contiennent pas les bons champs. | 🟡 Warning |
| `dream.diary_entry` | Shape: `{run_id, engagement_id, entry_id, title, narrative_md, tags, linked_findings}` | **Non émis** | Frontend `DreamEntry` consomme `entry_id`, `title`, `narrative_md`. L'event ne sera jamais reçu en mode orchestrator. | 🟡 Warning |
| `agent.completed` | Shape: `{run_id, agent_id, summary_md, findings_count, evidence_count, tokens_used, duration_ms}` | Émis à l'entrée de `phase == 'report'` avec `{agent_id, agent_type, ts}`. **Manque tous les champs analytiques.** | Frontend reducer met à jour `status='completed'` et `finishedAt`. OK pour le statut, mais perte des métriques. | 🟡 Warning |
| `run.completed` | Shape: `{run_id, engagement_id, ended_at, outcome, findings_total, reports_generated, report_refs}` | Émis dans `_event_stream` finally avec `{outcome:'completed', ts}`. Backend peut aussi émettre `{outcome:'aborted', report_refs, ...}`. | Frontend consomme `outcome` et `report_refs`. OK. | 🟢 Oui (shape minimale OK) |
| `error.scope_violation` | Shape: `{run_id, agent_id, tool_call_id, blocked_target, reason, action_taken}` | **Non émis** | Frontend `scopeViolations` tableau consomme `blocked_target`, `reason`. L'event ne sera jamais produit. | 🟡 Warning |
| `error.runtime` | Shape: `{run_id, agent_id, kind, message, recoverable?}` | Émis dans `except` de `_event_stream` avec `{kind:'stream_error', message}`. | Frontend ne traite pas spécifiquement (dispatcher générique). | 🟢 OK |

### Gaps identifiés
- [ ] L'orchestrator ne produit que **~9 events sur 14** ; `agent.canvas`, `secret.redacted`, `dream.diary_entry`, `error.scope_violation` sont absents.
- [ ] Les shapes des events produits par l'orchestrator sont **minimales** : absence de `tool_call_id`, `color`, `model`, `input`, `output_ref`, `duration_ms`, etc. Le frontend a des fallbacks (`ev.ulid`, `{}`) mais des fonctionnalités (args tool-call, rendu coloré, référence evidence) seront dégradées.
- [ ] Le backend fait confiance à l'engine openclaude (via `engine-process.ts`) pour émettre les events conformes à `STREAMING_EVENTS.md`. L'orchestrator n'a pas de contrat explicite avec `engine-process.ts` ; son `translate_state_to_events` est une ré-implémentation ad-hoc.
- [ ] Le backend `sse.ts` déclare `TYPED_EVENTS` comme tableau `const` de 14 items. L'orchestrator n'a pas d'enum équivalent et peut émettre des strings libres (risque de typo, e.g. `agent.toolResult` vs `agent.tool_result`).

### SEVERITE : 🟡 Warning
> Le frontend consomme un vocabulaire SSE riche que l'orchestrator ne satisfait qu'en partie. Le passage de `openclaude` à `orchestrator` dégradera l'expérience opérateur (pas de canvas, pas de dream diary, tool-calls sans arguments).

---

## Entité : Agent / Persona

### Définitions croisées
| Propriété | Backend (TS) | Orchestrator (Python) | Frontend (TS) | Aligne? |
|---|---|---|---|---|
| id | `string` (e.g. `bjhunt-coordinator`) | `persona_id: str` (nom de fichier `.md`) | `string` | Oui |
| name | `string` | **Absent** (seul le prompt MD est stocké) | `string` | Non |
| category | `AgentCategory` union string | **Absent** | `AgentCategory` union string | Non |
| defaultModel | `'bjhunt-27b' \| 'glm-5.1' \| 'qwen3-coder' \| 'kimi-k2-thinking' \| 'deepseek-v3.2'` | **Absent** | `ModelId` (même union) | Non |
| color | `string` | **Absent** | `string` | Non |
| whenToUse | `string` | **Absent** | `string` | Non |
| defaultEnabled | `boolean` | **Absent** | `boolean` | Non |
| isReporting | `boolean?` | **Absent** | `boolean?` | Non |

### Gaps identifiés
- [ ] Le `PersonaRegistry` Python ne charge que `{id, prompt}` depuis des fichiers `.md`. Il n'a **aucune métadata** (category, model, couleur, activation par défaut). Si le dashboard en mode orchestrator affiche la liste des agents, elle ne pourra pas être peuplée depuis le registry Python ; il faudra dupliquer la source de vérité (catalogue TS -> JSON).
- [ ] Les **38 personas** du backend ne sont pas répliqués dans l'orchestrator (seuls les fichiers `.md` dans `personas/prompts/` le sont, sans structure typée).
- [ ] Le calcul d'`effectiveAgentList` dans `chats.ts` utilise `AGENTS` (catalogue TS). L'orchestrator ne peut pas le valider car il ignore `defaultEnabled` et `isReporting`.

### SEVERITE : 🟡 Warning
> Le registry Python est un stub fonctionnel mais non typé. La logique métier de sélection des agents reste du côté backend/frontend.

---

## Entité : Compliance

### Définitions croisées
| Propriété | Backend (TS) | Orchestrator (Python) | Frontend (TS) | Aligne? |
|---|---|---|---|---|
| id | `string` | **Absent** | `string` | Non |
| name | `string` | **Absent** | `string` | Non |
| version | `string` | **Absent** | `string` | Non |
| reportingAgentId | `string` | **Absent** | `string` | Non |
| typstTemplate | `string` | **Absent** | `string` | Non |
| jurisdictionScope | `string[]` | **Absent** | `string[]` | Non |
| group | `'security' \| 'privacy' \| 'sector' \| 'meta'` | **Absent** | idem | Non |
| description | `string` | **Absent** | `string` | Non |

### Gaps identifiés
- [ ] L'orchestrator est **totalement ignorant** des frameworks de compliance. Le `StartRunRequest` ne prend que `scope` (in_scope/out_of_scope). Aucune donnée `compliances_required` n'est injectée dans le state LangGraph.
- [ ] Les reporting agents (typst templates, génération PDF) sont gérés côté backend (`renderMarkdownReport`). L'orchestrator ne peut pas déclencher de rapports de compliance car il n'a pas le mapping `compliance_id -> reportingAgentId -> template`.

### SEVERITE : 🔴 Critique
> Sans modelling du catalogue compliance, l'orchestrator ne peut pas produire d'audits conformes aux standards PCI-DSS, ISO 27001, etc. C'est un blocage fonctionnel majeur pour un usage production.

---

## Entité : Tool Result

### Définitions croisées
| Propriété | Backend (Drizzle) | Orchestrator (Python TypedDict) | Frontend (TS) | Aligne? |
|---|---|---|---|---|
| tool | `evidence.tool : text notNull` | `ToolResult["tool"]: str` | N/A (rendu inline) | Oui |
| command / args | N/A (non persisté) | `ToolResult["command"]: str` (join des args) | `args` attendu dans `agent.tool_call` | Partiel |
| stdout | N/A (dans R2 ou inline evidence) | `ToolResult["stdout"]: str` | Non modélisé dans UI | Oui (orchestrator only) |
| stderr | N/A | `ToolResult["stderr"]: str` | Non modélisé | Oui |
| exit_code | N/A | `ToolResult["exit_code"]: int` | Non modélisé | Oui |
| duration_ms | N/A | `ToolResult["duration_ms"]: int` | Non modélisé | Oui |

### Gaps identifiés
- [ ] Le schéma `ToolResult` de l'orchestrator est cohérent avec la fonction `execute_tool` dans `tool_executor.py`, mais il n'y a **pas de table de persistence** dans le backend. Les résultats de tools ne sont conservés que via `stream_events.payload` (JSONB miroir) ou via l'entité `evidence` si un hook capture le stdout.
- [ ] Le frontend n'a pas de type `ToolResult` standalone ; il extrait seulement `tool_use_id`, `toolName`, `args` pour le rendu `tool-call`. Le résultat (`exit_code`, `stdout`) est ignoré dans `bjhunt-runtime.ts` (event `agent.tool_result` skippé).

### SEVERITE : 🟢 OK
> Il s'agit d'une entité éphémère. La cohérence interne orchestrator est correcte. La non-persistence côté backend est volontaire (append-only evidence + stream_events mirror).

---

## Entité : Finding

### Définitions croisées
| Propriété | Backend (Drizzle) | Orchestrator (TypedDict) | Frontend (`FindingEntry`) | Aligne? |
|---|---|---|---|---|
| id | `uuid` PK | `str` | `string` | Oui |
| title | `text. notNull()` | `str` | `string` | Oui |
| severity | `text. notNull()` CHECK ('critical','high','medium','low','info') | `str` | `'critical' \| 'high' \| 'medium' \| 'low' \| 'info'` | Partiel |
| cvss_v4_vector | `text?` | **Absent** | `cvss.vector?` | Non |
| cvss_v4_score | `numeric(3,1)?` | **Absent** | `cvss.score?` | Non |
| epss | `numeric(5,4)?` | **Absent** | `cvss.epss?` | Non |
| in_kev | `boolean` default false | **Absent** | `cvss.in_kev?` | Non |
| dread_score | `numeric(3,1)?` | **Absent** | N/A | Non |
| business_impact | `text?` | **Absent** | N/A | Non |
| asset_kind | `text. notNull()` | **Absent** | `asset.type?` | Non |
| asset_value | `text. notNull()` | **Absent** | `asset.value?` | Non |
| category | `text?` | **Absent** | `string?` | Non |
| compliance_mappings | `jsonb` default '{}' | **Absent** | `Record<string,string[]>?` | Non |
| reproduction | `text?` | **Absent** | N/A | Non |
| impact | `text?` | **Absent** | N/A | Non |
| remediation | `text?` | **Absent** | `string?` | Non |
| evidence_ids | `uuid[]` default '{}' | **Absent** | N/A | Non |
| status (finding) | `text` default 'open' CHECK `('open','accepted','mitigated','false_positive','closed')` | **Absent** | N/A | Non |
| description | N/A (Drizzle n'a pas ce champ) | `str` | N/A | — |
| evidence | N/A (Drizzle utilise `evidence_ids` + table `evidence`) | `str` | N/A | — |

### Gaps identifiés
- [ ] Le `Finding` TypedDict de l'orchestrator est **drastiquement simplifié** par rapport au schéma DB (`findings` migration 0004) : il manque `asset`, `category`, `compliance_mappings`, `cvss`, `epss`, `in_kev`, `evidence_ids`, `reproduction`, `impact`, `remediation`, etc.
- [ ] L'orchestrator stocke `description` et `evidence` (strings) que le backend DB ne possède pas sous ces noms exacts (`title` + `impact`/`reproduction` existent, mais pas `description`).
- [ ] Si l'orchestrator est utilisé pour peupler `findings` via SSE puis insertion en DB, **la plupart des colonnes resteront vides ou nécessiteront un mapping manuel** non documenté.
- [ ] Le backend DB CHECK sur `findings.status` a changé entre migration 0001 (`'open','fixed','partially_fixed','risk_accepted','false_positive'`) et 0004 (`'open','accepted','mitigated','false_positive','closed'`). Il n'y a pas de migration de données ; les anciennes valeurs ne sont pas portées.

### SEVERITE : 🔴 Critique
> Le modèle de donnée `Finding` est l'entité métier la plus importante. L'écart entre orchestrator et backend est incompatible avec une persistence fiable pour SOC 2 / audit.

---

## Entité : Evidence

### Définitions croisées
| Propriété | Backend (Drizzle/migrations) | Orchestrator (Python) | Frontend (`EvidenceEntry`) | Aligne? |
|---|---|---|---|---|
| id | `uuid` PK | **Absent** (pas de type Evidence) | `string` | Non |
| org_id | `uuid` notNull FK orgs | **Absent** | N/A | Non |
| chat_id | `uuid` notNull FK chats | **Absent** | N/A | Non |
| agent_id | `text?` | **Absent** | N/A | Non |
| tool | `text. notNull()` | **Absent** | N/A | Non |
| sha256 | `text. notNull()` | **Absent** | `string` (depuis SSE) | Partiel |
| bytes | `bigint. notNull()` | **Absent** | `number` (map depuis `size_bytes`) | Partiel |
| truncated | `boolean` default false | **Absent** | N/A | Non |
| redactions_applied | `text[]` default '{}' | **Absent** | `string[]` (map depuis `redacted`) | Partiel |
| r2_key | `text. notNull()` | **Absent** | N/A | Non |
| encryption | `text` default 'sse-c-engagement' | **Absent** | N/A | Non |
| hash_chain_prev | `text?` | **Absent** | N/A | Non |
| captured_at | `timestamptz` default now() | **Absent** | N/A | Non |

### Gaps identifiés
- [ ] L'orchestrator ne modélise pas la chaîne de custody (evidence). Les résultats de tools (`ToolResult`) sont en mémoire mais **jamais hashés, chaînés ni versés en R2**. Le `secret.redacted` manquant confirme l'absence de pipeline de nettoyage.
- [ ] Le frontend `bjhunt-runtime.ts` traduit `ev.data?.redacted === true` en `['auto-redacted']`. L'orchestrator ne garantit pas la présence du champ `redacted` dans les fenced blocks `bjhunt-evidence`.

### SEVERITE : 🟡 Warning
> La preuve forensique est une exigence compliance. L'orchestrator ne l'implémente pas ; le backend la gère mais l'interconnexion est fragile.

---

## Entité : Message (chat messages)

### Définitions croisées
| Propriété | Backend (Drizzle schema.ts) | Orchestrator (Python) | Frontend (TS/assistant-ui) | Aligne? |
|---|---|---|---|---|
| id | `uuid` PK | N/A (list[dict]) | `string` | Partiel |
| org_id | `uuid` notNull FK | **Absent** | N/A | Non |
| chat_id | `uuid` notNull FK chats | N/A | N/A | Oui (runtime) |
| parent_id | `uuid?` | **Absent** | N/A | Non |
| role | `text` notNull CHECK ('user','assistant','system','tool') | `dict["role"]: str` | `ThreadMessageLike["role"]` | Partiel |
| agent_id | `text?` | **Absent** (deduit de state.agent_id) | `custom.agentId?` | Non |
| content | `jsonb` notNull | `dict["content"]: str` | `ThreadMessageLike["content"]` (text / parts) | Partiel |
| model | `text?` | **Absent** | N/A | Non |
| tokens_prompt | `bigint` default 0 | **Absent** | N/A | Non |
| tokens_completion | `bigint` default 0 | **Absent** | N/A | Non |
| cost_eur_micros | `bigint` default 0 | **Absent** | N/A | Non |
| tool_calls | `jsonb?` | **Absent** | `tool-call` parts | Non |
| edited_at | `timestamptz?` | **Absent** | N/A | Non |
| deleted_at | `timestamptz?` | **Absent** | N/A | Non |
| user_id | `uuid?` FK users | **Absent** | N/A | Non |

### Gaps identifiés
- [ ] Le backend Zod `SeedMessagesBody` définit `role` comme `z.enum(['user', 'assistant', 'system'])` alors que la **DB CHECK autorise aussi `'tool'`** (migration 0012). Si un message avec `role='tool'` est reçu, il sera rejeté par Zod mais accepté par Postgres.
- [ ] L'orchestrator utilise une **liste de dicts non typés** pour `messages` (`Annotated[list, add_messages]`). Pas de garantie que les champs respectent le format ThreadMessageLike assistant-ui.
- [ ] Le frontend `api.ts` `CreateChatBody` et `PatchChatBody` n'exposent pas `messages` ; la construction de l'historique se fait via SSE + `messages` table uniquement. Cohérent avec l'architecture nouvelle table `messages` (Phase 3).

### SEVERITE : 🟡 Warning
> Le manque de validation Zod sur `role='tool'` peut bloquer des imports d'historique ou des messages tool natifs. La structure message de l'orchestrator est trop peuplée (str only) pour supporter rich content (parts, tool-calls, images).

---

## Entité : Modèle de données complémentaires (utilisateurs, orgs, etc.)

### Définitions croisées
| Propriété | Backend (Drizzle) | Frontend (TS) | Aligne? |
|---|---|---|---|
| users | RLS FORCE (0010, 0011) + policies | N/A | Oui |
| org_members.role | `text` CHECK ajouté 0007 : `('owner','admin','lead','operator','viewer','member')` | N/A | Oui (backend only) |
| audit_log | Append-only triggers + RLS. `outcome` CHECK `('success','denied','error')` | `AuditEntry["outcome"]: string` | Partiel |

### Gaps identifiés
- [ ] Le **frontend** ne modélise pas `org_members` ni les policies RLS. C'est normal, mais l'absence de type `OrgMember` ou `Role` côté frontend empêche une validation côté client de l'UI admin (la page members est en cours de construction).
- [ ] Le champ `users.default_compliances` est `text[]` default `ARRAY[]::text[]`. Le frontend n'a pas de type dédié pour pré-sélectionner les compliances par défaut lors de la création de chat.

### SEVERITE : 🟢 OK
> Gaps mineurs ; pas de risque de sérialisation inter-service.

---

# RÉSUMÉ EXÉCUTIF

## Top 5 risques

1. **Rupture de contrat Scope (`rules_of_engagement`)** — `string` côté backend/frontend, `List[str]` côté orchestrator. Au runtime, le JSON injecté dans `BJHUNT_CHAT_SCOPE_JSON` provoquera un type mismatch dans le TypedDict Python. **Impact** : crash du graphe LangGraph ou silence sur les règles de conduite. **Mitigation** : aligner sur `str` partout ou changer le backend en `string[]`.

2. **Orchestrator sans isolation multi-tenant** — Aucun `org_id`, `user_id`, ni RLS. Les runs sont en mémoire globale (`RUNS: dict`). **Impact** : fuite de données cross-org si le endpoint orchestrator est accessible. **Mitigation** : passer systématiquement par le backend comme proxy, ou injecter `org_id`/`user_id` dans le state LangGraph et valider dans chaque node.

3. **Schéma Finding incomplet côté orchestrator** — Le TypedDict `Finding` Python ne contient que 6 champs. Le backend Drizzle en définit 22. **Impact** : perte totale des métriques CVSS/EPSS, des mappings compliance, des evidence IDs, etc. lors du basculement sur le mode orchestrator. **Mitigation** : enrichir `Finding` pour qu'il reflète le schéma 0004, ou ne pas utiliser l'orchestrator comme source de truth des findings.

4. **Enum de statut findings modifiée sans compatibilité rétroactive** — Migration 0004 remplace les valeurs `('open','fixed','partially_fixed','risk_accepted','false_positive')` par `('open','accepted','mitigated','false_positive','closed')`. **Impact** : si des données existent en dev/staging avec les anciennes valeurs, elles seront en violation du nouveau CHECK Postgres. **Mitigation** : ajouter une migration de transition (`UPDATE findings SET status = ... WHERE status IN (...)`).

5. **Events SSE sous-spécifiés côté orchestrator** — Absence de `agent.canvas`, `secret.redacted`, `dream.diary_entry`, `error.scope_violation`. Les shapes des events présents (`agent.tool_call`, `evidence.captured`) manquent des champs que le frontend attend. **Impact** : dégradation UX (tool-call sans args, evidence sans type/taille, pas de canvas). **Mitigation** : implémenter `translate_state_to_events` parité complète avec `STREAMING_EVENTS.md`, ou documenter les events non supportés en mode orchestrator.

## Recommandations immédiates

| Priorité | Action | Owner |
|---|---|---|
| P0 | Corriger `Scope.rules_of_engagement` dans `orchestrator/state.py` pour passer de `List[str]` à `str` (ou harmoniser en `List[str]` dans le backend si métier). | Backend / Orchestrator |
| P0 | Injecter `org_id` et `user_id` dans `BJHUNTState` et les Pydantic models (`StartRunRequest`) pour traçabilité. | Orchestrator |
| P1 | Aligner le TypedDict `Finding` sur le schéma Drizzle (`findings`) : ajouter `asset_kind`, `asset_value`, `category`, `compliance_mappings`, `cvss_v4_vector`, `cvss_v4_score`, `epss`, `in_kev`, `evidence_ids`, `reproduction`, `impact`, `remediation`. | Orchestrator |
| P1 | Ajouter une migration SQL intermédiaire pour mapper les anciennes valeurs `findings.status` vers les nouvelles avant d'appliquer le CHECK 0004. | Backend |
| P1 | Ajouter le champ `'tool'` dans l'enum Zod du `SeedMessagesBody` et valider que le payload JSON est compatible avec `ThreadMessageLike` assistant-ui. | Backend |
| P2 | Implémenter les events SSE manquants dans `orchestrator/events.py` ou documenter explicitement le delta fonctionnel en mode `BJHUNT_ENGINE_MODE=orchestrator`. | Orchestrator |
| P2 | Créer un catalogue partagé (JSON ou OpenAPI schema) pour `AgentMeta` et `ComplianceMeta` afin que l'orchestrator puisse le consommer sans duplication. | Architecture |
| P2 | Générer les types TypeScript frontend automatiquement depuis le schéma Zod backend (ex: `zod-to-json-schema` + `json-schema-to-typescript`) pour éviter les divergences futures. | DevOps / Frontend |

---

*Fin du rapport.*
