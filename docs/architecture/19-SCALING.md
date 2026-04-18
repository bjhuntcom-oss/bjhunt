# 19 — Scaling Strategy

> Plan de croissance en 3 phases. Du VPS unique au cluster.

## Phase 1 — MVP (1-50 users)

**Duree** : Maintenant → 3-6 mois
**Infra** : VPS Hostinger KVM 8 seul
**Cout** : ~$40/mois (fixe) + LLM variable

### Architecture

```
VPS unique (8 vCPU, 32GB RAM, 400GB SSD)
├── Caddy (proxy)           ~50 MB
├── Backend (Hono+Bun)      ~200 MB
├── LangGraph (Decepticon)  ~1.5 GB
├── PostgreSQL 17            ~1.5 GB
├── Redis 7                  ~200 MB
├── Neo4j 5.24               ~1.5 GB
├── LiteLLM                  ~300 MB
├── OS + Docker              ~1.5 GB
│                            ─────────
│   Infrastructure:          ~6.8 GB
│   Disponible sandboxes:    ~25 GB
│
└── Kali Sandboxes (ephemeres)
    ├── Warm pool: 3 containers (50 MB idle chacun)
    ├── Active: max 3 simultanes (2 GB chacun)
    └── Queue BullMQ pour les autres
```

### Capacite

| Metrique | Valeur |
|---|---|
| Users totaux | 1-50 |
| Audits concurrents | 3 |
| Audits en queue | Illimite (FIFO) |
| Temps d'attente queue | ~15-30 min si plein |
| RAM utilisee (peak) | ~13 GB / 32 GB |
| CPU utilise (peak) | ~60% / 8 vCPU |
| Disque | ~50 GB / 400 GB |

### Goulots d'etranglement

1. **Concurrence sandbox** : seulement 3 a la fois
   - Mitigation : queue BullMQ avec priorites (payants d'abord)
2. **CPU pendant les scans** : nmap/nuclei sont CPU-intensifs
   - Mitigation : limites CPU par container (2 vCPU max)
3. **RAM** : 3 sandboxes x 2GB = 6GB, mais les pics peuvent etre plus hauts
   - Mitigation : OOM killer sur les containers, memory limits stricts

### Quand passer a la Phase 2

- Queue regulierement > 5 jobs en attente
- Temps d'attente moyen > 30 min
- Plaintes users sur la lenteur
- > 30 audits/jour
- RAM constamment > 80%

## Phase 2 — Growth (50-500 users)

**Duree** : 3-6 mois → 12-18 mois
**Infra** : VPS + cloud burst pour les sandboxes
**Cout** : $80-250/mois

### Architecture

```
VPS Hostinger (infra core)          Cloud (sandboxes on-demand)
┌──────────────────────┐           ┌──────────────────────────┐
│ Caddy                │           │ Fly.io Machines          │
│ Backend (Hono)       │           │                          │
│ LangGraph            │──HTTP──>  │ ┌──────────┐            │
│ PostgreSQL           │           │ │ Kali VM  │ (on-demand)│
│ Redis                │           │ └──────────┘            │
│ Neo4j                │           │ ┌──────────┐            │
│ LiteLLM              │           │ │ Kali VM  │            │
│                      │           │ └──────────┘            │
│ Kali local pool (3)  │           │ ┌──────────┐            │
│ (pour les audits     │           │ │ Kali VM  │            │
│  rapides / free tier)│           │ └──────────┘            │
└──────────────────────┘           └──────────────────────────┘
```

### Changements

1. **Fly.io Machines** pour les sandboxes cloud
   - API : `POST /v1/apps/{app}/machines` → cree une VM Firecracker
   - Demarrage : ~2-5s (Firecracker microVM)
   - Cout : ~$0.012/hr (shared-cpu-2x, 2GB RAM)
   - Auto-stop apres idle timeout

2. **Sandbox routing** dans le backend :
   ```typescript
   async function acquireSandbox(priority: 'local' | 'cloud'): Promise<Sandbox> {
     if (priority === 'local') {
       // Essayer le pool local d'abord
       const local = await localPool.acquire();
       if (local) return local;
     }
     // Fallback vers Fly.io
     return await flyClient.createMachine({
       image: 'bjhunt/kali-sandbox:latest',
       region: 'cdg',  // Paris
       config: { memory_mb: 2048, cpus: 2 },
     });
   }
   ```

3. **microsandbox** (optionnel) pour l'isolation renforcee
   - libkrun-based (KVM hardware isolation)
   - Sub-100ms startup
   - Meilleure securite que Docker

4. **Second pool Redis** pour les sessions (separer queue et cache)

### Cout estime

| Composant | Cout/mois |
|---|---|
| VPS Hostinger | $40 |
| Fly.io sandboxes (100 users x 4h/mois) | $48 |
| LLM (Anthropic/Ollama) | $100-200 |
| **Total** | **$188-288** |

### Quand passer a la Phase 3

- > 20 audits concurrents regulierement
- Fly.io costs > $200/mois
- Besoin de multi-region (latence)
- Besoin de HA (haute disponibilite)
- Clients enterprise avec SLA

## Phase 3 — Scale (500+ users)

**Duree** : 12-18 mois →
**Infra** : Cluster multi-node ou K8s manage
**Cout** : $500-2000/mois

### Option A — Multi-VPS (simple)

```
VPS 1 (Management)              VPS 2 (Sandboxes)
┌──────────────────┐           ┌──────────────────────┐
│ Caddy (LB)       │           │ Kali containers      │
│ Backend (2 inst) │──WireGuard─│ (10-20 concurrent)  │
│ LangGraph        │           │                      │
│ PostgreSQL (primary)│        │                      │
│ Redis            │           └──────────────────────┘
│ Neo4j            │
│ LiteLLM          │           VPS 3 (DB Replica)
│                  │           ┌──────────────────────┐
│                  │──Replica──│ PostgreSQL (read)     │
│                  │           │ Redis (replica)       │
└──────────────────┘           └──────────────────────┘
```

### Option B — Kubernetes (complexe mais scalable)

```
K8s Cluster (managed: GKE, EKS, ou Hetzner K8s)
├── Namespace: bjhunt-mgmt
│   ├── Deployment: backend (3 replicas, HPA)
│   ├── Deployment: langgraph (2 replicas)
│   ├── Deployment: litellm (2 replicas)
│   ├── StatefulSet: postgresql (1 primary + 1 replica)
│   ├── StatefulSet: redis (1 primary + 1 replica)
│   ├── StatefulSet: neo4j (1 instance)
│   └── Ingress: Caddy/Traefik
│
└── Namespace: bjhunt-sandbox
    └── Agent Sandbox CRDs (Kubernetes-native)
        ├── SandboxPool (warm pool: 5-10 instances)
        ├── SandboxSession (per-audit, auto-cleanup)
        └── gVisor / Kata Containers (hardware isolation)
```

### Option C — Hybrid (recommande)

Garder le VPS pour le management, K8s uniquement pour les sandboxes :

```
VPS Hostinger (management, fixe $40/mois)
├── Backend, PostgreSQL, Redis, Neo4j, LiteLLM
└── Caddy (reverse proxy)

Hetzner Cloud K8s ($60-200/mois)
└── Sandbox nodes uniquement
    ├── Node pool: 3x CX41 (4 vCPU, 16GB RAM)
    ├── Agent Sandbox CRDs
    └── Auto-scaling 1-10 nodes
```

## Resume des phases

| | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| **Users** | 1-50 | 50-500 | 500+ |
| **Infra** | VPS seul | VPS + Fly.io | Multi-VPS ou K8s |
| **Concurrence** | 3 sandboxes | 10-20 sandboxes | 50+ sandboxes |
| **Isolation** | Docker | Docker + Firecracker | gVisor/Kata |
| **Cout** | $40-100 | $150-300 | $500-2000 |
| **HA** | Non | Partielle | Oui |
| **Multi-region** | Non | Non | Optionnel |
| **Complexite** | Basse | Moyenne | Haute |

## Decision tree

```
Combien de users actifs concurrents ?
│
├── < 5 → Phase 1 (VPS seul, $40/mois)
│
├── 5-20 → Phase 2 (VPS + Fly.io, $150-300/mois)
│
└── > 20 → Phase 3
    │
    ├── Budget < $500/mois → Multi-VPS
    │
    └── Budget > $500/mois → K8s manage
```

**Principe directeur** : ne pas sur-investir en infrastructure avant d'avoir les users.
Le VPS a $40/mois suffit largement pour le MVP et les premiers mois de growth.
Scaler quand la demande l'exige, pas avant.
