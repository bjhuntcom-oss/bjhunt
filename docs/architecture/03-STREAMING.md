# 03 — Streaming live (SSE)

> Comment l'utilisateur reçoit en temps réel les tokens, tool calls, findings, transitions d'agents pendant un audit.

## Choix transport : SSE typé

**Décidé** : Server-Sent Events (HTTP/1.1 + HTTP/2 multiplex), avec event types nommés.

| Transport | Statut | Raison |
|---|---|---|
| **SSE** | ✅ Choisi | Standard 2026 (OpenAI Responses API, Anthropic Messages API, Vercel AI SDK 5, openclaude). Auto-reconnect natif via `Last-Event-ID`. Passe tous proxies/CDN. Compatible HTTP/2 multiplex. |
| WebSocket | ❌ | Bidi pas nécessaire (POST séparé pour user message). Pas de reconnect natif. Sticky session lourde. |
| gRPC-web | ❌ | Overhead schema proto pour texte. Pas d'EventSource natif. |
| HTTP/2 push | ❌ | Deprecated Chrome 2022. |
| HTTP/3 + WebTransport | ⏳ | Browsers partiel. À surveiller pour 2027. |

## Format wire

```
id: <run_id>:<seq>
event: <type>
data: <json_payload>

```

Le client utilise `addEventListener('<type>', handler)` pour router les events vers le bon renderer UI.

## Schéma 12 event types

| Event | Payload | Émis par | UI render |
|---|---|---|---|
| `token` | `{agent, content, contentBlock?}` | LLM streaming | Append tokens à la bulle assistant courante |
| `tool_call` | `{agent, toolName, toolId, input}` | Orchestrator | Card collapsée "▶ nmap -sV target.com" |
| `tool_result` | `{toolId, output, exitCode, durationMs}` | Sandbox | Expand card → output |
| `thinking` | `{agent, content}` | LLM thinking blocks | Italic gris, collapsable |
| `subagent_start` | `{agent, parentAgent, objective}` | Orchestrator | Nouvelle card avec icône agent + objectif |
| `subagent_end` | `{agent, summary, findings?}` | Orchestrator | Marque card "done" |
| `objective_update` | `{phase, status, progress}` | Orchestrator | Progress bar phases |
| `graph_update` | `{nodes[], edges[]}` | Knowledge graph | Mise à jour panel attack graph |
| `finding` | `{id, severity, title, evidence, cve?, remediation}` | Analyzer | Finding card épinglable (export PDF) |
| `interrupt` | `{reason, requiredAction, options[]}` | Orchestrator | Modal "approbation requise" |
| `error` | `{code, message, fatal}` | Tout composant | Toast rouge + log |
| `done` | `{runId, summary, totalFindings, durationMs}` | Orchestrator | Audit terminé, scroll au rapport |
| `ping` | `{}` | Backend (15s) | Aucun (keepalive) |

## Auth — JWT ticket court

`EventSource` natif ne permet pas de custom headers — pas d'`Authorization: Bearer`.

**Pattern** : signed JWT ticket (5 min TTL) sur l'URL.

### Flow
```
1. Client (cookie HttpOnly auth)
       │ POST /api/chat/prepare
       │ Body: {message, engagementId}
       ▼
   Backend
       │ verify session, create run_id
       │ JWT.sign({org_id, run_id, exp: now+300}, JWT_SIGNING_KEY)
       ▼
   Réponse: {runId, ticket}

2. Client
       │ GET /api/chat/stream/{runId}?ticket=<jwt>&cursor=<lastEventId>
       │ Header: Last-Event-ID: <seq>  (auto par EventSource)
       ▼
   Backend (Edge)
       │ verify JWT (signature + exp)
       │ extract org_id (NEVER trust URL)
       │ withOrg(org_id, () => streamSSE(...))
       ▼
   Stream SSE
```

**Pourquoi pas cookie + EventSource** :
- Cross-subdomain (`api.bjhunt.com` ⇄ `bjhunt.com`) = friction CORS
- Cookies SameSite Chrome change en 2025-2026 = fragile
- JWT ticket = stateless, rotation courte, tenant-safe

## Persistence + replay

Audits BJHUNT durent 5–30 min. Une déconnexion réseau ne doit pas perdre l'audit.

### Double persistence
À chaque event SSE émis, le backend écrit en parallèle :

1. **Redis Streams** (live tail + cursor)
   ```
   XADD stream:{org_id}:{run_id} * type <type> data <json>
   ```
   TTL 7 jours (`XADD ... MAXLEN ~ 100000`).

2. **Postgres `stream_events`** (mirror durable, RLS-scoped)
   ```sql
   CREATE TABLE stream_events (
     id BIGSERIAL PRIMARY KEY,
     org_id UUID NOT NULL,
     run_id TEXT NOT NULL,
     seq INT NOT NULL,
     event_type TEXT NOT NULL,
     payload JSONB NOT NULL,
     ts TIMESTAMPTZ DEFAULT now(),
     UNIQUE (run_id, seq)
   );
   ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;
   ALTER TABLE stream_events FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON stream_events
     USING (org_id = current_setting('app.current_org_id')::uuid)
     WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);
   GRANT SELECT, INSERT ON stream_events TO bjhunt_app;
   ```

### Reconnect côté client

```ts
// Frontend : EventSource natif gère Last-Event-ID
const es = new EventSource(`/api/chat/stream/${runId}?ticket=${ticket}`)
// Au reconnect, le navigateur envoie automatiquement Last-Event-ID: <seq>
```

Le client peut aussi explicitement passer `?cursor=<seq>` pour des reprises non-EventSource (mobile webview qui buffer mal, etc.).

### Backend — replay puis live tail

```ts
// Pseudocode Hono
app.get('/api/chat/stream/:runId', async (c) => {
  const ticket = c.req.query('ticket')
  const cursor = c.req.header('Last-Event-ID') ?? c.req.query('cursor') ?? '0-0'
  const { org_id, run_id } = verifyTicket(ticket)

  return streamSSE(c, async (stream) => {
    await withOrg(org_id, async () => {
      // 1. Replay events ratés depuis cursor
      const past = await redis.xrange(`stream:${org_id}:${run_id}`, cursor, '+')
      for (const [id, fields] of past) {
        await stream.writeSSE({ id, event: fields.type, data: fields.data })
      }

      // 2. Live tail
      let lastId = past.length ? past[past.length - 1][0] : cursor
      const heartbeat = setInterval(() => {
        stream.writeSSE({ event: 'ping', data: '{}' }).catch(() => {})
      }, 15_000)

      try {
        while (!c.req.raw.signal.aborted) {
          const result = await redis.xread('BLOCK', 30_000, 'STREAMS',
            `stream:${org_id}:${run_id}`, lastId)
          if (!result) continue
          for (const [, entries] of result) {
            for (const [id, fields] of entries) {
              await stream.writeSSE({ id, event: fields.type, data: fields.data })
              lastId = id
              if (fields.type === 'done') return
            }
          }
        }
      } finally {
        clearInterval(heartbeat)
      }
    })
  })
})
```

## Backpressure et cancellation

### Frontend
```ts
const ctl = new AbortController()
const es = new EventSource(`/api/chat/stream/${runId}?ticket=${ticket}`)
ctl.signal.addEventListener('abort', () => es.close())

// Tab close / unload
window.addEventListener('beforeunload', () => ctl.abort())
```

### Backend → Orchestrator
- `c.req.raw.signal.aborted` détecté en sortie de boucle while
- Avant de sortir : `redis.publish('cancel:{org_id}:{run_id}', '1')`
- L'orchestrator écoute ce channel : `await runCancelToken.cancel()` → kill agent loop → `e2b.kill(sandboxId)`

### Heartbeat 15 s
Sans heartbeat :
- Cloudflare ferme idle conn ~100 s
- Reverse proxies tuent les SSE silencieusement
- Front pense que le serveur est mort

`event: ping` toutes les 15 s = négligeable (~30 octets) et garde la conn vivante.

## Multi-tenant isolation

| Mécanisme | Niveau | Description |
|---|---|---|
| **Channel naming** | Application | `stream:{org_id}:{run_id}` — JAMAIS de glob `*` |
| **JWT verify** | Edge | `org_id` extrait du ticket signé, jamais du path |
| **Postgres RLS FORCE** | DB | `stream_events` table FORCE RLS scoped par `org_id` |
| **Redis ACL** | Cache | Le runtime n'a accès qu'à `XADD/XREAD/XRANGE/PUBLISH/SUBSCRIBE` (pas `FLUSHALL`, `KEYS *`) |
| **Cancel channel séparé** | Application | `cancel:{org_id}:{run_id}` — JAMAIS `cancel:{run_id}` global |

## Tests d'isolation à implémenter

- [ ] Tenant A demande stream de `run_id` du tenant B → 404 (pas 403, pour ne pas leak existence)
- [ ] Tenant A reçoit ticket valide pour son `run_id`, modifie URL pour pointer `run_id` tenant B → 404 (vérification `org_id` dans table `runs` avant subscribe)
- [ ] Crash backend à mi-stream → redémarrage → client reconnecte → reçoit events manqués via cursor
- [ ] Tab fermé pendant audit → cancel channel publish → orchestrator stoppe → sandbox killed (vérifier via E2B logs absence sandbox actif après 30 s)

## Checklist P0 du rebuild streaming

1. ✅ Décidé : SSE typé Hono streamSSE
2. ⏳ Implémenter `withOrg(orgId, fn)` Postgres RLS context
3. ⏳ Câbler Redis Streams XADD à chaque event émis par l'orchestrator
4. ⏳ Migration Postgres `stream_events` table + RLS policy + grants
5. ⏳ Endpoint `GET /api/chat/stream/:runId` honoring `Last-Event-ID`
6. ⏳ Heartbeat ping 15 s + `AbortSignal` end-to-end → cancel pub/sub
7. ⏳ JWT ticket sign/verify avec rotation 30j de la clé
