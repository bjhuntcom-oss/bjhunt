# DECISION — DOUBLE SYSTEME SANDBOX BJHUNT 4 MAX

**Date** : 2026-05-13
**Statut** : Decision signee — E2B = production actif, bjhunt-sandbox = reserve
**Auditeur** : Agent audit architecture BJHUNT 4 MAX

---

## 1. SCHEMA ASCII — LES DEUX ARCHITECTURES COTE A COTE

### 1.1 E2B Sandbox (PRODUCTION ACTIVE)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
│                                                                      │
│  app.bjhunt.com ──► Cloudflare Tunnel ──► VPS Hostinger (82.25...)  │
│                                                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  bjhunt-backend (Hono) │
                    │  src/lib/              │
                    │  ├── sandbox.ts        │  ← abstraction e2b/docker/mock
                    │  ├── e2b.ts            │  ← BJHUNT_E2B_MODE=e2b
                    │  └── engine-process.ts │  ← spawn openclaude + MCP cfg
                    └───────┬───────┬───────┘
                            │       │
              POST /sandboxes       │
              (X-API-Key)           │ spawn bun openclaude
                            │       │ --mcp-config → E2B /mcp
                    ┌───────▼───┐   │
                    │  E2B API  │   │
                    │ api.e2b.dev│   │
                    └───────┬───┘   │
                            │       │
          ┌─────────────────▼───────▼────────────────────┐
          │     Firecracker microVM (par chat)            │
          │     Template: bjhunt-kali                     │
          │     Host: 8090-<sandboxID>.e2b.app             │
          │                                               │
          │  ┌─────────────────────────────────────────┐  │
          │  │  kali-mcp-server.cjs (port 8090)         │  │
          │  │  ┌───────────────────────────────────┐  │  │
          │  │  │  Auth: HMAC-SHA256 Bearer token   │  │  │
          │  │  │  POST /mcp (JSON-RPC)             │  │  │
          │  │  │  Tools:                           │  │  │
          │  │  │    execute_command (bash -lc)      │  │  │
          │  │  │    read_file (fs filesysteme)      │  │  │
          │  │  │    write_file (fs ecriture)        │  │  │
          │  │  │    glob_files (recherche glob)     │  │  │
          │  │  │    search_content (grep -rn -E)    │  │  │
          │  │  │    web_search (DDG / SearXNG)      │  │  │
          │  │  │    write_canvas (markdown UI)      │  │  │
          │  │  └───────────────────────────────────┘  │  │
          │  └─────────────────────────────────────────┘  │
          │                                               │
          │  Entrypoint: /opt/bjhunt/run-engagement.sh    │
          │  Secrets: /chat/.relay-secret (0600)          │
          │  Scope:   /chat/scope.json                     │
          │  Workspace: /chat/workspace                    │
          │  Evidence:  /chat/evidence                     │
          └───────────────────────────────────────────────┘

  Cout      : ~0.50$/h par chat (E2B BYOC managed-EU)
  Isolation : VM Firecracker (KVM hardware-level)
  Scalabil  : Illimitee (cloud, pas de limite VPS)
  Perf      : Dediee par VM (Firecracker alloue CPU/RAM)
```

### 1.2 bjhunt-sandbox (RESERVE — VPS upgrade requis)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET                                     │
│                                                                      │
│  app.bjhunt.com ──► Cloudflare Tunnel ──► VPS Hostinger (82.25...)  │
│                                                                      │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────────────────┐
                    │  VPS Hostinger                     │
                    │  8 vCPU / 32 GB RAM               │
                    │                                    │
                    │  ┌──────────────────────────────┐  │
                    │  │  bjhunt-orchestrator          │  │
                    │  │  (Python / LangGraph)         │  │
                    │  │  nodes/                       │  │
                    │  │  ├── tool_executor.py         │  │
                    │  │  └── scope_guard.py           │  │
                    │  └──────────┬───────────────────┘  │
                    │             │ HTTP REST             │
                    │             │ BJHUNT_SANDBOX_URL    │
                    │  ┌──────────▼───────────────────┐  │
                    │  │  bjhunt-sandbox (FastAPI)     │  │
                    │  │  main.py                       │  │
                    │  │  ┌─────────────────────────┐  │  │
                    │  │  │  POST /sandbox/spawn     │  │  │
                    │  │  │  POST /sandbox/execute   │  │  │
                    │  │  │  DELETE /sandbox/{id}    │  │  │
                    │  │  │  POST /openhands/spawn   │  │  │
                    │  │  │  POST /openhands/execute │  │  │
                    │  │  │  GET  /openhands/stream  │  │  │
                    │  │  └─────────────────────────┘  │  │
                    │  │  security/                     │  │
                    │  │  ├── analyzers.py              │  │
                    │  │  │   EnsembleSecurityAnalyzer  │  │
                    │  │  │   ├── Pattern (15 blocks)   │  │
                    │  │  │   ├── PolicyRail (5 rules)  │  │
                    │  │  │   └── LLM (heuristic stub)  │  │
                    │  │  └── risk_levels.py             │  │
                    │  │  workspace.py                   │  │
                    │  │  └── DockerWorkspace            │  │
                    │  │      └── docker-py SDK          │  │
                    │  └──────────┬───────────────────┘  │
                    │             │ /var/run/docker.sock │
                    │  ┌──────────▼───────────────────┐  │
                    │  │  Docker Engine (local)        │  │
                    │  │  Container par sandbox:       │  │
                    │  │    Image: bjhunt-sandbox:lts  │  │
                    │  │    CPU:   1.0 core            │  │
                    │  │    RAM:   512 MB               │  │
                    │  │    Sec:   seccomp:unconfined  │  │
                    │  │    Caps:  NET_RAW, NET_ADMIN  │  │
                    │  │    Tools: nmap, sqlmap,       │  │
                    │  │           nuclei, subfinder   │  │
                    │  └───────────────────────────────┘  │
                    └────────────────────────────────────┘

  Cout      : 0 EUR (ressources VPS existantes)
  Isolation : Conteneur Docker (OS-level, kernel partage)
  Scalabil  : Limitee par VPS (8vCPU, 32GB)
  Perf      : Partagee, contention Docker-in-Docker
  Limite    : Hostinger pas assez puissant pour D-in-D a l'echelle
```

---

## 2. ANALYSE COMPARATIVE DETAILLEE

### 2.1 Matrice comparative

| Critere                        | E2B (Production)                          | bjhunt-sandbox (Reserve)                      |
|--------------------------------|-------------------------------------------|-----------------------------------------------|
| **Cout**                       | ~0.50 USD/h par chat (BYOC managed-EU)   | 0 EUR (ressources VPS deja allouees)          |
| **Isolation**                  | VM Firecracker (KVM hardware-level)       | Conteneur Docker (OS-level, kernel partage)   |
| **Performance**                | Dediee par microVM, pas de contention     | Partagee sur VPS, contention Docker-in-Docker |
| **Scalabilite**                | Illimitee (cloud E2B, elastic)            | Limitee par VPS (8vCPU / 32 GB)               |
| **Securite**                   | Firecracker sandbox + microVM isolation   | Docker + seccomp:unconfined + analyzers Py    |
| **Auth sandbox**               | HMAC-SHA256 Bearer token (relay secret)   | HTTP REST sans auth actuellement              |
| **Outils disponibles**         | Kali complet (via bash) + DDG web search  | nmap, sqlmap, nuclei, subfinder, custom       |
| **Modele d'outils**            | Primitifs (execute_command, read_file...) | Haut niveau (dispatched par nom d'outil)      |
| **Protocole**                  | MCP JSON-RPC (POST /mcp)                  | REST HTTP (POST /sandbox/*)                   |
| **Streaming evenements**       | Via openclaude engine (backend VPS)       | SSE (GET /openhands/stream/{id})              |
| **Integration orchestrator**   | NON (pas de REST /execute)                | OUI (HTTP REST direct)                        |
| **Lifecycle sandbox**          | 1:1 chat DB, idle reap 5 min, max 60 min  | Manuelle (spawn/delete via API)               |
| **Defense-in-depth**           | Origin check + token + egress-filter.sh   | Ensemble analyzers (Pattern+Policy+LLM)       |
| **Observabilite**              | Via engine stdout/stderr + logger         | Via FastAPI logs                              |
| **Provisionnement**            | E2B CLI `template build` → registry       | Dockerfile local + docker-compose             |
| **Versioning template**        | Non versionne (HEAD courant)              | Via Docker image tag                          |
| **Reseau**                     | E2B EU plane, port 8090 public            | Bridge network `bjhunt-sandbox-net`           |
| **Entree en production**       | IMMEDIATE (actif)                         | Apres upgrade VPS (Hetzner CCX43)             |

### 2.2 Forces et faiblesses

**E2B — Forces** :
- Isolation Firecracker = blast radius zero entre chats
- Scalabilite cloud illimitee, pas de limite hardware
- Integration native avec openclaude via MCP HTTP
- Cout proportionnel a l'usage (idle reap 5 min)
- Infrastructure managed (pas de maintenance Docker engine)

**E2B — Faiblesses** :
- Cout recurrent (0.50$/h/chat, budget mensuel variable)
- Latence de boot microVM (~3s, amorti par warm-spawn a la creation du chat)
- Pas d'endpoint REST direct pour l'orchestrator (MCP JSON-RPC uniquement)
- Template non versionne (HEAD courant, pas de provenance per-chat)
- Port 8090 publiquement resolvable (mitige par auth HMAC)
- E2B_API_KEY requis, SPOF si rate-limit ou panne E2B

**bjhunt-sandbox — Forces** :
- Cout zero (infrastructure VPS existante)
- Controle total de l'environnement (Dockerfile local)
- Ensemble analyzers de securite en Python (15 patterns, 5 policies)
- Endpoint REST simple, directement compatible avec tool_executor.py
- Pas de latence cloud (local sur VPS)

**bjhunt-sandbox — Faiblesses** :
- VPS actuel (Hostinger 8vCPU/32GB) insuffisant pour Docker-in-Docker a l'echelle
- Contention CPU/RAM entre sandboxes concurrentes
- Isolation OS-level (pas de VM), fuite kernel possible
- Pas de scaling horizontal sans nouveau VPS
- seccomp:unconfined = surface d'attaque elargie
- `/sandbox/execute` sans auth actuellement (appele en interne)
- Maintenance Docker Engine + images a charge de BJHUNT

---

## 3. BRIDGE ORCHESTRATOR → E2B — RECOMMANDATION

### 3.1 Le probleme

`tool_executor.py` (LangGraph orchestrator) appelle actuellement `bjhunt-sandbox` en HTTP REST :

```python
SANDBOX_URL = os.getenv("BJHUNT_SANDBOX_URL", "http://bjhunt-sandbox:8000")
httpx.post(f"{SANDBOX_URL}/sandbox/execute", json={tool, args, ...})
```

E2B expose un serveur MCP JSON-RPC sur `POST /mcp` — pas d'endpoint REST `/sandbox/execute`.

Les modeles de donnees sont differents :
- **bjhunt-sandbox** recoit un nom d'outil haut niveau (`"nmap"`) et construit la commande
- **E2B MCP** recoit `execute_command` avec la commande shell complete

### 3.2 Trois options analysees

| Option | Description | Avantage principal | Risque principal |
|--------|-------------|-------------------|------------------|
| **A — URL dynamique dans state** | `sandbox_url` passe dans `POST /runs`, stocke dans `BJHUNTState`, tool_executor POST direct | Latence minimale, pas d'intermediaire | tool_executor doit parler MCP JSON-RPC (refacteur lourd), auth HMAC a implementer en Python, pas d'endpoint REST compatible |
| **B — Backend proxy** | Orchestrator appelle `POST /api/internal/execute-tool`, backend forward vers E2B via SDK | tool_executor reste REST, backend gere l'auth | Double hop (latence), backend devient SPOF critique, `commands.run` != MCP tools (mismatch semantique), surface API backend elargie |
| **C — Nouvel endpoint REST dans kali-mcp-server.cjs** | Ajouter `POST /execute` dans le serveur MCP (port 8090), tool_executor POST direct | Reutilise l'HTTP REST existant de tool_executor, handlers deja implantes, auth HMAC deja en place, latence minimale | Maintenance double surface API (MCP + REST) dans le meme serveur, complexite incrementale mineure |

### 3.3 Recommandation : Option C + URL dynamique (hybride A+C)

**L'option C est recommandee**, avec un element de l'option A pour la resolution d'URL.

#### 3.3.1 Architecture cible

```
┌─────────────────────────┐     POST /execute      ┌───────────────────────────┐
│  bjhunt-orchestrator     │ ──────────────────────► │  E2B microVM               │
│  tool_executor.py        │   {command, timeout}    │  kali-mcp-server.cjs      │
│                           │ ◄────────────────────── │  + POST /execute (NOUVEAU) │
│  sandbox_url = state.url │   {stdout, stderr, rc}  │                           │
└─────────────────────────┘                          └───────────────────────────┘
```

#### 3.3.2 Modifications requises

**Fichier 1** : `D:\bjhunt-engine\bjhunt\docker\kali-mcp-server.cjs` — ajouter une route REST

```javascript
// NOUVEAU — en dessous de la route POST /mcp existante (ligne ~526)
if (req.url === '/execute' && req.method === 'POST') {
  // ... verifier auth (Bearer token, meme verifyToken())
  // ... parser body {command: string, timeout_ms?: number}
  // ... appeler execBash({command, timeout_ms}) — handler existant
  // ... retourner {stdout, stderr, exit_code, duration_ms}
  const result = await execBash({ command: body.command, timeout_ms: body.timeout_ms || 120000 });
  res.writeHead(200, {'Content-Type':'application/json'});
  res.end(JSON.stringify({
    stdout: result.content[0].text,
    exit_code: result.isError ? 1 : 0,
    stderr: '',
  }));
  return;
}
```

**Fichier 2** : `D:\bjhunt-orchestrator\orchestrator\state.py` — ajouter `sandbox_url` au state

```python
class BJHUNTState(TypedDict):
    # ... existant ...
    sandbox_id: Optional[str]
    sandbox_url: Optional[str]   # ← NOUVEAU
    relay_token: Optional[str]   # ← NOUVEAU (Bearer token signe)
```

**Fichier 3** : `D:\bjhunt-orchestrator\orchestrator\nodes\tool_executor.py` — adapter pour E2B

```python
def execute_tool_via_e2b(command: str, *, timeout, state) -> Dict[str, Any]:
    """Execute via E2B REST /execute (Option C hybrid)."""
    sandbox_url = state.get("sandbox_url")
    relay_token = state.get("relay_token")
    if not sandbox_url or not relay_token:
        raise ValueError("sandbox_url and relay_token required in state")
    
    resp = httpx.post(
        f"{sandbox_url}/execute",
        json={"command": command, "timeout_ms": timeout * 1000},
        headers={"Authorization": f"Bearer {relay_token}"},
        timeout=timeout + 10,
    )
    resp.raise_for_status()
    return resp.json()
```

**Fichier 4** : `D:\bjhunt-backend\src\lib\engine-process.ts` — injecter `sandbox_url` + `relay_token` lors de la creation du run orchestrator

Le backend, qui spawn deja le sandbox E2B et connait :
- `sandbox.engineEndpoint` (ex: `https://8090-abc123.e2b.app`)
- `relayToken` (signe via `signRelayToken()`)

...doit transmettre ces valeurs au `POST /runs` de l'orchestrator pour initialiser `BJHUNTState`.

#### 3.3.3 Justification detaillee

1. **Impact minimal sur tool_executor.py** : la fonction `execute_tool()` est deja structuree pour HTTP POST avec body JSON. Ajouter une branche `execute_tool_via_e2b()` avec des headers Authorization est marginal (~15 lignes).

2. **Reutilisation maximale** : `execBash()` dans `kali-mcp-server.cjs` gere deja le spawn bash, le timeout, la troncature stdout/stderr, et le kill. Pas besoin de reecrire la logique d'execution.

3. **Auth coherente** : le meme `verifyToken()` (HMAC-SHA256) utilise pour `/mcp` protege `/execute`. Le backend signe les tokens avec `signRelayToken()`, et le meme secret `BJHUNT_RELAY_SECRET` est provisionne dans le sandbox via `provisionRelaySecret()`.

4. **Latence** : pas de hop intermediaire. L'orchestrator parle directement au sandbox E2B via son URL publique (`8090-<sandboxID>.e2b.app`).

5. **Graceful degradation** : si le nouvel endpoint `/execute` n'est pas present (ancien template E2B), le tool_executor peut fallback vers l'ancien `execute_tool()` REST via `bjhunt-sandbox` — les deux branches coexistent.

6. **Surface d'attaque** : ajouter `/execute` dans le meme serveur HTTP n'augmente pas la surface reseau (port 8090 etait deja ouvert pour `/mcp`). L'auth gate est identique.

---

## 4. PLAN DE MIGRATION — ACTIVER bjhunt-sandbox QUAND LE VPS SERA PRET

### 4.1 Pre-requis hardware

| Ressource | Actuel (Hostinger) | Cible (Hetzner CCX43) | Justification |
|-----------|-------------------|----------------------|---------------|
| vCPU      | 8                 | 16                   | 1 core/sandbox + overhead Docker |
| RAM       | 32 GB             | 64 GB                | 512 MB/sandbox + OS + orchestrator + backend |
| Disque    | NVMe 100 GB       | NVMe 160 GB          | Images Kali + volumes workspace |
| Reseau    | 1 Gbps            | 1 Gbps               | Trafic scan sortant |

### 4.2 Etapes de migration

**Etape 1 — Preparation (J-7)**
- [ ] Verifier que le Dockerfile `bjhunt-sandbox/Dockerfile` build avec la derniere image Kali
- [ ] Mettre a jour `SANDBOX_IMAGE=bjhunt-sandbox:v2.1.0` dans `config.py`
- [ ] Tester `docker-compose up` localement (smoke test spawn + execute nmap)
- [ ] Verifier que les 15 patterns de securite bloquent correctement (test unitaire `analyzers.py`)
- [ ] Ajouter auth endpoint `/sandbox/execute` (reprendre le modele HMAC de kali-mcp-server.cjs)

**Etape 2 — Deploiement VPS (Jour J)**
- [ ] Provisionner le VPS Hetzner CCX43 (Ubuntu 24.04, Docker 26+)
- [ ] Deployer `bjhunt-sandbox` via `docker-compose -f sandbox/docker-compose.yml up -d`
- [ ] Verifier la sante : `curl http://localhost:8000/health`
- [ ] Tester spawn : `curl -X POST http://localhost:8000/sandbox/spawn`
- [ ] Tester execute : `curl -X POST http://localhost:8000/sandbox/execute -d '{"sandbox_id":"...", "tool":"nmap", "target":"scanme.nmap.org"}'`
- [ ] Verifier les logs : pas de OOM kill, CPU throttling acceptable

**Etape 3 — Integration orchestrator (J+1)**
- [ ] Mettre a jour `BJHUNT_SANDBOX_URL=http://bjhunt-sandbox:8000` dans le `.env` orchestrator
- [ ] Ajouter la route `/sandbox/execute` avec auth HMAC dans `main.py`
- [ ] Mettre a jour `tool_executor.py` pour supporter les deux backends (E2B via `/execute`, bjhunt-sandbox via `/sandbox/execute`)
- [ ] Ajouter `sandbox_backend` dans `BJHUNTState` (`"e2b"` | `"docker"`)

**Etape 4 — Switch progressif (J+2 a J+5)**
- [ ] Activer le feature flag `BJHUNT_SANDBOX_BACKEND=docker` pour 10% des chats
- [ ] Monitorer : latence `execute_tool`, taux d'erreur, consommation CPU/RAM VPS
- [ ] Si OK 24h, passer a 50%, puis 100%
- [ ] Rollback possible a tout moment : `BJHUNT_SANDBOX_BACKEND=e2b`

### 4.3 Impact sur docker-compose

**docker-compose.yml principal** (fichier non lu mais suppose sur le VPS) :

```yaml
# Ajouter le service bjhunt-sandbox
services:
  bjhunt-sandbox:
    image: bjhunt-sandbox:v2.1.0
    container_name: bjhunt-sandbox
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - HOST=0.0.0.0
      - SANDBOX_IMAGE=bjhunt-sandbox:v2.1.0
      - SANDBOX_NETWORK=bjhunt-sandbox-net
      - SANDBOX_MEMORY_LIMIT=512m         # a ajuster selon VPS
      - SANDBOX_CPU_LIMIT=1.0
      - DEFAULT_COMMAND_TIMEOUT=120
      - BJHUNT_RELAY_SECRET=${BJHUNT_RELAY_SECRET}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - bjhunt-sandbox-volumes:/tmp/bjhunt-sandbox-volumes
    networks:
      - bjhunt-net
    restart: unless-stopped
```

### 4.4 Impact sur les variables d'environnement

| Variable | Valeur E2B (actuelle) | Valeur bjhunt-sandbox (future) |
|----------|----------------------|-------------------------------|
| `BJHUNT_E2B_MODE` | `e2b` | `docker` |
| `BJHUNT_SANDBOX_URL` | N/A (non utilise) | `http://bjhunt-sandbox:8000` |
| `BJHUNT_SANDBOX_BACKEND` | `e2b` | `docker` |
| `BJHUNT_SANDBOX_IMAGE` | `bjhunt-kali` (template E2B) | `bjhunt-sandbox:v2.1.0` |
| `E2B_API_KEY` | Requise | Optionnelle (fallback) |
| `E2B_TEMPLATE_BJHUNT_KALI` | `bjhunt-kali` | N/A |
| `BJHUNT_SANDBOX_NETWORK` | N/A | `bjhunt-sandbox-net` |
| `BJHUNT_SANDBOX_MEMORY_LIMIT` | N/A | `512m` |
| `BJHUNT_SANDBOX_CPU_LIMIT` | N/A | `1.0` |

---

## 5. SYNTHESE ET DECISION

### 5.1 Decision

| Element | Decision |
|---------|----------|
| **Sandbox production** | E2B Firecracker microVM (actif, immediat) |
| **Sandbox reserve** | bjhunt-sandbox Docker local (active quand VPS upgrade) |
| **Bridge orchestrator→E2B** | **Option C hybride** : endpoint `POST /execute` dans kali-mcp-server.cjs + URL dynamique dans state |
| **Critere activation bjhunt-sandbox** | VPS >= 16 vCPU / 64 GB RAM (Hetzner CCX43 ou equivalent) |
| **Budget mensuel E2B** | Variable, proportional a l'usage (~0.50$/h/chat), idle reap 5 min |
| **Coexistence** | Les deux backends coexistent via `BJHUNT_SANDBOX_BACKEND` dans le state |

### 5.2 Prochaines actions

1. **IMMEDIAT** : Implementer `POST /execute` dans `kali-mcp-server.cjs` (PR `feat/e2b-rest-execute-endpoint`)
2. **IMMEDIAT** : Ajouter `sandbox_url` + `relay_token` dans `BJHUNTState` et `execute_tool_via_e2b()` dans `tool_executor.py`
3. **J+30** : Provisionner VPS Hetzner CCX43 pour test bjhunt-sandbox
4. **J+60** : Switch progressif E2B → bjhunt-sandbox (feature flag)
5. **CONTINU** : Monitorer cout E2B mensuel, ajuster `IDLE_TTL_MS` si necessaire

---

*Document genere par l'agent d'audit architecture BJHUNT 4 MAX le 2026-05-13.*
*Sources : e2b.ts, sandbox.ts, engine-process.ts, kali-mcp-server.cjs, run-engagement.sh, bjhunt-sandbox/main.py, workspace.py, analyzers.py, tool_executor.py, state.py*
