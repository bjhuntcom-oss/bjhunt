# 03 — Streaming live (SSE)

> Comment l'utilisateur reçoit les tokens, tool calls, findings, transitions d'agents en temps réel.

## Choix transport : SSE (et pourquoi pas WebSocket)

| Transport | Verdict | Raison |
|---|---|---|
| **Server-Sent Events** | ✅ **CHOIX** | Unidirectionnel server→client suffit (l'envoi de message user passe par POST). Auto-reconnect natif via `Last-Event-ID`. Passe tous les proxies/CDN. HTTP/2 multiplex (plus de limite 6 conns). Standard chez OpenAI / Anthropic / Vercel AI SDK / LangGraph. |
| WebSocket | ❌ Trop riche | Bidi pas nécessaire. Pas de reconnect natif. Sticky-session requise sur LB. Cloudflare/Vercel facturent différemment. |
| gRPC-web | ❌ Overhead | Schema proto non justifié pour texte. Pas d'EventSource natif. |
| HTTP/2 push | ❌ Mort | Chrome deprecated 2022. |
| HTTP/3 + WebTransport | ⏳ 2027 | Browsers partiel (Safari WIP fin 2025). À surveiller. |

## Choix format : Typed events SSE

```
id: <run_id>:<seq>
event: <type>
data: <json_payload>
```

Le client utilise `addEventListener('<type>', handler)` plutôt qu'un parseur unique → routing UI direct.

## Schéma événements (12 types)

| Event type | Payload | Émis par | UI render |
|---|---|---|---|
| `token` | `{agent, content, contentBlock?}` | LLM streaming | Append tokens à la bulle assistant courante |
| `tool_call` | `{agent, toolName, toolId, input}` | Orchestrator | Card collapsée "▶ nmap -sV target.com" |
| `tool_result` | `{toolId, output, exitCode, durationMs}` | Sandbox | Expand de la card → output |
| `thinking` | `{agent, content}` (non-final) | LLM thinking | Italic gris, collapsable |
| `subagent_start` | `{agent, parentAgent, objective}` | Orchestrator | Nouvelle card avec icône agent + objectif |
| `subagent_end` | `{agent, summary, findings?}` | Orchestrator | Marque la card "done" |
| `objective_update` | `{phase, status, progress}` | Orchestrator | Progress bar phases |
| `graph_update` | `{nodes[], edges[]}` | Knowledge graph | Mise à jour panel attack graph |
| `finding` | `{id, severity, title, evidence, cve?, remediation}` | Analyzer | Finding card épinglable (export PDF) |
| `interrupt` | `{reason, requiredAction, options[]}` | Orchestrator | Modal "approbation requise" |
| `error` | `{code, message, fatal}` | n'importe | Toast rouge + log |
| `done` | `{runId, summary, totalFindings, durationMs}` | Orchestrator | Audit terminé, scroll au rapport |
| `ping` | `{}` | Server (15s) | Aucun (keepalive proxies) |

### Exemple stream brut

```
id: run_abc123:1
event: subagent_start
data: {"agent":"BJHUNT","parentAgent":null,"objective":"Audit OWASP Top 10 sur exemple.com"}

id: run_abc123:2
event: thinking
data: {"agent":"BJHUNT","content":"Je vais d'abord déléguer la reconnaissance..."}

id: run_abc123:3
event: subagent_start
data: {"agent":"Recon","parentAgent":"BJHUNT","objective":"Énumérer surface d'attaque exemple.com"}

id: run_abc123:4
event: tool_call
data: {"agent":"Recon","toolName":"nmap","toolId":"t_001","input":"-sV -p 80,443 exemple.com"}

id: run_abc123:5
event: tool_result
data: {"toolId":"t_001","output":"80/tcp open  http  nginx 1.18\n443/tcp open  ssl/http nginx 1.18","exitCode":0,"durationMs":4321}

id: run_abc123:6
event: token
data: {"agent":"Recon","content":"Nginx 1.18 détecté"}

...

id: run_abc123:42
event: finding
data: {"id":"f_001","severity":"HIGH","title":"SQL Injection on /api/users?id=","evidence":"...","cve":null,"remediation":"Use prepared statements"}

id: run_abc123:99
event: done
data: {"runId":"run_abc123","summary":"...","totalFindings":7,"durationMs":1834000}
```

## Auth pour SSE

`EventSource` natif **ne permet pas** de custom headers → impossible d'envoyer `Authorization: Bearer`.

**Pattern adopté : signed JWT ticket** (5min TTL) sur l'URL :

1. Client `POST /api/chat/prepare` (cookie HttpOnly) → backend retourne `{runId, ticket}` où `ticket = JWT.sign({org_id, run_id, exp: now+300}, SECRET)`
2. Client `GET /api/chat/stream/{runId}?ticket=<jwt>&cursor=<lastEventId>` → backend verify le JWT, extrait `org_id`, configure le contexte RLS, ouvre le stream

Avantages :
- Pas de cookies cross-subdomain (CORS-friendly)
- Tenant isolation : `org_id` est dans le JWT, le backend ne fait JAMAIS confiance à l'URL
- Court : 5min TTL → un ticket volé périme vite
- Stateless : pas de table `tickets` à manager

## Resume / replay

Audits BJHUNT durent 5–30min. Une déconnexion réseau = perte d'audit ? **Non.**

### Persistence server-side
À chaque event SSE émis, le backend écrit en parallèle :
1. **Redis Streams** : `XADD stream:{org_id}:{run_id} * type <type> data <json>` (TTL 7j)
2. **Postgres `stream_events`** (RLS-scoped) : miroir durable pour replay long-terme

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
  USING (org_id = current_setting('app.current_org_id')::uuid);
```

### Reconnect côté client
- Frontend stocke `lastEventId` dans `localStorage` keyed par `run_id`
- À la reconnexion : `GET /api/chat/stream/{runId}?ticket=&cursor={lastEventId}`
- Backend `XRANGE stream:{org}:{run} ({cursor} +` puis bascule en live tail `XREAD BLOCK 0`

### Pseudo-code backend (Hono)

```ts
import { streamSSE } from 'hono/streaming'

app.get('/api/chat/stream/:runId', async (c) => {
  const ticket = c.req.query('ticket')
  const cursor = c.req.query('cursor') ?? '0-0'
  const { org_id, run_id } = verifyTicket(ticket)  // throws on bad ticket

  return streamSSE(c, async (stream) => {
    await withOrg(org_id, async () => {
      // 1. Replay from cursor
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
          const result = await redis.xread('BLOCK', 30_000, 'STREAMS', `stream:${org_id}:${run_id}`, lastId)
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

## Backpressure & cancellation

### Côté frontend
```ts
const ctl = new AbortController()
const es = new EventSource(`/api/chat/stream/${runId}?ticket=${ticket}`)
ctl.signal.addEventListener('abort', () => es.close())

// Tab close / page unload
window.addEventListener('beforeunload', () => ctl.abort())
```

### Côté backend
- `c.req.raw.signal.aborted` détecté → boucle `while` sort
- Avant de sortir : `redis.publish(\`cancel:${org_id}:${run_id}\`, '1')`
- L'orchestrator Python écoute ce channel : `LangGraph.cancel(thread_id)` → sandbox `docker kill`

### Heartbeat
Toutes les 15s, `event: ping` envoyé. Sans ça :
- Cloudflare ferme idle conn après 100s
- Vercel Edge fonctions timeout 60-300s (raison pour laquelle SSE long est servi par le **backend Fly.io**, pas Vercel)
- Reverse proxy Caddy default `proxy_read_timeout 60s`

## Multi-tenant isolation des streams

| Mécanisme | Niveau | Description |
|---|---|---|
| Channel naming | Application | `stream:{org_id}:{run_id}` — JAMAIS de glob `*` |
| JWT verify | Edge | `org_id` extrait du ticket, jamais du path |
| Postgres RLS | DB | `stream_events` table FORCE RLS scoped par `org_id` |
| Redis ACL | Cache | Ne PAS donner full Redis ACL au runtime — limiter à `XADD/XREAD/XRANGE/PUBLISH/SUBSCRIBE` |
| Cancel channel séparé | Application | `cancel:{org_id}:{run_id}` — JAMAIS `cancel:{run_id}` global |

## Tests d'isolation à écrire

- [ ] Tenant A demande stream de `run_id` du tenant B → 404 (pas 403, pour ne pas leak existence)
- [ ] Tenant A reçoit ticket valide pour son `run_id`, modifie URL pour `run_id` tenant B → 404 (verify check `org_id` dans `runs` table)
- [ ] Crash backend à mi-stream → redémarrage → client reconnecte → reçoit events manqués via cursor

## Action items P0 du rebuild

1. Implémenter `withOrg(orgId, fn)` Postgres RLS context (déjà existait dans le legacy — réimplémenter)
2. Câbler Redis Streams XADD à chaque event émis par l'orchestrator
3. Persist miroir Postgres `stream_events` (table + RLS policy)
4. Endpoint `GET /api/chat/stream/:runId/replay?cursor=` + `Last-Event-ID` honored
5. Heartbeat ping 15s + `AbortSignal` end-to-end
