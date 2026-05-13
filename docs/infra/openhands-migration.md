# Migration MCP Kali -> OpenHands Runtime

## Architecture cible

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BJHUNT Orchestrator                          │
│  tool_executor.py                                                   │
│  ┌──────────────────────┐    ┌──────────────────────────────┐      │
│  │ RUNTIME_MODE=sandbox │    │  RUNTIME_MODE=openhands      │      │
│  │ (actuel, fallback)   │    │  (nouveau, cible)            │      │
│  └──────┬───────────────┘    └──────────────┬───────────────┘      │
└─────────┼───────────────────────────────────┼──────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      bjhunt-sandbox (FastAPI :8000)                  │
│                                                                     │
│  POST /sandbox/*           POST /openhands/*                        │
│  (WorkspacePool/Docker)    (openhands_runtime.py)                   │
│       │                         │                                   │
│       ▼                         ▼                                   │
│  ┌──────────┐           ┌──────────────────┐                       │
│  │ Docker   │           │ OpenHands SDK    │                       │
│  │ daemon   │           │ (create_runtime  │                       │
│  │ exec_run │           │  / get_runtime   │                       │
│  └──────────┘           │  / event_stream) │                       │
│                         └────────┬─────────┘                       │
│                                  │                                  │
│                            ┌─────▼──────┐                          │
│                            │ Docker     │                          │
│                            │ daemon     │                          │
│                            └────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Endpoints OpenHands (nouveaux)

| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/openhands/spawn` | Crée un workspace OpenHands (ou fallback Docker) |
| `POST` | `/openhands/execute` | Exécute une commande shell dans un workspace |
| `GET` | `/openhands/stream/{id}` | SSE stream des events d'exécution |
| `GET` | `/openhands/{id}/status` | Statut du workspace |
| `DELETE` | `/openhands/{id}` | Termine le workspace |
| `GET` | `/health` | Healthcheck (existant, inchangé) |

## Différences MCP Kali vs OpenHands Runtime

| Aspect | MCP Kali (avant) | OpenHands Runtime (après) |
|--------|------------------|---------------------------|
| Protocole | JSON-RPC via MCP (port 8090) | HTTP REST + SSE (port 8000) |
| Cycle de vie | 1 conteneur long-lived | Workspaces éphémères à la demande |
| Streaming | Polling ou callback MCP | SSE natif (`GET /openhands/stream/{id}`) |
| Image | `bjhunt-kali:latest` (~3 Go) | `bjhunt-kali:latest` (identique) |
| Abstraction | `kali-mcp-server.cjs` (Node) | `openhands_runtime.py` (Python) |
| Sécurité | Guard `.cjs` hooks | `EnsembleSecurityAnalyzer` (Pattern + Policy + LLM) |
| Fallback | N/A | Docker direct via `WorkspacePool` |

## Stratégie de migration

### Phase 1 — Coexistence (actuelle)
- Les deux modes (`sandbox` et `openhands`) cohabitent
- `BJHUNT_RUNTIME_MODE=sandbox` par défaut (aucun changement pour les appels existants)
- Nouveaux appels peuvent utiliser `mode="openhands"` explicitement

### Phase 2 — Bascule progressive
- Migrer les workflows non-critiques vers `openhands` un par un
- Valider que les temps de réponse et la fiabilité sont équivalents
- Utiliser le SSE streaming pour les jobs longs

### Phase 3 — OpenHands par défaut
- `BJHUNT_RUNTIME_MODE=openhands` dans les déploiements
- Garder le mode `sandbox` comme fallback en cas de problème OpenHands SDK
- Le fallback Docker direct est automatique si `openhands-ai` n'est pas installé

### Phase 4 — Dépréciation MCP
- Supprimer `kali-mcp-server.cjs` et le port 8090
- Supprimer les références MCP dans `engine-process.ts`
- Nettoyer le Dockerfile Kali des dépendances Node/MCP

## Fallback plan

Si OpenHands SDK n'est pas disponible (import échoue) :

```
openhands_runtime.py
  ├── try: from openhands.runtime import create_runtime
  │   └── success → utiliser SDK OpenHands
  └── except ImportError:
      └── fallback → WorkspacePool (docker exec direct)
```

Le fallback est **transparent** : les mêmes endpoints `/openhands/*` fonctionnent,
mais utilisent `docker exec` en interne au lieu du SDK OpenHands.

## Variables d'environnement

| Variable | Défaut | Description |
|----------|--------|-------------|
| `BJHUNT_RUNTIME_MODE` | `sandbox` | Mode d'exécution : `sandbox` ou `openhands` |
| `BJHUNT_SANDBOX_URL` | `http://bjhunt-sandbox:8000` | URL du service sandbox |
| `OPENHANDS_SANDBOX_TYPE` | `docker` | Type de sandbox OpenHands |
| `SANDBOX_IMAGE` | `bjhunt-sandbox:latest` | Image Docker pour les workspaces |

## Fichiers concernés

| Fichier | Action |
|---------|--------|
| `bjhunt-sandbox/sandbox/runtime/__init__.py` | Créé |
| `bjhunt-sandbox/sandbox/runtime/openhands_runtime.py` | Créé |
| `bjhunt-sandbox/sandbox/main.py` | Modifié (+5 endpoints OpenHands) |
| `bjhunt-orchestrator/orchestrator/nodes/tool_executor.py` | Modifié (+mode openhands) |
