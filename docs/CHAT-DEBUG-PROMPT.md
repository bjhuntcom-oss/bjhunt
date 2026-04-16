# PROMPT DE DEBUG CHAT — BJHUNT

> Copie ce prompt dans une nouvelle session Claude Code pour diagnostiquer et corriger le chat SSE.

---

## Contexte complet

BJHUNT est une plateforme SaaS de cybersecurite. Le frontend est sur Vercel (www.bjhunt.com), le backend + engine sur un VPS Hostinger (api.bjhunt.com, IP 82.25.117.79).

### Architecture du chat SSE

```
Browser (www.bjhunt.com)
  |
  | POST /api/proxy/chat/stream (same-origin proxy on Vercel)
  |
  v
Vercel Serverless Function (maxDuration=60, mais Hobby plan = 10s timeout)
  |
  | POST https://api.bjhunt.com/api/chat/stream (forwarded)
  |
  v
Caddy (port 443, flush_interval -1)
  |
  v
Backend Hono+Bun (port 3001)
  |
  | langgraphClient.streamRun() -> POST http://langgraph:2024/threads/{id}/runs/stream
  |                                 stream_mode: ["values", "custom"]
  v
LangGraph API (port 2024)
  |
  | Agent "bjhunt" (orchestrator)
  |
  v
LiteLLM Proxy (port 4000) -> Ollama Cloud (https://ollama.com/v1, GLM-5.1)
```

### Etat actuel verife le 16 avril 2026

**Ce qui FONCTIONNE (verifie) :**
- Tous les 8 containers Docker sont healthy sur le VPS
- LangGraph execute les runs avec succes (logs: "Background run succeeded", run_exec_ms=2s a 51s)
- LiteLLM route vers Ollama Cloud correctement (HTTP 200 sur /chat/completions)
- Le backend retourne 200 sur POST /api/chat/stream
- Les CORS headers sont correctement configures sur le backend Hono (verifie avec curl)
- Le cookie bjhunt_stream_token (non-HttpOnly) contient le session ID valide
- L'auth par query string ?token= fonctionne (verifie avec curl, retourne 404 engagement not found = auth OK)
- L'auth par header Authorization: Bearer session:<token> fonctionne (verifie avec curl)
- Caddy passe les headers CORS du backend sans les dupliquer

**Ce qui NE FONCTIONNE PAS :**
- Le chat dans le browser affiche "Error: Failed to fetch" ou "Error: HTTP 502"
- Cause 1 : Le proxy Vercel Hobby plan a un timeout de 10 secondes. Les runs LangGraph prennent 10-50s. Le proxy coupe la connexion avant que le stream soit complet.
- Cause 2 : Le fetch direct vers api.bjhunt.com est bloque par le cache CORS preflight du browser (Chrome cache les reponses preflight 24h). Les anciennes reponses sans CORS headers sont cachees.
- Cause 3 : Content-Type: application/json declenche un preflight CORS obligatoire.

### Solutions possibles (par ordre de recommandation)

1. **Upgrade Vercel Pro** ($20/mois) — maxDuration passe a 300s, le proxy SSE fonctionne
2. **Deployer le frontend Next.js sur le VPS** (meme domaine, pas de CORS) — pas de timeout Vercel
3. **Attendre 24h** pour que le cache CORS preflight expire, puis utiliser le fetch direct avec le token en query string
4. **Utiliser un WebSocket** au lieu de SSE (pas de preflight CORS pour WS upgrade)

---

## Commandes VPS

### Connexion SSH
```bash
ssh bjhunt-vps
# Equivalent a : ssh -p 443 -i ~/.ssh/bjhunt_vps root@82.25.117.79
# Le FAI bloque tous les ports sauf 80 et 443 — SSH passe par sslh sur 443
```

### Verifier l'etat des containers
```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

### Logs des services
```bash
docker logs bjhunt-backend --tail 30        # Backend Hono+Bun
docker logs bjhunt-langgraph --tail 30      # LangGraph API
docker logs bjhunt-litellm --tail 30        # LiteLLM proxy
docker logs bjhunt-caddy --tail 30          # Caddy reverse proxy
docker logs bjhunt-neo4j --tail 30          # Neo4j knowledge graph
docker logs bjhunt-postgres --tail 30       # PostgreSQL
docker logs bjhunt-redis --tail 30          # Redis
docker logs bjhunt-sandbox --tail 30        # Kali sandbox
```

### Tester le chat stream depuis le VPS (bypass tout proxy)
```bash
# 1. Tester la sante de LangGraph
curl -s http://localhost:2024/ok -H 'Authorization: Bearer $BJHUNT_API_SECRET'

# 2. Tester le stream backend directement (bypass Caddy)
curl -s -D- -X POST http://localhost:3001/api/chat/stream \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer session:<SESSION_TOKEN>' \
  -d '{"message":"hello","engagementId":"<ENGAGEMENT_UUID>"}' \
  --max-time 120

# 3. Tester le stream via Caddy (HTTPS)
curl -s -D- -X POST https://api.bjhunt.com/api/chat/stream \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer session:<SESSION_TOKEN>' \
  -H 'Origin: https://www.bjhunt.com' \
  -d '{"message":"hello","engagementId":"<ENGAGEMENT_UUID>"}' \
  --max-time 120

# 4. Tester le preflight CORS
curl -sI -X OPTIONS https://api.bjhunt.com/api/chat/stream \
  -H 'Origin: https://www.bjhunt.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type,Authorization'

# 5. Tester l'auth par query string
curl -s -D- -X POST https://api.bjhunt.com/api/chat/stream?token=<SESSION_TOKEN> \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://www.bjhunt.com' \
  -d '{"message":"hello","engagementId":"<ENGAGEMENT_UUID>"}' \
  --max-time 120
```

### Redemarrer un service
```bash
cd /opt/bjhunt/app
docker compose restart backend     # Restart backend
docker compose restart caddy       # Restart Caddy
docker compose restart langgraph   # Restart LangGraph
docker compose up -d --build backend  # Rebuild + restart backend
```

### Mettre a jour le code
```bash
cd /opt/bjhunt/app
git fetch --all --prune
git reset --hard origin/main
docker compose up -d --build backend
docker compose restart caddy
```

### Variables d'environnement cles
```bash
# Depuis le container backend :
docker exec bjhunt-backend env | grep -E 'LANGGRAPH|BJHUNT_API|CORS|BACKEND'

# Fichier .env :
cat /opt/bjhunt/app/.env | grep -v '#' | grep -E 'LANGGRAPH|BJHUNT|POSTGRES|REDIS|NEO4J|OLLAMA|LITELLM'
```

---

## Connexion Playwright MCP

Le MCP Playwright est configure dans `.mcp.json`. Pour tester le chat :

```
1. Naviguer vers https://www.bjhunt.com/fr/login
2. Les credentials sont pre-remplis (admin@bjhunt.com / admin1234567!)
3. Cliquer "Se connecter"
4. Naviguer vers https://www.bjhunt.com/fr/dashboard/chat
5. Taper un message dans le textbox "Describe your target or ask a question..."
6. Envoyer avec Enter
7. Attendre 60-70 secondes (LangGraph run peut prendre jusqu'a 50s)
8. Verifier la console du navigateur pour les erreurs
```

Pour lire les cookies du browser :
```javascript
// Dans browser_evaluate :
() => document.cookie
// Le bjhunt_stream_token contient le session ID (non-HttpOnly)
// Le bjhunt_session est HttpOnly (invisible a JS)
```

---

## Fichiers cles a lire

### Backend
- `backend/src/routes/chat.ts` — Route SSE streaming + DB persistence (700+ lignes)
- `backend/src/lib/langgraph-client.ts` — Client HTTP vers LangGraph API
- `backend/src/middleware/auth.ts` — Auth : cookie, Bearer session:, query string ?token=
- `backend/src/middleware/cors.ts` — CORS config (origins, credentials, headers)
- `backend/src/middleware/plan-gate.ts` — Plan enforcement + admin bypass
- `backend/src/config.ts` — Config (LANGGRAPH_URL, CORS_ORIGINS, etc.)

### Frontend
- `app/[locale]/dashboard/chat/page.tsx` — Page chat principale (~1200 lignes)
- `components/chat/message-bubble.tsx` — Rendu messages (Markdown + XSS sanitize)
- `components/chat/chat-input.tsx` — Input avec toolbar
- `app/api/proxy/[...path]/route.ts` — Proxy Vercel (same-origin, SSE support)
- `lib/backend-client.ts` — Client API (browserBackendFetch)

### Infrastructure
- `docker-compose.yml` — 8 services (backend, postgres, redis, litellm, neo4j, sandbox, langgraph, caddy)
- `ops/Caddyfile` — Reverse proxy config (flush_interval -1, HSTS)
- `engine/config/litellm.yaml` — LiteLLM model routing (Ollama Cloud, Anthropic, OpenAI)
- `engine/langgraph.json` — 17 agents registered (bjhunt, recon, exploit, etc.)

---

## Historique des tentatives et ce qui a ete appris

### Tentative 1 : Proxy Vercel
- Le frontend route `/api/proxy/chat/stream` vers `api.bjhunt.com`
- Le proxy fonctionne mais Vercel Hobby plan coupe apres **10 secondes**
- `maxDuration = 60` ne fonctionne PAS sur Hobby plan

### Tentative 2 : Fetch direct vers api.bjhunt.com
- Le backend a les CORS headers corrects (verifie avec curl)
- Caddy passe les headers sans les dupliquer
- MAIS Chrome cache les preflights CORS pendant 24h
- Les anciens preflights (sans CORS) sont caches → les nouveaux fetch echouent
- `Content-Type: application/json` declenche obligatoirement un preflight

### Tentative 3 : Token en query string (eviter le preflight)
- `?token=<session_id>` fonctionne cote backend (verifie avec curl)
- MAIS `Content-Type: application/json` declenche toujours le preflight
- Meme avec le token en QS, le preflight cache bloque

### Conclusion
Le probleme n'est PAS dans le code. Le code fonctionne correctement (verifie avec curl end-to-end). Le probleme est la combinaison :
1. Cache CORS preflight du browser (24h)
2. Vercel Hobby plan timeout (10s)

**Solution recommandee : Upgrade Vercel Pro ($20/mois) pour maxDuration=300s, OU deployer le frontend sur le VPS (meme domaine, pas de CORS).**

---

## Session Vercel

Pour voir les deployments Vercel :
1. Naviguer vers https://vercel.com/bjhunts-projects/bjhunt/deployments
2. Le compte est connecte via Google (bjhuntcom@gmail.com)
3. Verifier que le dernier deployment est "Ready" et "Current"
4. Cliquer sur un deployment pour voir les build logs

---

## Ce qui reste a faire apres le fix du chat

1. Tester le streaming progressif (token par token) — verifie que le TransformStream parse correctement les events LangGraph "values" + "custom"
2. Tester les tool calls — verifier que les agents utilisent des outils et que le frontend les affiche
3. Tester les sub-agents — verifier que les events subagent_start/end passent via custom stream
4. Tester le thinking indicator — verifier qu'il s'affiche pendant que l'agent reflechit
5. Tester la persistance DB — verifier que les messages sont sauves et rechargeable
6. Tester la sidebar conversations — verifier que les conversations sont separees et persistantes
7. Tester le retry button — verifier que le bouton RETRY renvoie le message
8. Nettoyer les anciennes conversations de test (optionnel)
