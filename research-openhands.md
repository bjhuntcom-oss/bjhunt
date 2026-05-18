# Rapport exhaustif sur OpenHands (anciennement OpenDevin)

**Version référencée** : OpenHands `v1.7.0` (release du 1er mai 2026) et le **Software Agent SDK v1** (re-architecture complète).  
**Sources** : docs.openhands.dev, GitHub OpenHands/OpenHands, GitHub software-agent-sdk, paper arXiv:2511.03690v2, blog all-hands.dev.

---

## A. Architecture fondamentale

### A.1 Le "Event Stream"

Le SDK V1 repose sur un **Event Stream** immuable et typé (Pydantic) qui sert à la fois de mémoire de l'agent et de point d'intégration pour les services auxiliaires.

```
Event (base Pydantic)
├── LLMConvertibleEvent  → visibles par le LLM
│   ├── MessageEvent (user / assistant)
│   ├── ActionEvent      (tool_call + thought + security_risk)
│   ├── SystemPromptEvent
│   ├── CondensationSummaryEvent
│   └── ObservationBaseEvent
│       ├── ObservationEvent     (résultat d'outil)
│       ├── UserRejectObservation
│       └── AgentErrorEvent
└── Internal Events (NON visibles au LLM)
    ├── ConversationStateUpdateEvent
    ├── CondensationRequest / Condensation
    └── PauseEvent
```

- **Immutabilité** : le log est **append-only**.
- **Thread-safe** : mise à jour via FIFO lock + callbacks.
- **Services** (persistance, stuck detector, visualizer, secret registry) lisent le stream mais ne le mutent jamais.

### A.2 Qu'est-ce qu'un "Agent" ?

Un **Agent** est un exécuteur **stateless** de la boucle *reasoning-action*.

| Composant | Rôle |
|-----------|------|
| `Agent` | Implémentation concrète du step() executor |
| `AgentBase` | Interface abstraite |
| `AgentContext` | Container de skills, prompts, metadata |
| `Condenser` | Compression d'historique quand la fenêtre de contexte est dépassée |
| `SecurityAnalyzer` | Évaluation du risque avant exécution |

Le agent est **stateless** : il ne garde pas d'état mutable entre les `step()`. Il lit l'historique d'événements, interroge le LLM, et écrit de nouveaux événements.

### A.3 Le Runtime (Workspace / Sandbox)

Le SDK abstrait l'exécution via la classe `BaseWorkspace` :

| Type | Implémentation | Isolation | Usage |
|------|---------------|-----------|-------|
| **LocalWorkspace** | Subprocess direct | Processus | Dev, tests, CLI |
| **DockerWorkspace** | Container auto-spawné | Container | Production, code non fiable |
| **RemoteAPIWorkspace** | HTTP vers agent-server existant | Serveur distant | K8s, SaaS, multi-user |

**Fichier d'exploitation** :
- `execute_command()` → retourne `CommandResult(stdout, stderr, exit_code, timeout, duration)`.
- `file_upload()` / `file_download()` → multipart HTTP en remote, shutil en local.
- Context manager `__enter__` / `__exit__` pour le cycle de vie.

Depuis v1.7.0, le flag `SANDBOX_KVM_ENABLED` permet de passer `/dev/kvm` au container pour exécuter des VMs accélérées.

### A.4 L'AgentController (Conversation)

La **Conversation** orchestre l'agent et masque le déploiement (local vs remote) via un pattern Factory :

```python
conversation = Conversation(agent=agent, workspace=cwd)
# workspace : str  → LocalConversation (in-process)
# workspace : RemoteWorkspace → RemoteConversation (HTTP + WebSocket)
```

**Services auxiliaires de la Conversation** :
- **EventLog** : stockage append-only immuable.
- **Persistence** : sauvegarde auto avec debounce.
- **StuckDetector** : détection de boucle via sliding window.
- **Visualizer** : transformation du stream en diagrammes.
- **SecretRegistry** : stockage mémoire-only avec masquage dans les logs.

### A.5 Action vs Observation

| | Action | Observation |
|--|--------|-------------|
| **Direction** | Agent → Environnement | Environnement → Agent |
| **Représentation** | `ActionEvent` (tool_call) | `ObservationEvent` (résultat) |
| **Schéma** | Pydantic `Action` (params d'entrée) | Pydantic `Observation` (output structuré) |
| **LLM Role** | `assistant` avec `tool_calls` | `tool` |
| **Propriété visuelle** | `visualize` (Rich Text) | `to_llm_content` (list[TextContent \| ImageContent]) |

Tout outil suit strictement :  
**`Action → Executor.__call__(action) → Observation`**

---

## B. Multi-agents

### B.1 Architecture multi-agents

OpenHands V1 supporte le multi-agent via **Sub-Agent Delegation** (outil `DelegateTool`). Il n'existe pas de "ManagerAgent" hardcodé ; c'est l'agent principal qui décide de déléguer via un outil.

### B.2 Délégation

Le `DelegateTool` expose deux commandes :

1. **`spawn`** : crée des sous-agents nommés (héritent du LLM parent, workspace partagé, contexte indépendant).
2. **`delegate`** : envoie des tâches en parallèle (threads), attend la fin de tous, et retourne une observation consolidée.

```python
from openhands.tools.delegate import DelegateTool

# Agent principal
agent = Agent(llm=llm, tools=[..., Tool(name=DelegateTool.name)])

# Exemple de tool_call généré par le LLM :
# { "command": "spawn", "ids": ["research", "testing"] }
# { "command": "delegate", "tasks": { "research": "...", "testing": "..." } }
```

### B.3 Types d'agents intégrés et personnalisés

- **`explore`** : sous-agent spécialisé exploration de fichiers.
- **`bash`** : sous-agent exécution de commandes terminal.
- **Agents utilisateur** : enregistrés via `register_agent(name, factory_func, description)`.

Exemple d'enregistrement custom :

```python
from openhands.sdk.subagent import register_agent

def create_lodging_planner(llm):
    return Agent(llm=llm, tools=[], agent_context=AgentContext(
        skills=[Skill(name="lodging", content="...", trigger=None)],
        system_message_suffix="Focus only on London lodging."
    ))

register_agent("lodging_planner", create_lodging_planner, "Finds London lodging picks.")
```

### B.4 Communication inter-agents

- Les sous-agents écrivent dans leurs propres **ConversationState** / event logs.
- Le `DelegateTool` orchestre la synchronisation thread-safe et retourne les résultats consolidés au parent.
- Aucun "bus" central : chaque sous-agent est une `Conversation` isolée pilotée par le parent.

---

## C. Sandbox / CodeExecution

### C.1 Exécution sécurisée

Le SDK propose trois niveaux d'isolation :

| Mode | Isolation | Sécurité | Latence |
|------|-----------|----------|---------|
| **LocalWorkspace** | Processus hôte | Aucune (accès host complet) | Immédiate |
| **DockerWorkspace** | Container Docker | Isolation OS, réseau configurable | ~1-2s (spawn) |
| **RemoteAPIWorkspace** | Serveur distant / K8s | Conteneurisation + RBAC | Réseau |

### C.2 Docker Sandbox

Recommandé par défaut. Configuration via variables d'environnement :

```bash
export SANDBOX_VOLUMES=$PWD:/workspace:rw   # montage repo
export SANDBOX_CONTAINER_URL_PATTERN=...      # pattern d'URL
export WEB_HOST=192.168.1.100:3000            # accès remote browser
export OH_SANDBOX_USE_HOST_NETWORK=true       # host networking (v1.3.0)
export SANDBOX_KVM_ENABLED=true               # KVM dans le container (v1.7.0)
```

Images personnalisées possibles via [Custom Sandbox Guide](https://docs.openhands.dev/openhands/usage/advanced/custom-sandbox-guide).

### C.3 Gestion des fichiers dans le sandbox

- Upload : `POST /file/upload` (multipart) ou `shutil.copy()` en local.
- Download : `GET /file/download` stream ou `shutil.copy()`.
- Le workspace expose `working_dir` constant ; les outils y résolvent les chemins relatifs.

### C.4 Capture stdout/stderr

Tout outil terminal retourne un `CommandResult` structuré :

```python
class CommandResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timeout: bool
    duration: float
```

L'erreur standard est capturée intégralement et renvoyée au LLM sous forme d'`ObservationEvent`.

---

## D. Action loop

### D.1 Le cycle `step()`

```
step()
├── Pending actions ?
│   └── Exécuter et retourner
├── Condenser présent ?
│   ├── Condense → View   : utiliser pour la query LLM
│   └── Condense → Condensation : émettre event, retourner
├── Query LLM (events → messages)
│   └── Si context window exceeded → CondensationRequest
├── Parse réponse
│   ├── Tool call(s) → ActionEvent(s)
│   └── Message texte → MessageEvent
├── Vérifier confirmation policy
│   └── WAITING_FOR_CONFIRMATION → retourner
├── Exécuter outils → ObservationEvent(s)
└── Retourner
```

### D.2 Actions disponibles (built-in tools)

Le package `openhands-tools` fournit :

| Outil | Action type | Description |
|-------|-------------|-------------|
| **TerminalTool / BashTool** | `TerminalAction` | Exécution de commandes shell |
| **FileEditorTool** | `FileEditAction` | Lecture / écriture / édition de fichiers |
| **BrowserToolSet** | `BrowserAction` | Navigation web (soumis à Playwright) |
| **TaskTrackerTool** | `TaskAction` | Gestion de TODO list |
| **DelegateTool** | `DelegateAction` | Spawn / delegate sub-agents |
| **Custom tools** | `Action` (user-defined) | Pydantic + Executor |

### D.3 Décision de la prochaine action

- Le LLM reçoit l'historique filtré (`LLMConvertibleEvent` uniquement) groupé par `llm_response_id` (parallel function calling).
- Il génère soit un message texte, soit un ou plusieurs `tool_calls`.
- Le système de conversion parse les arguments JSON en instances Pydantic `Action` validées.

### D.4 Gestion des erreurs et retries

| Mécanisme | Comportement |
|-----------|-------------|
| **LLM Retry** | Backoff exponentiel sur échec de requête LLM (configurable `num_retries`) |
| **Tool Error** | Retourne `ObservationEvent` avec erreur (pas d'exception fatale) |
| **AgentErrorEvent** | Erreur scaffolding (tool call malformé, parsing JSON invalide) |
| **ConversationErrorEvent** | Erreur runtime conversation-level (non envoyée au LLM) |
| **Stuck Detector** | Détection de boucle et mise en pause automatique |

### D.5 Approbation humaine (human-in-the-loop)

Trois policies de confirmation :

```python
from openhands.sdk.security.confirmation_policy import AlwaysConfirm, NeverConfirm, ConfirmRisky

conversation.set_confirmation_policy(AlwaysConfirm())   # tout demande
conversation.set_confirmation_policy(NeverConfirm())    # autonome total
conversation.set_confirmation_policy(ConfirmRisky(threshold=SecurityRisk.HIGH))  # risque seul
```

Boucle interactive :

```python
while conversation.state.execution_status != ConversationExecutionStatus.FINISHED:
    if conversation.state.execution_status == ConversationExecutionStatus.WAITING_FOR_CONFIRMATION:
        pending = ConversationState.get_unmatched_actions(conversation.state.events)
        if not user_approve(pending):
            conversation.reject_pending_actions("User rejected")
            continue
    conversation.run()
```

---

## E. LLM Integration

### E.1 Modèles supportés

OpenHands utilise **LiteLLM** comme abstraction universelle :

- **OpenAI** (GPT-4o, GPT-5-Codex via Responses API)
- **Anthropic** (Claude Sonnet 4.1, Opus, etc.)
- **Google** (Gemini, Vertex AI)
- **Azure OpenAI**
- **Groq, OpenRouter, Moonshot, AWS Bedrock**
- **Modèles locaux** : Ollama, SGLang, vLLM, LM Studio
- **OpenHands hosted models** (cloud)

### E.2 Configuration du LLM

```python
from openhands.sdk import LLM
from pydantic import SecretStr

llm = LLM(
    model="anthropic/claude-sonnet-4-5-20250929",  # convention LiteLLM provider/model
    api_key=SecretStr("sk-ant-..."),
    base_url=None,          # optionnel (proxy personnalisé)
    temperature=0.1,
    timeout=120,
    num_retries=5,
    input_cost_per_token=0.00001,
    output_cost_per_token=0.00003,
    usage_id="agent",       # pour le telemetry
)
```

**Variables d'environnement** :

```bash
export LLM_MODEL="anthropic/claude-sonnet-4-5-20250929"
export LLM_API_KEY="sk-ant-..."
export LLM_BASE_URL=""
export LLM_TIMEOUT="120"
export LLM_NUM_RETRIES="5"
```

### E.3 Gestion de la context window

- **Condenser** : composant optionnel qui compresse l'historique quand les tokens approchent la limite. Supporte des stratégies comme l'extraction de summary ou l'oubli d'événements anciens.
- **CondensationRequest** : événement interne émis quand le LLM signale que la fenêtre est dépassée.
- Le condenser retourne soit un `View` (events condensés pour la requête), soit un `Condensation` (event de summary LLM-convertible).

### E.4 Prompting

- **System prompt** : template Jinja2 injecté via `Agent.system_prompt_filename` + `system_prompt_kwargs`.
- **AgentContext** : 
  - `skills` : prompts repo (toujours actifs) ou knowledge (triggerés par keywords).
  - `system_message_suffix` / `user_message_suffix` : append systématique.
- **Security policy** : sous-template Jinja2 embarqué dans le system prompt pour guider l'évaluation du risque (`security_risk` parameter).

---

## F. Memory

### F.1 Micro-agents (Skills)

Les **Skills** sont des blocs de mémoire / prompts spécialisés avec trois modes d'activation :

| Mode | Activation | Token Usage |
|------|-----------|-------------|
| **Always-loaded** (`trigger=None`) | Injecté dans `<REPO_CONTEXT>` au démarrage | Élevé (contenu complet à chaque tour) |
| **Trigger-loaded** (`KeywordTrigger`) | Injecté dans `<EXTRA_INFO>` quand keywords match | Modéré (uniquement au match) |
| **Progressive disclosure** (AgentSkills `SKILL.md`) | Listé dans `<available_skills>`, agent lit à la demande | Faible (description ~100 caractères) |

Format AgentSkills standard :

```yaml
---
name: rot13-encryption
description: Encrypt using ROT13.
triggers:
  - encrypt
  - decrypt
---
# Contenu complet...
```

Chargement :

```python
from openhands.sdk.context.skills import load_skills_from_dir
repo, knowledge, agent = load_skills_from_dir("/path/to/skills")
agent_context = AgentContext(skills=list(agent.values()))
```

### F.1b Mémoire publique

- Dépôt officiel de skills : `github.com/OpenHands/extensions`
- Auto-cloné dans `~/.openhands/cache/skills/` lors du premier run.
- Activation : `AgentContext(load_public_skills=True)`.

### F.2 Mémoire épisodique vs sémantique

| Type | Implémentation SDK | Description |
|------|-------------------|-------------|
| **Épisodique** | **Event Log** (append-only) | Historique exact de toutes les actions, observations, messages. C'est la "mémoire vive" de l'agent. |
| **Sémantique** | **CondensationSummaryEvent** | Résumés LLM produits par le condenser quand les événements anciens sont oubliés de la fenêtre de contexte. |
| **Procédurale** | **Skills / AGENTS.md** | Connaissances structurées (coding style, conventions) injectées via le contexte. |

L'agent n'a pas de "vector store" intégré pour la mémoire sémantique ; il se repose sur :
- Le résumé condensé dans le prompt.
- Les skills déclaratives.
- L'historique brut tant qu'il tient dans la fenêtre.

---

## G. Integration API

### G.1 Architecture du SDK

Le SDK se compose de 4 packages Python :

| Package | Rôle | Dépendance |
|---------|------|-----------|
| `openhands-sdk` | Agent, Conversation, Events, LLM, Workspace base, Security | Requis |
| `openhands-tools` | Outils natifs (bash, file_editor, browser, delegate...) | Optionnel |
| `openhands-workspace` | DockerWorkspace, RemoteAPIWorkspace | Optionnel |
| `openhands-agent-server` | FastAPI + WebSocket pour exécution distante | Optionnel |

```bash
pip install openhands-sdk openhands-tools openhands-workspace openhands-agent-server
```

### G.2 Intégration dans un backend Hono/Express

Bien que le SDK soit Python natif, on peut orchestrer OpenHands depuis un backend JS/TS via deux approches :

#### Approche 1 : Agent Server REST/WebSocket (recommandé)

Déployer `openhands-agent-server` (FastAPI) et consommer ses endpoints depuis Hono :

```typescript
// Hono proxy vers OpenHands agent-server
import { Hono } from 'hono';

const app = new Hono();

app.post('/api/agent/run', async (c) => {
  const { message, workspace } = await c.req.json();
  // POST vers http://agent-server:8000/conversations/start
  const res = await fetch('http://agent-server:8000/conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ...' },
    body: JSON.stringify({ agent_config: {...}, workspace, initial_message: message }),
  });
  const data = await res.json();
  return c.json({ conversation_id: data.id });
});

// WebSocket streaming depuis Hono (upgrade)
app.get('/api/agent/stream/:id', async (c) => {
  const id = c.req.param('id');
  const ws = new WebSocket(`ws://agent-server:8000/conversations/${id}/events`);
  // Relayer les events SSE/WebSocket vers le client
  ...
});
```

Endpoints agent-server (source) :
- REST : conversations, bash, files, events, desktop, VSCode.
- WebSocket : stream temps réel des événements.

#### Approche 2 : SDK Python embarqué (LocalConversation)

Pour un backend Python (FastAPI, Django), utiliser directement :

```python
from openhands.sdk import Agent, Conversation, LLM

conversation = Conversation(agent=agent, workspace="/workspace")
conversation.send_message("Add a healthcheck endpoint")
conversation.run()
# Lire events depuis conversation.state.events
```

### G.3 Streaming des événements

En remote via WebSocket :

```python
# côté SDK Python (client)
from openhands.sdk import Conversation, Event, LLMConvertibleEvent

def callback(event: Event):
    if isinstance(event, LLMConvertibleEvent):
        print(event.to_llm_message())

conversation = Conversation(agent=agent, callbacks=[callback])
```

En REST, le serveur agent expose les events sous forme de SSE ou WebSocket avec le protocol d'events typés.

### G.4 Pause, reprise, fork

- **Pause** : `PauseEvent` injecté dans le stream.
- **Reprise** : rechargement de `ConversationState` depuis le `persistence_dir`.
- **Fork** : `conversation.fork()` crée un nouveau branchement à partir du state existant sans contaminer l'original.

---

## H. Cas d'usage cybersécurité

### H.1 OpenHands pour le pentest ?

OpenHands **n'est pas conçu nativement pour la cybersécurité offensive**. C'est un agent de **software engineering** (Coder, refactorer, déboguer).  
Cependant, grâce à l'exécution shell sécurisée et la création d'outils personnalisés, il est possible de lui confier des **tâches de sécurité défensives** ou de reconnaissance assistée :

- **Reconnaissance** : `whois`, `nmap`, `subfinder`, etc. via BashTool.
- **Analyse de vulnérabilités** : lire du code source, exécuter `bandit`, `semgrep`.
- **Remediation** : patcher des CVEs (OpenHands a un flow dédié "Vulnerability Fixer").

**Attention** : exécuter `nmap`, `metasploit` ou des exploits depuis un agent LLM est **dangereux**. Il faut :
1. Une sandbox Docker strictement isolée (pas de `--privileged`).
2. Une confirmation policy `AlwaysConfirm()` ou `ConfirmRisky(threshold=LOW)`.
3. Des Security Analyzers adéquats.

### H.2 Agent de reconnaissance

Exemple custom tool pour whois/dns :

```python
class ReconAction(Action):
    target: str = Field(description="Domain or IP")
    tool: str = Field(default="whois", description="whois | dig | nmap")

class ReconExecutor(ToolExecutor[ReconAction, ReconObservation]):
    def __call__(self, action, conversation=None):
        cmd = f"{action.tool} {shlex.quote(action.target)}"
        result = self.terminal(TerminalAction(command=cmd))
        return ReconObservation(stdout=result.stdout, stderr=result.stderr)
```

### H.3 Capture de preuves

- **Screenshots** : BrowserToolSet peut capturer des pages web (preuves d'exploitation web).
- **Fichiers** : `FileEditorTool` écrit les outputs de commandes dans des fichiers de preuves.
- **Stdout/Stderr** : toujours capturés dans `CommandResult` et persistés dans l'Event Log.

### H.4 Analyzers de sécurité défensifs

Le SDK fournit une pile **Defense-in-Depth** pour protéger l'environnement :

| Analyzer | Type | Détection |
|----------|------|-----------|
| `PatternSecurityAnalyzer` | Regex deterministic | `rm -rf`, `eval`, `curl \| sh`, etc. |
| `PolicyRailSecurityAnalyzer` | Rules composite | Fetch piped to exec, disk writes catastrophiques |
| `LLMSecurityAnalyzer` | LLM inline | Risque assigné par le modèle lui-même dans les tool calls |
| `EnsembleSecurityAnalyzer` | Agrégation | Max des risques des analyzers enfants |

```python
from openhands.sdk.security import (
    EnsembleSecurityAnalyzer, PolicyRailSecurityAnalyzer,
    PatternSecurityAnalyzer, ConfirmRisky, SecurityRisk
)

security_analyzer = EnsembleSecurityAnalyzer(analyzers=[
    PolicyRailSecurityAnalyzer(),
    PatternSecurityAnalyzer(),
])
conversation.set_security_analyzer(security_analyzer)
conversation.set_confirmation_policy(ConfirmRisky(threshold=SecurityRisk.HIGH))
```

### H.5 Hooks de sécurité

Les hooks `PreToolUse` (exit code 2 = blocage) permettent de bloquer des commandes dangereuses avant exécution :

```bash
#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""')
if [[ "$command" =~ "rm -rf" ]]; then
    echo '{"decision":"deny","reason":"rm -rf blocked"}'
    exit 2   # bloque l'exécution
fi
exit 0
```

---

## I. Comparatif

| Critère | **OpenHands** | **SWE-Agent** | **Devin** | **LangGraph** | **Custom Framework** |
|---------|--------------|---------------|-----------|---------------|----------------------|
| **Type** | Agent full-stack (code, terminal, browser) | Agent spécialisé résolution d'issues GitHub | Agent SaaS propriétaire (Cognition) | Orchestration multi-agents générique | À construire from scratch |
| **Open Source** | ✅ MIT (SDK) / source-available (Enterprise) | ✅ MIT | ❌ Propriétaire | ✅ MIT (LangChain) | Varies |
| **Sandbox natif** | ✅ Docker, Remote, Local | ✅ Docker | ✅ Cloud isolé | ❌ (à gérer soi-même) | À implémenter |
| **Multi-agents** | ✅ Sub-Agent Delegation | ❌ Single agent | ✅ Implicite (team) | ✅ Graphe stateful | À implémenter |
| **LLM Support** | 100+ via LiteLLM | OpenAI, Anthropic | Interne / Cloud | Tous (via LC) | À wrapper |
| **Event System** | ✅ Append-only Pydantic typed | Simple history list | Interne | ✅ State graph | À concevoir |
| **Tool System** | ✅ Action/Observation Pydantic + MCP | Function calling basique | Interne | LangChain tools | À concevoir |
| **Human-in-the-loop** | ✅ Confirmation policies + Security analyzers | Basique | ✅ Interface web | À implémenter | À implémenter |
| **Scalabilité** | ✅ SDK → K8s / Cloud | Bench / single task | SaaS managed | Bon | Variable |
| **Focus** | Software engineering général | SWE-bench, bug fixing | End-to-end dev | Workflow orchestration | Spécifique |
| **Mémoire** | Skills + Condenser + Public registry | Fichiers + prompt | Interne | Memory modules | Variable |

### I.1 OpenHands vs SWE-Agent
- **SWE-Agent** est optimisé pour résoudre des issues de dépôts GitHub (SWE-bench). Son cycle est : éditer → exécuter test → observer.
- **OpenHands** est plus générique : terminal, browser, file editing, multi-agents, MCP. Il peut faire du SWE-bench mais aussi explorer du web, orchestrer des sous-tâches, etc.

### I.2 OpenHands vs Devin
- **Devin** est un produit SaaS propriétaire (Cognition AI) avec une interface web riche et une exécution cloud gérée.
- **OpenHands** est l'alternative open-source la plus complète : même paradigme (session, sandbox, browser) mais entièrement contrôlable, self-hostable, et extensible via SDK.

### I.3 OpenHands vs LangGraph
- **LangGraph** est un framework d'**orchestration** de graphes d'agents stateful.
- **OpenHands** est un framework d'**exécution** d'agents de code avec sandboxing natif, outils pré-construits et sécurité intégrée.  
On peut voir OpenHands comme une **application spécialisée** qui *pourrait* être orchestrée par LangGraph, mais qui fournit déjà toute la runtime nécessaire.

### I.4 Quand choisir OpenHands ?
- Vous avez besoin d'un agent qui **écrit et exécute du code** en toute sécurité.
- Vous voulez du **sandboxing natif** (Docker, remote, local) sans le coder.
- Vous cherchez une **intégration multi-LLM** simple via LiteLLM.
- Vous voulez un framework **production-ready** avec event sourcing, sécurité, et observabilité.

---

## Références

1. **Site officiel** : https://docs.all-hands.dev / https://openhands.dev
2. **SDK Docs** : https://docs.openhands.dev/sdk
3. **GitHub principal** : https://github.com/OpenHands/OpenHands (v1.7.0)
4. **GitHub SDK** : https://github.com/OpenHands/software-agent-sdk
5. **Paper** : *The OpenHands Software Agent SDK: A Composable and Extensible Foundation for Production Agents*, arXiv:2511.03690v2 (accepté MLSys 2026)
6. **Blog** : https://www.all-hands.dev/blog
7. **AgentSkills Standard** : https://agentskills.io/specification
8. **MCP Protocol** : https://modelcontextprotocol.io/
9. **LiteLLM** : https://docs.litellm.ai/

---

*Rapport généré le 13 mai 2026, basé sur OpenHands v1.7.0 et le Software Agent SDK v1.*
