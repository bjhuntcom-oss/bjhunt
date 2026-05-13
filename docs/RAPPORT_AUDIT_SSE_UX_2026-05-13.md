# RAPPORT D'AUDIT SSE / UX — BJHUNT 4 MAX
**Date :** 2026-05-13
**Scope :** `bjhunt-app` frontend, `bjhunt-backend`, `bjhunt-orchestrator`, `bjhunt-engine` (legacy docs)
**Auditeur :** Agent d'audit frontend/UX niveau entreprise grade
**Mandat :** Vérifier que le frontend consomme EXACTEMENT les events SSE que le backend et l'orchestrator émettent, et que CHAQUE event est rendu correctement dans l'UI. Identifier drift, events orphelins, renderings manquants.

---

## Résumé exécutif — TOP 5 RISQUES UX

| # | Risque | Sévérité | Impact opérateur |
|---|--------|----------|------------------|
| 1 | **error.runtime jamais rendu dans le thread** — consommé par la page pour notification desktop, mais pas transformé en bulle de chat. L'opérateur ne voit pas l'erreur dans le fil de discussion. | 🔴 | Erreurs silencieuses dans le thread ; l'opérateur doit deviner qu'un crash est survenu. |
| 2 | **AgentBadge toujours vide** — `processNewEvents` ne stampe jamais `metadata.custom.agentId` sur les messages assistant. L'opérateur ne sait jamais quelle persona parle. Badge masqué à 100 %. | 🔴 | Aucune attribution d'agent dans le chat ; perte de la fonction multi-persona. |
| 3 | **dream.diary_entry orphelin** — frontend 100 % câblé (reducer + placeholder thread + DreamDiaryPanel), mais NI le backend engine-process NI l'orchestrator n'émettent cet event. Le panneau Journal reste vide pour toujours. | 🔴 | Feature promise (narration contextuelle) totalement absente malgré UI complète. |
| 4 | **Kill-switch cascade cassée en mode orchestrateur** — `killEngine` ferme la connexion SSE côté backend avant que l'orchestrator n'ait forcément émis `run.completed`. Le frontend ne reçoit jamais l'event terminal, reste en `isRunning=true` à jamais jusqu'au reload. | 🔴 | Bouton Cancel bloqué, pill de statut figé, queue jamais flushée. |
| 5 | **run.started dual-write (mode legacy)** — émis par `system/init` au spawn PUIS par `sendMessage()` à chaque tour (même tour 1). Le thread affiche 2× "--- Audit démarré ---". | 🟡 | Bruit visuel inutile, confusion sur le démarrage réel. |

---

## Inventaire des 14 TYPED_EVENTS + error.runtime

### Méthodologie de traçage
- **Émis par backend** = `writeEvent()` appelé explicitement ou pass-through orchestrateur-client.
- **Émis par orchestrator** = `yield` dans `_event_stream` ou `_dispatchEvent`.
- **Consommé frontend** = trois couches :
  1. `use-engagement-stream.ts` : réception SSE + reducer (state.events, state.agents, state.findings, etc.)
  2. `bjhunt-runtime.ts` `processNewEvents` : projection events → `ThreadMessageLike[]` (ce qui est réellement rendu par assistant-ui)
  3. `Thread.tsx` : rendu final (composants, badges, panneaux)

---

## Event : `run.started`
### Émis par
- **Backend (engine-process.ts)** : **OUI, 2 sources distinctes**
  - Ligne 674 (`case 'system': subtype === 'init'`) : émis une fois au spawn openclaude.
  - Ligne 553 (`sendMessage()`) : **re-émis à chaque tour utilisateur** (y compris turn 1 qui reçoit déjà celui du `init`).
- **Backend (orchestrator-client.ts)** : **NON** — `sendMessage()` n'émet pas `run.started` (ligne 208-241). Le run.started vient uniquement du pass-through orchestrateur.
- **Orchestrator (events.py)** : **NON** directement — mais `main.py` `_event_stream` ligne 165 émet `run.started` upfront.
- **Orchestrator (main.py)** : **OUI**, ligne 165.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI** — TYPED_EVENTS ligne 13, listener ligne 424-429. Reducer case ligne 213-222 : reset `runStartedAt`, `runEndedAt`, `runOutcome`.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, case `run.started` ligne 220-227 : pousse un message `role: 'system'` texte "--- Audit démarré ---".
- `Thread.tsx` : rendu comme n'importe quel message system par `MessagePrimitive.Parts`. Pas de composant dédié.

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé? | Type émis | Type attendu | Aligné? |
|-------|--------------|------------|-----------|-----------|--------------|---------|
| session_id | oui (system/init) | oui (run_id) | non utilisé | string | string | 🟢 formel |
| turn | oui (sendMessage) | non | non utilisé | boolean | — | 🟡 drift field |
| model | oui (system/init) | non | non utilisé | string | string | 🟢 |
| tools | oui (system/init) | non | non utilisé | number | number | 🟢 |

### Gaps
- [ ] **Dual-write legacy** : turn 1 reçoit `run.started` (system/init) + `run.started` (sendMessage). Le thread montre deux badges "--- Audit démarré ---".
- [ ] **Reset agressif du reducer** : chaque `run.started` efface `runEndedAt` et `runOutcome` (ligne 219-221). Si un event `run.completed` précédent était déjà arrivé, son état disparaît à la nouvelle connexion SSE (Postgres replay) ou au multi-turn. Heureusement le frontend ne ferme plus la connexion SSE sur `run.completed` (Phase 3), donc le replay est la seule vraie source de regression.

### SEVERITÉ : 🟡

---

## Event : `agent.started`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, lignes 698-706. Émis la première fois qu'un `agentId` est vu dans un frame `assistant` ou `stream_event`. 
- **Backend (orchestrator-client.ts)** : **NON directement** — pass-through des events orchestrateur. `_dispatchEvent` n'a pas de logique spécifique pour agent.started.
- **Orchestrator (events.py)** : **OUI**, lignes 43-52. Émis si `full_agent_id` pas encore dans `seen_agents`.
- **Orchestrator (main.py)** : pass-through via `_format_sse`.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 223-234 : crée `AgentEntry` dans `state.agents` Map.
- `bjhunt-runtime.ts processNewEvents` : **OUI, mais silencieux** — filtré par `continue` ligne 164-167. L'event ne produit **aucun** `ThreadMessageLike`. Il n'alimente donc pas le thread.
- `Thread.tsx` : **NON** — `AssistantMessage` lit `metadata.custom.agentId` / `agentType` via `AgentBadge`. Comme `processNewEvents` ne stampe jamais ces champs sur les messages, le badge reste masqué (`if (!agentId) return null`).

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé reducer? | Consommé thread? | Aligné? |
|-------|--------------|------------|-------------------|------------------|---------|
| agent_id | oui | oui | oui (clé Map) | **non** (jamais sur message) | 🔴 |
| agent_type | oui | oui | oui | **non** | 🔴 |
| model | oui | oui | non | non | 🟡 |
| color | non | non | — | — | N/A |
| input | non | non | — | — | N/A |

### Gaps
- [ ] **AgentBadge mort** : aucun message assistant ne porte `metadata.custom.agentId`. La feature d'affichage du nom de persona est totalement inopérante.
- [ ] `color` et `input` documentés dans STREAMING_EVENTS.md mais jamais émis.

### SEVERITÉ : 🔴

---

## Event : `agent.thinking` (role = assistant)
### Émis par
- **Backend (engine-process.ts)** : **OUI**
  - Ligne 716 (`assistant` frame, text block non-streamé)
  - Ligne 926 (`stream_event` partial text_delta)
  - Ligne 769 (empty delta avec usage metadata en fin de turn)
- **Backend (orchestrator-client.ts)** : **pass-through uniquement** — si l'orchestrator émet cet event, `_dispatchEvent` le relaie via `writeEvent`.
- **Orchestrator (events.py)** : **OUI**, lignes 59-68 : pour chaque message `role === 'assistant'` avec contenu.
- **Orchestrator (main.py)** : pass-through.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 236-241 : append `delta` à `thinkingTokens` de l'agent courant.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, cœur du streaming lignes 135-158. Appends text delta au `tailTextBuf` de la dernière bulle assistant.
- `Thread.tsx` : **OUI** — rendu comme texte standard par `MessagePrimitive.Parts` → `MarkdownText`. Pas de composant dédié "thinking" (aucun panneau CoT dédié).

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé? | Type émis | Type attendu | Aligné? |
|-------|--------------|------------|-----------|-----------|--------------|---------|
| agent_id | oui | oui | oui (reducer) | string | string | 🟢 |
| role | oui | oui | oui | 'assistant' | 'assistant' | 🟢 |
| delta | oui | oui | oui | string | string | 🟢 |
| usage | oui (fin turn) | non | **non** | {prompt,completion,model} | BjhuntTokenStats | 🔴 |

### Gaps
- [ ] **`usage` totalement ignoré** : le reducer reçoit `agent.thinking` avec `usage` (ligne 769 engine-process) mais ne l'extracte pas. Le token-store (`lib/token-store.ts`) n'est pas alimenté par l'event SSE ; le `CostMeter` doit faire un fetch séparé (ou est-ce qu'il lit autre chose ? Hors scope, mais worth noting). Les tokens affichés par `PerMessageTokens` ne sont pas alimentés par cet event.

### SEVERITÉ : 🟡

---

## Event : `agent.thinking` (role = user)
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 558 (`sendMessage`) : `agent_id:'user', role:'user', delta:args.text`.
- **Backend (orchestrator-client.ts)** : **OUI**, ligne 228-239 (`sendMessage`) : même shape.
- **Orchestrator (events.py)** : **OUI**, lignes 92-101.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI** (pass-through dans events), reducer tente de mettre à jour `agents.get('user')` mais cet agent n'existe pas → NO-OP. Event ajouté à `events[]`.
- `bjhunt-runtime.ts processNewEvents` : **`if (rd.role === 'user') continue`** (ligne 136). **Explicitement filtré** — ne produit aucun message thread.
- `Thread.tsx` : **rendu comme message user local** — le message user visible vient de `onNew` → `setUserMessages`, PAS de cet event SSE. Correctement évité le double-affichage.

### Gaps
- [ ] Pas de double-affichage (heureusement), mais l'event est néanmoins persisté dans `state.events` et replayé dans l'historique. Le AuditTimelinePanel le montrera comme un event utilitaire.

### SEVERITÉ : 🟢 (comportement correct, filtrage explicite défensif)

---

## Event : `agent.tool_call`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 751-759. Émis pour chaque block `tool_use` dans un frame `assistant`.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **OUI**, lignes 107-116.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 242-246 : incrémente `toolCalls` de l'agent.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, case `agent.tool_call` ligne 171-183 : pousse un message `role:'assistant'` avec `content:[{type:'tool-call', toolCallId, toolName, args}]`.
- `Thread.tsx` : **OUI** — `MessagePrimitive.Parts` rend le type `tool-call` via `ToolFallback` (composant par défaut). Aucun composant custom enrichi (pas de rendu des args JSON structuré, juste un fallback générique).

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé? | Aligné? |
|-------|--------------|------------|-----------|---------|
| tool_use_id | oui | oui | oui (toolCallId) | 🟢 |
| tool | oui | oui | oui (toolName fallback tool_label) | 🟢 |
| tool_label | oui | oui | oui (toolName fallback) | 🟢 |
| input | oui | non (args manquants?) | oui (args) | 🟡 |
| agent_id | oui | oui | non (metadata) | 🟡 |

### Gaps
- [ ] **ToolFallback générique** : l'orchestrator n'émet pas `input` (la signature Python met juste `tool` sans `input`). Le frontend tente de lire `rd.input`, trouve undefined, fallback `{}`. Pas d'arguments visibles pour les tool calls orchestrateur.
- [ ] `metadata.custom.agentId` non stamppé — le tool call ne sait pas quelle persona l'a émis dans le thread (même si le toolName peut l'impliquer).

### SEVERITÉ : 🟡

---

## Event : `agent.tool_result`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 795-801 (`case 'user': subtype 'tool_result'`).
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **OUI**, lignes 117-126.

### Consommé par frontend
- `use-engagement-stream.ts` : **NON** — **pas de case dans le reducer** (applyEvent switch). L'event est ajouté à `state.events` mais n'affecte aucun état dérivé (agents, findings, etc.).
- `bjhunt-runtime.ts processNewEvents` : **OUI, mais silencieux** — filtré par `continue` ligne 164-167. Aucun message thread produit.
- `Thread.tsx` : **NON** — pas dans le thread. L'opérateur ne voit pas le résultat d'un tool call individuel. Seul le tool_call (carte) est visible, sans son résultat.

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé reducer? | Consommé thread? | Aligné? |
|-------|--------------|------------|-------------------|------------------|---------|
| tool_use_id | oui | oui | non | non | 🟡 |
| ok | oui | oui | non | non | 🟡 |
| summary | oui | oui | non | non | 🟡 |
| agent_id | oui | oui | non | non | 🟡 |

### Gaps
- [ ] **Résultat d'outil totalement invisible** : l'opérateur voit la carte "Exécution shell" mais jamais le stdout/stderr associé. Le panel "Outils" (ToolCapabilitiesPanel) ne semble pas consommer ces events pour un rendu détaillé.

### SEVERITÉ : 🔴

---

## Event : `agent.finding`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 728-734 : extrait des blocs fenced `bjhunt-finding` du texte assistant.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **OUI**, lignes 71-80.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 248-273 : crée `FindingEntry` (title, severity, cvss, asset, etc.).
- `bjhunt-runtime.ts processNewEvents` : **OUI**, ligne 184-192 : pousse un message `role:'assistant'` texte "**Finding** : {title}" avec `metadata.custom.kind='finding'`.
- `Thread.tsx` : **PARTIEL** — le thread ne montre qu'un **placeholder textuel** statique. Pas de composant custom `FindingPart` dans `MessagePrimitive.Parts`. Cependant, le `FindingsPanel` (panneau droit) rend la liste complète avec severité, CVSS, asset, etc.

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé reducer? | Consommé thread? | Aligné? |
|-------|--------------|------------|-------------------|------------------|---------|
| finding_id | oui | oui | oui | oui (id msg) | 🟢 |
| title | oui | oui | oui | oui (texte) | 🟢 |
| severity | oui (objet OU string) | oui | oui (logique bandFromCvss) | non | 🟢 |
| cvss_v4_score | oui | oui | oui (reducer) | non | 🟢 |
| asset | oui | oui | oui (reducer) | non | 🟢 |
| remediation | oui | oui | oui (reducer) | non | 🟢 |
| category | oui | oui | oui (reducer) | non | 🟢 |
| compliance_mappings | oui | oui | oui (reducer) | non | 🟢 |

### Gaps
- [ ] **Placeholder insuffisant en thread** : "**Finding** : XSS" n'est pas cliquable, ne déplie pas les détails. L'audit UX des concurrents (Claude Code, etc.) montre des cards enrichies. Le panel droit compense partiellement mais demande un changement de focus visuel.
- [ ] `evidence_ids` émis par engine mais jamais consommé (lien finding→evidence manquant dans la UI).

### SEVERITÉ : 🟡

---

## Event : `agent.canvas`
### Émis par
- **Backend (engine-process.ts)** : **NON** — aucun `emitEvent('agent.canvas', ...)` dans `translateAndEmit`. Les mises à jour canvas arrivent probablement via le relay socket (scope-guard / hooks).
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **NON**.
- **Orchestrator (main.py)** : **NON**.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 310-323 : maintient `state.canvas` (snapshot, révision, dédoublonnage par révision).
- `bjhunt-runtime.ts processNewEvents` : **OUI, mais silencieux** — filtré par `continue` ligne 164-167. Aucun message thread.
- `Thread.tsx` : **NON** dans le thread. Rendu dans le `CanvasPanel` (panneau droit) via `stream.canvas`.

### Gaps
- [ ] Le backend principal (engine-process.ts translateAndEmit) n'émet **jamais** `agent.canvas`. Si le relay socket ne l'émet pas non plus, l'event ne passe que par des chemins indirects (command palette `/report` ? non). Le panel Canvas risque de rester vide en mode legacy.

### SEVERITÉ : 🟡

---

## Event : `secret.redacted`
### Émis par
- **Backend (engine-process.ts)** : **NON** — jamais émis dans `translateAndEmit`. Le hook `redact-secrets` émet probablement via relay-socket.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator** : **NON**.

### Consommé par frontend
- `use-engagement-stream.ts` : **NON** — **pas de case dans le reducer**. Event ajouté à `state.events` sans transformation.
- `bjhunt-runtime.ts processNewEvents` : **OUI, mais silencieux** — filtré par `continue` ligne 164-167.
- `Thread.tsx` : **NON**.

### Gaps
- [ ] Event orphelin : peut être émis par les hooks côté backend mais jamais montré à l'opérateur. L'opérateur ne sait pas qu'une réduction de secret a eu lieu (confiance/NDA).

### SEVERITÉ : 🟡

---

## Event : `evidence.captured`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 737-743 : extrait des blocs fenced `bjhunt-evidence` du texte assistant.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **OUI**, lignes 81-91.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 282-291 : crée `EvidenceEntry`.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, ligne 193-201 : pousse message texte "**Evidence** : {sha256}" avec `metadata.custom.kind='evidence'`.
- `Thread.tsx` : **PARTIEL** — placeholder textuel uniquement. `EvidencePanel` (panneau droit) rend la liste structurée.

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé? | Aligné? |
|-------|--------------|------------|-----------|---------|
| evidence_id | oui | oui | oui | 🟢 |
| kind | oui | oui | oui (type) | 🟢 |
| sha256 | oui | oui | oui | 🟢 |
| size_bytes | oui | oui | oui (bytes) | 🟢 |
| redacted | oui | oui | oui (redactionsApplied) | 🟢 |

### Gaps
- [ ] Même constat que `agent.finding` : le thread ne montre qu'un placeholder. Le sha256 tronqué à 16 caractères n'est pas cliquable, ne télécharge pas le fichier.

### SEVERITÉ : 🟡

---

## Event : `dream.diary_entry`
### Émis par
- **Backend (engine-process.ts)** : **NON** — aucune émission dans `translateAndEmit`.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **NON**.
- **Orchestrator (main.py)** : **NON**.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 274-281 : crée `DreamEntry`.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, ligne 202-210 : pousse message texte "**Dream** : {title}".
- `Thread.tsx` : **OUI** (placeholder) + `DreamDiaryPanel` (panneau droit).

### Gaps
- [ ] **Event jamais émis par aucun backend/orchestrator**. La feature est 100 % UI-ready mais 0 % backend-ready. Le prompt `dream-keeper.md` mentionne `dream.diary_entry` mais il n'y a pas de pipeline de génération ni d'extraction côté serveur.

### SEVERITÉ : 🔴

---

## Event : `agent.completed`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, ligne 819-824 : émis pour chaque agent vu dans `entry.seenAgents` à la réception d'un frame `result`.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (events.py)** : **OUI**, lignes 141-148 (phase == 'report').
- **Orchestrator (main.py)** : **pass-through**.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 292-297 : met à jour `status:'completed'` et `finishedAt` de l'agent.
- `bjhunt-runtime.ts processNewEvents` : **OUI, mais silencieux** — filtré par `continue` ligne 164-167. Aucun message thread.
- `Thread.tsx` : **NON** directement. L'état de l'agent est visible dans `AgentsActivePanel` (panneau droit) et `AuditTimelinePanel`.

### Gaps
- [ ] L'opérateur ne voit pas dans le thread quand un agent termine son travail. Seul le panneau latéral indique le statut.

### SEVERITÉ : 🟢 (acceptable, le thread est pour le contenu, le statut est pour le panneau)

---

## Event : `run.completed`
### Émis par
- **Backend (engine-process.ts)** : **OUI**, lignes 477-482 : émis dans le handler `child.on('exit')` de l'engine. Outcome mappé : `SIGTERM/SIGINT → 'aborted'`, `code≠0 → 'failed'`, `!sawAnyOutput → 'idle'`, sinon `'completed'`.
- **Backend (orchestrator-client.ts)** : **pass-through uniquement** — `_dispatchEvent` ne génère pas de `run.completed` s'il n'est pas reçu de l'orchestrator.
- **Orchestrator (events.py)** : **OUI**, lignes 130-138 (phase == 'stopped').
- **Orchestrator (main.py)** : **OUI**, ligne 182 (finally) : **toujours** `outcome:'completed'` indépendamment de la raison d'arrêt.

- **Backend routes (chats.ts)** : **NON** — commentaire ligne 221 impose de ne PAS émettre ici. Respecté.
- **Exception** : commande `/report` (ligne 515-524) émet `run.completed` avec `outcome:'partial'` et `report_refs`. C'est un usage détourné ; le frontend le traite comme un run terminé (`runEndedAt` est setté).

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 298-302 : met `runEndedAt`, `runOutcome`, `reportRefs`.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, ligne 228-235 : pousse message system "--- Audit terminé ({outcome}) ---".
- `Thread.tsx` : rendu comme message system.

### Shape des data
| Champ | Émis engine? | Émis orch? | Consommé? | Aligné? |
|-------|--------------|------------|-----------|---------|
| outcome | oui | oui (parfois 'completed' forcé) | oui | 🟡 |
| report_refs | oui (commande /report) | non | oui | 🟢 |
| usage | oui (frame.result) | non | non | 🔴 |
| duration_ms | oui | non | non | 🔴 |

### Gaps
- [ ] **Orchestrator always emits outcome:completed** — même sur stop. Le backend `_dispatchEvent` relaie tel quel. Le frontend croit que l'audit s'est terminé normalement alors qu'il a été tué.
- [ ] **`usage` et `duration_ms` ignorés** par le reducer / runtime. Le coût et les stats de tokens ne sont pas mis à jour via SSE.

### SEVERITÉ : 🔴

---

## Event : `error.scope_violation`
### Émis par
- **Backend (engine-process.ts)** : **NON** — pas dans `translateAndEmit`. Émis par le hook `scope-guard.cjs` via relay-socket.
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator** : **NON**.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, reducer case ligne 303-309 : ajoute à `scopeViolations[]`.
- `bjhunt-runtime.ts processNewEvents` : **OUI**, ligne 211-219 : pousse message texte "⛔ Scope violation : {blocked_target}".
- `Thread.tsx` : **PARTIEL** — message texte visible dans le thread MAIS le composant `ScopeGuardBanner` (ligne 248) affiche aussi les violations de manière sticky au-dessus du thread. Double signal (correct).

### Shape des data
| Champ | Émis hook? | Consommé reducer? | Consommé thread? | Aligné? |
|-------|------------|-------------------|------------------|---------|
| blocked_target | oui | oui | oui | 🟢 |
| reason | oui | oui | non (texte fixe) | 🟡 |
| tool_call_id | oui (doc) | non | non | N/A |

### Gaps
- [ ] Aucun — le rendu est cohérent entre le thread et la bannière sticky.

### SEVERITÉ : 🟢

---

## Event : `error.runtime`
### Émis par
- **Backend (engine-process.ts)** : **NON** — pas dans `translateAndEmit`.
- **Backend (sse.ts)** : **OUI**, ligne 206 : émis dans le `catch` du producer SSE si le stream crash (`kind:'sse_producer', message`).
- **Backend (orchestrator-client.ts)** : **pass-through**.
- **Orchestrator (main.py)** : **OUI**, lignes 158, 179 : émis si run not found ou exception dans astream.

### Consommé par frontend
- `use-engagement-stream.ts` : **OUI**, TYPED_EVENTS ligne 27, listener ligne 428. Reducer : **NON** — **pas de case dans `applyEvent`**. L'event est ajouté à `events[]` mais ne sette pas `errorMessage` ni ne change le state.
- `bjhunt-runtime.ts processNewEvents` : **NON** — n'est ni dans le `if` de filtrage ni dans le `switch`. **Silencieusement ignoré**. Aucun message thread.
- `Thread.tsx` : **NON** dans le thread.
- **Exception** : `page.tsx` (chatId page) lignes 327-334 : écoute `error.runtime` et pousse une **notification desktop** (`pushNotification`). L'opérateur voit une toast/notification mais PAS de bulle dans le chat.

### Gaps
- [ ] **Aucun rendu thread** : l'opérateur reçoit une notif "Erreur runtime" mais le thread continue comme si de rien n'était. Le statut SSE passe à `error` uniquement si la connexion physique rompt (es.onerror), pas à cause de cet event.
- [ ] Le reducer ne stocke pas `errorMessage` sur `error.runtime` (contrairement à `error.scope_violation`).

### SEVERITÉ : 🔴

---

## Points d'audit spécifiques détaillés

### 1. agent.thinking role=user — Double affichage ou absence ?
**VERDICT : CORRECT (filtre défensif)**
- Backend émet bien `agent.thinking{role:'user'}` dans `sendMessage()` (engine-process.ts:558, orchestrator-client.ts:228).
- Frontend `bjhunt-runtime.ts` ligne 136 : `if (rd.role === 'user') continue`. L'event est **explicitement jeté** avant la construction du thread.
- Le message user visible dans le thread provient de la mutation locale `setUserMessages` dans `onNew` (ligne 350).
- **Pas de double-affichage**. L'event SSE user est toutefois présent dans `stream.events` et apparaît dans l'`AuditTimelinePanel`.
- **Risque résiduel** : si `onNew` échoue (API down), le message user est quand même dans `userMessages` (optimiste), mais persiste uniquement en mémoire. L'historique Postgres ne le récupère que via `messages` table, pas via `stream_events`. C'est un autre sujet (Wave 4 messages canonical).

### 2. run.started dual-write
**VERDICT : RÉGRESSION CONFIRMÉE (mode legacy uniquement)**
- **Source 1** : `system/init` frame → `run.started` (engine-process.ts:674). Émis une fois au spawn.
- **Source 2** : `sendMessage()` → `run.started` (engine-process.ts:553). Émis à **chaque** tour utilisateur, y compris le premier.
- Donc turn 1 = 2 events `run.started` avec ULIDs différents. Pas de dédup côté backend (les ULIDs sont uniques).
- Frontend reducer : each `run.started` reset `runEndedAt`/`runOutcome` (ligne 219-221). Sur un replay Postgres, cela efface l'état terminal précédent.
- Frontend `processNewEvents` : chaque event pousse un message system "--- Audit démarré ---". **Bruit visuel**.
- **Mode orchestrateur** : une seule source (`main.py:165`), donc pas de dual-write. Correct.

### 3. Events morts — agent.progress / agent.handoff
**VERDICT : MORTS MAIS DES RÉFÉRENCES FANTÔMES RESTENT**
- Supprimés de `TYPED_EVENTS` (sse.ts). N'apparaissent pas dans le frontend reducer.
- **Références fantômes** :
  - `bjhunt-app/components/chat/audit-timeline-panel.tsx` (ligne 38) : `'agent.handoff'` dans la liste des types affichés.
  - `bjhunt-app/components/chat/agents-active-panel.tsx` (ligne 86) : logique `ev.type === 'agent.progress'`.
  - `bjhunt-backend/src/lib/relay-socket.ts` (ligne 53-54) : liste d'events relayés inclus `agent.progress`, `agent.handoff`.
  - `bjhunt-engine/bjhunt/STREAMING_EVENTS.md` : document legacy mentionne les deux.
  - Orchestrator `personas/*.md` (6 fichiers) : référencent `agent.handoff` comme convention d'architecture.
- **Risque** : le `agents-active-panel.tsx` essaie de lire `agent.progress` sur des events qui n'arrivent jamais → code mort dormant.

### 4. Finding / Evidence rendering — Thread vs Panel
**VERDICT : PANEL RICHE, THREAD PAUVRE**
- **Thread** : messages texte statiques "**Finding** : {title}" et "**Evidence** : {sha16}". Pas interactifs, pas cliquables, pas de détail.
- **Panel droit** : `FindingsPanel` et `EvidencePanel` montrent la data structurée complète (severity band, CVSS, asset, sha256, taille).
- **Problème UX** : l'opérateur doit basculer de contexte visuel (thread → panel) pour comprendre la gravité d'un finding. Les concurrents (Claude, ChatGPT) intègrent des cards enrichies directement dans le thread.
- **Note** : les events portent `metadata.custom.kind` qui pourrait alimenter un composant custom `assistant-ui` de type `FindingPart`, mais la map `components` dans `MessagePrimitive.Parts` ne le définit pas (`Text`, `Reasoning`, `Source`, `tools` seulement).

### 5. Dream diary — Émission & Rendu
**VERDICT : UI PRÊTE, BACKEND ABSENT**
- Frontend 100 % câblé : reducer, processNewEvents, DreamDiaryPanel, message thread placeholder.
- Backend `engine-process.ts` : **aucune extraction** de dream diary (pas de regex `bjhunt-dream` ni équivalent).
- Orchestrator `events.py` : **pas de case** dream diary.
- Prompt `dream-keeper.md` mentionne l'event mais il n'existe pas de mécanisme de génération côté serveur.
- **Impact** : l'opérateur voit un onglet "Journal" vide ; c'est une feature fantôme.

### 6. Queue system — Frontend queue vs Backend BJHUNT_QUEUE
**VERDICT : DEUX CONCEPTS NON ALIGNÉS**
- **Frontend** :
  - `useExternalStoreRuntime({ queue: true })` (ligne 416) : active l'indicateur "file d'attente" natif d'assistant-ui dans le composer.
  - `queueRef` manuel (ligne 313) : buffer en mémoire des messages tapés pendant `isRunning`. Flushé sur `runEndedAt` change (useEffect ligne 317-335).
- **Backend** :
  - `BJHUNT_AGENTS_ENABLED` passé en env (chats.ts lignes 197, 235, etc.) : contrôle les agents du sandbox. Pas de "queue".
  - Aucune variable `BJHUNT_QUEUE`. Aucun endpoint `/queue`. Le backend ne sait pas qu'un message est "en file".
- **Risque** : si l'opérateur recharge la page alors qu'un message est dans `queueRef`, le message est **perdu** (buffer mémoire uniquement). Le `queue: true` d'assistant-ui ne persiste rien.

### 7. HITL / interrupts — Events & UI d'approbation
**VERDICT : BACKEND ORCHESTRATOR PRÊT, FRONTEND INEXISTANT**
- Orchestrator `main.py` :
  - `interrupt_before=HITL_CONFIG.get("interrupt_before", [])` (ligne 66) : pause avant certains nœuds (ex: exploit).
  - POST `/runs/{id}/resume` (ligne 99-111) : reprise avec `approved_actions`.
- **Events émis pendant l'interrupt** : aucun event SSE spécifique de type "hitl.waiting" ou "interrupt" n'est défini dans TYPED_EVENTS. Le stream SSE reste ouvert mais ne yield rien jusqu'à reprise.
- **Frontend** :
  - Aucun composant d'approbation (pas de modal "Autoriser l'action suivante ?").
  - Aucun appel à `api.submitToolResult()` en réponse à un interrupt (l'endpoint existe en stub 404/405, ligne 95-114 `api.ts`).
  - Les tool calls sont rendus comme cartes statiques ; pas de bouton "Approve / Refuse".
- **Conclusion** : le pipeline HITLLangGraph existe côté orchestrateur mais l'opérateur n'a aucun moyen d'interagir avec.

### 8. Kill switch cascade — stopChat() → run.completed{aborted}
**VERDICT : CASSE EN MODE ORCHESTRATEUR**
- **Frontend** : `api.stopChat()` → `POST /api/chats/:id/stop`.
- **Backend legacy** : `killEngine` → SIGTERM → exit handler émet `run.completed{outcome:'aborted'}`. Le frontend le reçoit et met `isRunning=false`. Correct.
- **Backend orchestrateur** :
  1. `orchestrator-client.ts killEngine` (ligne 245-261) : appelle `entry.abortCtrl.abort()` + POST orchestrateur `/stop`.
  2. Le backend ferme **immédiatement** le consumer SSE (`_consumeSse` détecte `AbortError` et break).
  3. Le backend met à jour le statut DB à `'idle'` (ligne 163-168) mais **n'appelle PAS `writeEvent('run.completed', ...)`**.
  4. L'orchestrateur `main.py` `_event_stream` finally yield `run.completed{outcome:'completed'}` — mais comme le consumer SSE est mort, cet event n'est **jamais** écrit dans Redis/Postgres.
- **Résultat** : le frontend reçoit une déconnexion SSE brutale, passe en `reconnecting`, ne voit jamais `run.completed`. `isRunning` reste `true` (car `runStartedAt` set, `runEndedAt` jamais set).
- **Conséquences** :
  - Le bouton Cancel ne disparaît jamais.
  - Le `queueRef` ne flush jamais.
  - La pill de statut reste "Démarrage du sandbox…".
  - Le `ChatStatusBanner` ne se met pas à jour.

---

## Tableau récapitulatif d'alignement

| # | Event | Émis Back | Émis Orch | Réduit Front | Thread Front | Panel Front | Statut |
|---|-------|-----------|-----------|--------------|--------------|-------------|--------|
| 1 | run.started | OUI (×2 legacy) | OUI | OUI | OUI (system) | AuditTimeline | 🟡 dual-write |
| 2 | agent.started | OUI | OUI | OUI (agents Map) | **NON** (continue) | AgentsActive | 🔴 badge mort |
| 3 | agent.thinking (assistant) | OUI | OUI | OUI | OUI (texte) | — | 🟢 |
| 4 | agent.thinking (user) | OUI | OUI | NO-OP | **NON** (continue) | — | 🟢 filtré OK |
| 5 | agent.tool_call | OUI | OUI | OUI (compteur) | OUI (tool-call) | — | 🟡 fallback générique |
| 6 | agent.tool_result | OUI | OUI | **NON** | **NON** (continue) | — | 🔴 invisible |
| 7 | agent.finding | OUI | OUI | OUI | placeholder | FindingsPanel | 🟡 panel OK, thread pauvre |
| 8 | agent.canvas | NON (relay?) | NON | OUI | **NON** (continue) | CanvasPanel | 🟡 backend incertain |
| 9 | secret.redacted | NON (relay?) | NON | **NON** | **NON** (continue) | — | 🟡 orphelin |
| 10 | evidence.captured | OUI | OUI | OUI | placeholder | EvidencePanel | 🟡 panel OK, thread pauvre |
| 11 | dream.diary_entry | **NON** | **NON** | OUI | placeholder | DreamDiaryPanel | 🔴 jamais émis |
| 12 | agent.completed | OUI | OUI | OUI | **NON** (continue) | AgentsActive | 🟢 |
| 13 | run.completed | OUI | OUI (bug complété) | OUI | OUI (system) | — | 🔴 orch force completed |
| 14 | error.scope_violation | NON (relay) | NON | OUI | OUI (texte) | ScopeGuardBanner | 🟢 |
| 15 | error.runtime | OUI (sse.ts) | OUI | **NON** | **NON** | Notification toast | 🔴 thread silencieux |

---

## Recommandations de priorisation

### P0 — Bloquant pour production
1. **Ajouter `error.runtime` au `switch` de `processNewEvents`** : pousse un message system/assistant avec le detail d'erreur.
2. **Corréler `agent.started` avec les messages assistant** : stamper `metadata.custom.agentId` et `agentType` sur `agent.thinking` et `agent.tool_call` dans `processNewEvents` pour réactiver `AgentBadge`.
3. **Implémenter `agent.canvas` dans `translateAndEmit`** ou documenter le chemin relay comme seule source valide.
4. **Corriger orchestrateur `killEngine` cascade** : garantir l'émission de `run.completed{outcome:'aborted'}` écrite dans Redis/Postgres AVANT de fermer le consumer SSE. Ou bien faire que `_consumeSse` persiste un event terminal à la destruction.
5. **Corriger orchestrateur `_event_stream` finally** : lire le `phase` courant avant d'émettre `run.completed` pour envoyer `outcome:'aborted'` si `phase === 'stopped'`.

### P1 — Forte dégradation UX
6. **Rendre `agent.tool_result` visible** : soit dans le thread (message assistant avec résumé), soit dans un panel "Tool Results" dédié.
7. **Rendre `secret.redacted` visible** : message system discret "[contenu réduit pour confidentialité]".
8. **Retirer ou implémenter `dream.diary_entry`** : si non prioritaire, retirer l'onglet Journal et le code reducer pour ne pas tromper l'opérateur.
9. **Dédupliquer `run.started` legacy** : supprimer l'émission depuis `sendMessage()` (ligne 553) — `system/init` est suffisant. S'assurer que le multi-turn reste fonctionnel (turn N démarre un nouveau `run.started` synthétisé uniquement si l'engine a été respawné).

### P2 — Polish & dette technique
10. **Nettoyer les références fantômes** `agent.progress` / `agent.handoff` dans `audit-timeline-panel.tsx`, `agents-active-panel.tsx`, `relay-socket.ts`, et les prompts orchestrateur.
11. **Enrichir les placeholders thread** : ajouter des composants custom `FindingPart`, `EvidencePart`, `DreamPart` dans `MessagePrimitive.Parts` pour un rendu inline cards (sans dépendre du panel droit).
12. **Alimenter le token-store** depuis l'event `agent.thinking` avec `usage` (reducer ligne 769 engine-process) pour éviter le fetch séparé du `CostMeter`.

---

**FIN DU RAPPORT**
