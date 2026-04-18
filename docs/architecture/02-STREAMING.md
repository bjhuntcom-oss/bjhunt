# 02 — Streaming Live

> Implementation reelle du streaming dans BJHUNT. Basee sur l'audit du code existant
> (`chat/page.tsx`, `backend/src/routes/chat.ts`, `parseSSE.ts`, LangGraph API).

## Architecture SP3 — Two-Phase Streaming

BJHUNT utilise un pattern **two-phase** pour contourner les limites de Vercel (timeout 10s serverless) :

```
PHASE 1 — Prepare (REST, via Vercel proxy)
  Browser → POST /api/proxy/chat/prepare → Vercel → Backend
  Response: { streamUrl, ticket, conversationId }
  Duree: < 1s

PHASE 2 — Stream (SSE direct, bypass Vercel)
  Browser → GET ${streamUrl}?ticket=${ticket}&_t=${timestamp} → Backend direct
  Protocol: text/event-stream
  Duree: 1s → 4h (duree de l'audit)
  Auth: ticket param (pas de header → evite CORS preflight)
  Cache-bust: _t param (contourne le cache 24h Chrome CORS)
```

### Pourquoi two-phase ?

1. **Vercel serverless** timeout a 10-60s → impossible pour du streaming long
2. Le `prepare` va via Vercel (cookies, auth) et retourne un `ticket` temporaire
3. Le `stream` va **directement** sur `chat.bjhunt.com` (VPS) avec le ticket
4. Pas de CORS preflight grace au ticket en query param (pas de header custom)

### Diagram du pipeline complet

```
Browser                    Vercel            VPS (Backend)         LangGraph          Kali Sandbox
   │                         │                    │                    │                    │
   │ POST /prepare           │                    │                    │                    │
   │────────────────────────>│                    │                    │                    │
   │                         │ POST /chat/prepare │                    │                    │
   │                         │───────────────────>│                    │                    │
   │                         │                    │ Create engagement  │                    │
   │                         │                    │ Create thread      │                    │
   │                         │                    │───────────────────>│                    │
   │                         │                    │ { threadId }       │                    │
   │                         │                    │<───────────────────│                    │
   │                         │                    │ Generate ticket    │                    │
   │                         │ { streamUrl, ticket, convId }          │                    │
   │                         │<───────────────────│                    │                    │
   │ { streamUrl, ticket }   │                    │                    │                    │
   │<────────────────────────│                    │                    │                    │
   │                         │                    │                    │                    │
   │ GET streamUrl?ticket=...&_t=...  (DIRECT, pas via Vercel)        │                    │
   │─────────────────────────────────>│                    │                    │
   │                                  │ POST /threads/{id}/runs/stream │                    │
   │                                  │───────────────────>│                    │
   │                                  │                    │ Agent Decepticon   │
   │                                  │                    │───────────────────>│
   │                                  │                    │                    │ nmap -sV
   │                                  │                    │                    │────────>
   │ event: token                     │                    │                    │
   │ data: {"token":"Scanning"}       │                    │                    │
   │<─────────────────────────────────│                    │                    │
   │ event: tool_call                 │                    │                    │
   │ data: {"name":"bash",...}        │                    │                    │
   │<─────────────────────────────────│                    │                    │
   │ event: tool_result               │                    │                    │
   │ data: {"result":"22/tcp open"}   │                    │                    │
   │<─────────────────────────────────│                    │                    │
   │ event: done                      │                    │                    │
   │ data: {"tokensIn":1234}          │                    │                    │
   │<─────────────────────────────────│                    │                    │
```

## LangGraph Stream Modes

La requete vers LangGraph utilise `stream_mode: ["values", "custom"]` :

| Mode | Ce qu'il emet | Usage BJHUNT |
|---|---|---|
| `values` | State snapshot complet apres chaque node (contient tout `messages[]`) | Reconstruction d'etat, token counts |
| `custom` | Events utilisateur via `get_stream_writer()` (sub-agent lifecycle) | subagent_start/end, graph_update, objective |
| `messages` | `[AIMessageChunk, metadata]` token par token | Non utilise actuellement (values suffit) |
| `updates` | Delta par node seulement | Non utilise |
| `events` | Callbacks LangChain bas niveau | Non utilise |
| `debug` | Trace interne | Dev uniquement |

## SSE Event Types — Implementation reelle

### Event flow backend → frontend

Le backend (`chat.ts`) recoit les events LangGraph bruts et les re-emet en events types pour le frontend :

```
LangGraph SSE                    Backend transformation              Frontend SSE
─────────────────                ───────────────────────              ────────────
event: values                    Parse AIMessageChunk.content  →     event: token
data: {messages: [...]}          Extract delta text                  data: {"token":"...", "agent":"recon"}

event: values                    Detect tool_calls[] in message →   event: tool_call
data: {messages: [...]}          Extract {id, name, args}            data: {"id":"tc-1", "name":"bash", ...}

event: values                    Detect tool result message →        event: tool_result
data: {messages: [...]}          Extract {id, result, status}        data: {"id":"tc-1", "result":"...", ...}

event: custom                    Parse type field →                  event: subagent_start
data: {type:"subagent_start"}    Forward directly                    data: {"id":"sa-1", "name":"recon"}

event: custom                    Parse type field →                  event: objective
data: {type:"objective"}         Forward directly                    data: {objective data}

event: custom                    Parse type field →                  event: graph_update
data: {type:"graph_update"}      Forward directly                    data: {nodes, edges, stats}
```

### Tous les event types cote frontend

| Event | Donnees | Composant UI |
|---|---|---|
| `token` | `{ token: string, agent?: string }` | MessageBubble (typing effect, ~4 chars/token) |
| `tool_call` | `{ id, name, args, status: "running" }` | ToolCallBlock (spinner orange) |
| `tool_result` | `{ id, result/output, status, duration }` | ToolCallBlock (check vert / X rouge) |
| `thinking` | `{ content, active: boolean }` | ThinkingBlock (collapsible, dots animation) |
| `subagent_start` | `{ id, name, description }` | SubAgentCard (spinner, timer) |
| `subagent_end` | `{ id }` | SubAgentCard (check/X, duree finale) |
| `objective` | Objective data | OpplanPanel (kill chain phases) |
| `graph_update` | `{ nodes, edges, stats }` | KnowledgeGraphPanel (overview/nodes/edges tabs) |
| `error` | `{ message }` | Banner rouge + bouton Retry |
| `done` | `{ tokensIn, tokensOut }` | Fin stream, cleanup, update token counters |

## SSE Parser (`parseSSE.ts`)

```typescript
export function splitSSEBlocks(buffer: string): {
  blocks: string[];
  remainder: string;
} {
  const normalised = buffer.replace(/\r\n/g, "\n");
  const parts = normalised.split("\n\n");  // Blocs SSE separes par \n\n
  const remainder = parts.pop() ?? "";     // Bloc incomplet garde pour le prochain chunk
  return { blocks: parts, remainder };
}
```

Le reader loop dans `page.tsx` :
```typescript
const reader = streamRes.body?.getReader();
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  // Guard race condition : drop si user a switch de conversation
  if (requestIdRef.current !== currentRequestId) break;

  buffer += decoder.decode(value, { stream: true });
  const { blocks, remainder } = splitSSEBlocks(buffer);
  buffer = remainder;

  for (const block of blocks) {
    if (!block.trim()) continue;
    processStreamEvent(block, assistantId);
  }
}
```

## Metriques de streaming en temps reel

### Calcul de vitesse (moving average)

```typescript
// Interval toutes les 500ms pendant le stream
speedIntervalRef.current = setInterval(() => {
  const elapsed = (Date.now() - streamStartTimeRef.current) / 1000;
  if (elapsed > 0 && tokensSoFarRef.current > 0) {
    const rawSpeed = tokensSoFarRef.current / elapsed;
    speedSamplesRef.current.push(rawSpeed);
    if (speedSamplesRef.current.length > 5) speedSamplesRef.current.shift(); // Max 5 echantillons
    const avg = speedSamplesRef.current.reduce((a, b) => a + b, 0) / speedSamplesRef.current.length;
    setStreamSpeed(Math.round(avg)); // Affiche dans le header du chat
  }
}, 500);
```

**Token estimation** : ~4 caracteres = 1 token (approximation).
Le token count reel est utilise quand le backend l'envoie dans l'event `done`.

### Affichage header du chat

```
Agent: Recon │ 42 tok/s │ 1,234 tokens │ Streaming...
```

## Protection contre les race conditions

```typescript
// Probleme: user switch de conversation pendant un stream en cours
// Solution: requestIdRef monotone increment

const currentRequestId = ++requestIdRef.current;

// ... demarrer le stream ...

// Dans la boucle de lecture:
if (requestIdRef.current !== currentRequestId) break; // Drop les events stales
```

## Auto-scroll

- Seuil : 150px du bas
- Comportement : `smooth`
- FAB "Scroll to bottom" visible si > 200px du bas
- Ne force PAS le scroll si l'user a scrolle vers le haut (pas de saut pendant le streaming)

## Bouton Stop

```typescript
// abortRef est un AbortController passe au fetch()
const handleStop = () => {
  abortRef.current?.abort();
  // AbortError est catch et supprime (pas d'erreur affichee)
  // Le message en cours est marque comme complete
};
```

## Reconnexion et Event Replay — A IMPLEMENTER

**Etat actuel** : PAS de replay. Si le client deconnecte mid-stream, les events sont perdus.
Le `pendingStreams` Map dans `chat.ts` est single-use — une fois consomme, l'entree est supprimee.

### Architecture recommandee

**Table PostgreSQL pour persistence des events** :

```sql
CREATE TABLE stream_events (
  id        BIGSERIAL PRIMARY KEY,
  org_id    UUID NOT NULL,
  run_id    UUID NOT NULL,
  conv_id   UUID NOT NULL,
  event_type TEXT NOT NULL,
  data      JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_stream_events_run ON stream_events(run_id, id);
```

**Replay endpoint** :

```typescript
GET /api/chat/stream/{runId}/replay?cursor={lastEventId}
// Retourne tous les events depuis le cursor
```

**Client-side reconnection** :
1. Stocker `lastEventId` dans le state
2. Sur deconnexion, appeler le replay endpoint
3. Reprendre le stream SSE live depuis le dernier event
4. LangGraph supporte `GET /threads/{id}/runs/{runId}/stream` pour rejoindre un stream existant

### Mode interactif — Pause/Resume

LangGraph supporte `interrupt()` pour les points d'approbation :

```python
from langgraph.types import interrupt, Command

def exploit_node(state):
    if state.engagement.require_approval:
        decision = interrupt({
            "action": "exploit",
            "target": state.target,
            "technique": "SQLi",
            "risk": "high"
        })
        if decision.get("approved") != True:
            return {"status": "skipped"}
```

Resume via l'API :
```
POST /threads/{threadId}/runs/stream
{"command": {"resume": {"approved": true}}, "assistant_id": "bjhunt"}
```

**Modes prevus** :
- `auto` : Agent tourne jusqu'a completion. Pas d'interrupts.
- `interactive` : Pause avant chaque tool call. User approuve chaque action.
- `hybrid` : Auto pour les outils low-risk (recon, enumeration). Pause pour high-risk (exploit, credential access).

## Configuration Caddy anti-buffering

```caddyfile
api.bjhunt.com, chat.bjhunt.com {
    reverse_proxy backend:3001 {
        flush_interval -1          # Flush immediat, pas de buffering

        transport http {
            read_timeout  0        # Pas de timeout lecture (SSE longue duree)
            write_timeout 0        # Pas de timeout ecriture
        }
    }
}
```

**`flush_interval -1`** = flush apres chaque write(). Sans ca, Caddy accumule des chunks de 4KB.
**Attention compression** : si `encode gzip` est actif, il bufferise malgre `flush_interval -1`. Exclure les routes SSE de la compression.

## Proxy Vercel (`app/api/proxy/[...path]/route.ts`)

Le proxy Next.js detecte les reponses SSE et les pipe directement :

```typescript
// Detection SSE
if (contentType?.includes('text/event-stream')) {
  return new Response(res.body, {
    status: res.status,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
      'x-accel-buffering': 'no',
    }
  });
}
```

Timeout : 60 secondes (safe pour Vercel Pro qui autorise 300s).
Le stream phase 2 bypass Vercel completement → pas de timeout.

## Latence mesuree

| Couche | Latence | Comment l'optimiser |
|---|---|---|
| LLM → LangGraph | ~200-800ms TTFT | `stream=True`, prompt caching Anthropic |
| LangGraph → Backend | < 1ms | Docker internal network, meme machine |
| Backend → Caddy | < 1ms | localhost |
| Caddy → Browser | ~20-100ms | TLS overhead, distance reseau |
| **Total pipeline** | **~250-1000ms** TTFT | Domine par la latence LLM |
