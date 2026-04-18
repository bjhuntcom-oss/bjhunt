# 03 — OpenHands Integration

> OpenHands (ex-OpenDevin) fournit l'infrastructure multi-tenant que Decepticon n'a pas.
> On utilise OpenHands comme couche d'infrastructure, pas comme moteur de securite.

## Pourquoi OpenHands

Decepticon est le meilleur moteur de securite offensive par agents IA disponible en open-source.
Mais il lui manque tout ce qui fait une plateforme SaaS :

| Besoin SaaS | Decepticon | OpenHands |
|---|---|---|
| Multi-tenancy | Non | Oui (Cloud/Enterprise) |
| Auth / RBAC | Non | OAuth, SAML/SSO, RBAC |
| API REST | Non (API non-auth) | Production-ready |
| Web UI | Non (CLI only) | React SPA |
| Sandbox isolation | Basique (Docker) | Avance (container-per-session) |
| User management | Non | Complet |
| Billing / quotas | Non | LiteLLM spend tracking |
| Session management | Non | Event-sourced, replay |

**Strategie : prendre l'infrastructure d'OpenHands, garder les agents de Decepticon.**

## Architecture d'integration

```
┌─────────────────────────────────────────────────────────┐
│  OPENHANDS LAYER (infrastructure)                       │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Agent Server  │  │ Workspace    │  │ Secret       │  │
│  │ (FastAPI)     │  │ Manager      │  │ Registry     │  │
│  │              │  │ (Docker)     │  │ (per-tenant) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  │
│         │                 │                              │
│  ┌──────▼─────────────────▼──────────────────────────┐  │
│  │  CONVERSATION ENGINE                              │  │
│  │  Event Stream (append-only, immutable)            │  │
│  │  Context management (LLMSummarizingCondenser)     │  │
│  │  Session persistence (JSON files or PostgreSQL)   │  │
│  └──────┬────────────────────────────────────────────┘  │
│         │                                                │
│  ┌──────▼────────────────────────────────────────────┐  │
│  │  TOOL EXECUTOR (replaced with Decepticon tools)   │  │
│  │                                                    │  │
│  │  Standard OpenHands tools:                        │  │
│  │  ├── BashTool (exec)     ← KEPT, redirected to   │  │
│  │  ├── FileEditTool        ← Kali sandbox           │  │
│  │  ├── GrepTool            ←                        │  │
│  │  └── WebBrowserTool      ←                        │  │
│  │                                                    │  │
│  │  BJHUNT custom tools (from Decepticon):           │  │
│  │  ├── NmapTool            ← Typed input/output     │  │
│  │  ├── NucleiTool          ← Pydantic validation    │  │
│  │  ├── SqlmapTool          ← Structured results     │  │
│  │  ├── HydraTool           ←                        │  │
│  │  ├── BloodHoundTool      ←                        │  │
│  │  ├── SliverTool          ← C2 integration         │  │
│  │  └── ReportTool          ← Findings to PG + Neo4j │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│  DECEPTICON LAYER (domain expertise)                    │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  AGENT PROMPTS & ORCHESTRATION                   │   │
│  │                                                   │   │
│  │  Le cerveau de Decepticon :                      │   │
│  │  ├── Orchestrateur (kill chain state machine)    │   │
│  │  ├── Soundwave prompts (RoE, CONOPS, OPPLAN)    │   │
│  │  ├── Recon prompts (OSINT methodology)           │   │
│  │  ├── Exploit prompts (attack techniques)         │   │
│  │  ├── PostExploit prompts (privesc, lateral)      │   │
│  │  ├── Analyst prompts (code review, CVE)          │   │
│  │  ├── Schemas Pydantic (findings, evidence)       │   │
│  │  ├── MITRE ATT&CK mappings                      │   │
│  │  ├── Skills system (technique documents)         │   │
│  │  └── Boucle vaccinale (attack → defense → verify)│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Ce layer est PURE LOGIQUE — pas d'infrastructure.     │
│  Il definit QUOI faire, pas COMMENT l'executer.        │
└─────────────────────────────────────────────────────────┘
```

## Ce qu'on prend d'OpenHands

### 1. SDK Agent Server

Le `openhands.agent_server` (FastAPI) fournit :

- **REST API** : `/workspaces`, `/conversations`, `/conversations/{id}/messages`, `/conversations/{id}/stream`
- **WebSocket streaming** : temps reel, events types
- **Health endpoint** : `/health` avec check Docker connectivity
- **Prometheus metrics** : `/metrics`

On l'utilise tel quel comme interface entre notre backend Hono et le moteur Decepticon.

### 2. Workspace Manager

Le `openhands.workspace` gere les sandboxes :

- **DockerWorkspace** : spawn container Kali, monte le filesystem, configure les capabilities
- **Lifecycle** : create → start → execute → stop → destroy
- **Resource limits** : memory, CPU, network isolation configurable
- **Cleanup** : idle timeout, zombie container detection

### 3. Event Stream

L'architecture event-sourced d'OpenHands :

- **Append-only log** : chaque action/observation est un event immutable
- **Replay** : on peut rejouer toute une session event par event
- **Condensation** : `LLMSummarizingCondenser` reduit la context window de 2x sans perte
- **Persistence** : JSON files (dev) ou PostgreSQL (prod)

### 4. Secret Registry

Isolation des secrets par conversation :

- **Per-tenant** : les secrets d'un user ne leak jamais vers un autre
- **Output masking** : les secrets sont filtres des outputs streames
- **Rotation** : mid-conversation rotation support
- **Injection** : secrets injectes dans le sandbox via env vars securises

### 5. Security Analyzer

Couche de securite sur les actions agent :

- **Risk rating** : chaque action est classee LOW/MEDIUM/HIGH
- **Confirmation policy** : les actions HIGH demandent confirmation user
- **Configurable** : adapter les seuils pour les actions de pentest (nmap = LOW, pas HIGH)

## Ce qu'on NE prend PAS d'OpenHands

| Composant OpenHands | Pourquoi on ne le prend pas | Alternative BJHUNT |
|---|---|---|
| Agent CodeAct | Optimise pour le dev, pas la securite | Agents Decepticon (17 specialises) |
| React Frontend | On a deja notre Next.js 15 | Frontend BJHUNT existant |
| GitHub/Jira integrations | Pas pertinent pour du pentest | Integrations securite custom |
| Default sandbox image | Outils de dev, pas de securite | Image Kali Linux custom |
| MicroAgent system | Trop simple pour notre use case | LangGraph state machine |

## Integration technique

### Option A — SDK Embedding (recommande pour MVP)

On importe le SDK OpenHands dans un service Python qui tourne a cote du backend :

```python
# services/agent-orchestrator/main.py

from openhands.sdk import Agent, Conversation, Tool
from openhands.workspace import DockerWorkspace

# Definir les tools Decepticon comme tools OpenHands
class NmapTool(Tool):
    name = "nmap_scan"
    description = "Run nmap port scan against target"

    class Input(BaseModel):
        target: str
        ports: str = "-"
        scan_type: Literal["syn", "connect", "udp"] = "syn"
        scripts: bool = True

    class Output(BaseModel):
        hosts: list[dict]
        open_ports: list[dict]
        services: list[dict]
        os_detection: dict | None

    async def execute(self, input: Input, workspace: DockerWorkspace) -> Output:
        flags = {
            "syn": "-sS",
            "connect": "-sT",
            "udp": "-sU"
        }
        cmd = f"nmap {flags[input.scan_type]} -p {input.ports}"
        if input.scripts:
            cmd += " -sV -sC"
        cmd += f" {input.target} -oX /tmp/nmap_result.xml"

        result = await workspace.execute(cmd)
        # Parse XML output into structured data
        return self.parse_nmap_xml(result)

# Creer l'agent avec les prompts Decepticon
recon_agent = Agent(
    name="recon",
    system_prompt=DECEPTICON_RECON_PROMPT,  # Importe de decepticon/agents/prompts/
    tools=[NmapTool(), NucleiTool(), SubfinderTool()],
    model="anthropic/claude-sonnet-4-6",
)

# Creer la conversation (= un audit)
async def start_audit(user_id: str, target: str, scope: dict):
    workspace = DockerWorkspace(
        image="bjhunt/kali-sandbox:latest",
        memory_limit="2g",
        cpu_limit=2.0,
        network="bjhunt-sandbox",
        capabilities=["NET_RAW", "NET_ADMIN"],
    )

    conversation = Conversation(
        agent=recon_agent,
        workspace=workspace,
        metadata={"user_id": user_id, "target": target},
    )

    # Stream les events
    async for event in conversation.stream():
        yield event  # Chaque event est transmis en temps reel
```

### Option B — Remote API (recommande pour production)

On deploie OpenHands Agent Server comme service Docker separe et le backend Hono communique via HTTP :

```typescript
// backend/src/services/openhands.ts

export class OpenHandsClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://openhands-server:3000') {
    this.baseUrl = baseUrl;
  }

  async createWorkspace(config: WorkspaceConfig): Promise<string> {
    const res = await fetch(`${this.baseUrl}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: 'bjhunt/kali-sandbox:latest',
        memory_limit: '2g',
        cpu_limit: 2.0,
        network_mode: 'bjhunt-sandbox',
        capabilities: ['NET_RAW', 'NET_ADMIN'],
      }),
    });
    const { workspace_id } = await res.json();
    return workspace_id;
  }

  async startConversation(workspaceId: string, input: AuditInput): Promise<string> {
    const res = await fetch(`${this.baseUrl}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        agent: 'decepticon',
        input: input,
      }),
    });
    const { conversation_id } = await res.json();
    return conversation_id;
  }

  streamEvents(conversationId: string): ReadableStream {
    // Retourne un ReadableStream SSE qu'on peut relayer directement
    return fetch(`${this.baseUrl}/conversations/${conversationId}/stream`)
      .then(r => r.body!);
  }
}
```

## Sandbox Kali custom

Au lieu de l'image sandbox par defaut d'OpenHands (outils de dev), on utilise une image Kali custom :

```dockerfile
# containers/kali-sandbox/Dockerfile
FROM kalilinux/kali-rolling:latest

# Outils de reconnaissance
RUN apt-get update && apt-get install -y --no-install-recommends \
    nmap \
    masscan \
    subfinder \
    amass \
    dnsrecon \
    whatweb \
    wafw00f \
    && rm -rf /var/lib/apt/lists/*

# Outils d'exploitation
RUN apt-get update && apt-get install -y --no-install-recommends \
    sqlmap \
    nuclei \
    hydra \
    metasploit-framework \
    && rm -rf /var/lib/apt/lists/*

# Outils post-exploitation
RUN apt-get update && apt-get install -y --no-install-recommends \
    bloodhound \
    impacket-scripts \
    crackmapexec \
    && rm -rf /var/lib/apt/lists/*

# Outils generaux
RUN apt-get update && apt-get install -y --no-install-recommends \
    tmux \
    curl \
    wget \
    jq \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

# OpenHands agent_server embarque dans le sandbox
COPY agent_server /opt/agent_server
WORKDIR /opt/agent_server

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080
CMD ["python3", "-m", "agent_server", "--port", "8080"]
```

## Plan de migration progressive

### Phase 1 — Sans OpenHands (MVP immediat)
- Backend Hono custom avec auth, RBAC, job queue
- LangGraph Server direct (Decepticon natif)
- Docker containers Kali geres par le backend
- C'est le plan decrit dans `01-ARCHITECTURE.md`

### Phase 2 — OpenHands SDK (3-6 mois)
- Integrer `openhands.workspace` pour la gestion des sandboxes
- Utiliser le Secret Registry pour l'isolation des credentials
- Event stream pour le replay de sessions
- Garder le backend Hono pour auth/RBAC/billing

### Phase 3 — OpenHands Agent Server (6-12 mois)
- Deployer le Agent Server comme service Docker
- Deleguer toute la gestion sandbox a OpenHands
- Multi-region avec remote workspaces
- Enterprise features (SAML/SSO via OpenHands)

**L'idee est de ne pas bloquer le lancement sur l'integration OpenHands.**
Le MVP peut tourner sans, et on integre progressivement.

## Ressources

- **GitHub** : https://github.com/OpenHands/OpenHands
- **Docs** : https://docs.openhands.dev/
- **SDK** : https://docs.openhands.dev/sdk/arch/overview
- **Agent Server API** : https://docs.openhands.dev/openhands/usage/architecture/runtime
- **License** : MIT
- **Stars** : 71,400+
- **Funding** : $18.8M Series A (All-Hands-AI)
