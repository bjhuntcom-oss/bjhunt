# Rapport d'étude exhaustif — Mastra Framework (TypeScript AI Agents)

> **Date de rédaction** : 13 mai 2026  
> **Versions référencées** : `@mastra/core@1.32.0` (dernier changelog mai 2026), v1 beta stable (nov. 2025).  
> **Sources** : docs.mastra.ai, GitHub mastra-ai/mastra (23.8k stars), blog, changelogs 2025–2026, guides de déploiement.

---

## Table des matières

- [A. Architecture fondamentale](#a-architecture-fondamentale)
- [B. Agents](#b-agents)
- [C. Workflows](#c-workflows)
- [D. Memory](#d-memory)
- [E. Observability](#e-observability)
- [F. RAG (Retrieval-Augmented Generation)](#f-rag-retrieval-augmented-generation)
- [G. Déploiement](#g-déploiement)
- [H. Cas d'usage cybersécurité / Pentest (BJHUNT)](#h-cas-dusage-cybersécurité--pentest-bjhunt)
- [I. Comparatifs](#i-comparatifs)
- [J. Dernières fonctionnalités (2025–2026)](#j-dernières-fonctionnalités-2025-2026)

---

## A. Architecture fondamentale

### Qu'est-ce que Mastra ?

Mastra est un framework TypeScript moderne pour construire des applications et agents alimentés par l'IA, créé par l'équipe originelle de **Gatsby** (Sam Bhagwat, Shane Thomas) sous la bannière de la nouvelle entreprise. La philosophie de Mastra est souvent résumée comme **"Prisma for AI apps"** : fournir une abstraction type-safe, modulaire et "batteries included" pour interagir avec les LLMs, tout en laissant le développeur maîtriser l'infrastructure.

**Points clés architecturaux :**
- **TypeScript-first**, strict, modern (ES2022+, `moduleResolution: bundler`).
- **Dual license** : Apache 2.0 pour le core, Mastra Enterprise License pour le code dans `ee/`.
- **Provider-agnostic** : 40+ providers via le **Model Router** (OpenAI, Anthropic, Gemini, DeepSeek, xAI, etc.).
- **Mastra core primitives** : Agents, Workflows, Memory, RAG, Tools, Evals, Observability.
- **Server natif Hono** : le framework génère un serveur HTTP Hono avec routes REST auto-générées.
- **Adapters** : Intégration avec Next.js, Express, Hono, Fastify, Koa, NestJS, Astro, SvelteKit.
- **MCP (Model Context Protocol)** : support natif pour consommer ou exposer des serveurs MCP.

### Système d'Agents

Un **Agent** Mastra est une entité autonome qui utilise un LLM + tools pour résoudre des tâches ouvertes. Il raisonne sur un objectif, choisit les outils à appeler, boucle (agentic loop) jusqu'à obtenir une réponse finale ou une condition d'arrêt.

```typescript
import { Agent } from '@mastra/core/agent'

export const agent = new Agent({
  id: 'audit-agent',
  name: 'Audit Agent',
  instructions: 'You are a security audit assistant.',
  model: 'openai/gpt-5.4',
})
```

Registration auprès de l'instance Mastra pour bénéficier du storage, logging et observability partagés :

```typescript
import { Mastra } from '@mastra/core'

export const mastra = new Mastra({
  agents: { auditAgent: agent },
})
```

### Système de Workflows

Les **Workflows** sont des graphes d'exécution déterministes définis avec `createWorkflow`, `.then()`, `.parallel()`, `.branch()`, etc.  
Ils servent quand les étapes sont connues à l'avance et nécessitent un contrôle explicite (vs. agents qui raisonnent librement).

### Memory

La **Mémoire** permet de persister l'historique des conversations, les préférences utilisateur et la mémoire sémantique à long terme. Elle repose sur des **storage adapters** (libSQL, PostgreSQL, MongoDB, Redis, Upstash, etc.) et des **vector stores** pour le RAG sémantique.

### RAG

Mastra offre un pipeline documentaire complet : chunking (stratégies multiples), embedding via le Model Router, stockage vectoriel (PgVector, Pinecone, Qdrant, MongoDB, Chroma, Upstash...) et retrieval semantique.

---

## B. Agents

### Définir un agent

```typescript
import { Agent } from '@mastra/core/agent'

const agent = new Agent({
  id: 'scanner-agent',
  name: 'Network Scanner Agent',
  instructions: `You are a cybersecurity reconnaissance agent.
    Use available tools to gather open ports and service banners.`,
  model: 'anthropic/claude-sonnet-4',
})
```

### Appeler un agent

```typescript
const agent = mastra.getAgentById('scanner-agent')

// Réponse complète
const response = await agent.generate('Scan target example.com')
console.log(response.text)

// Streaming
const stream = await agent.stream('Scan target example.com')
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk)
}
```

### Ajouter des tools à un agent

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'

const portScanTool = createTool({
  id: 'port-scan',
  description: 'Run a TCP port scan on a target',
  inputSchema: z.object({ target: z.string(), ports: z.string().optional() }),
  outputSchema: z.object({ openPorts: z.array(z.number()) }),
  execute: async ({ target, ports }) => {
    // Appel à nmap ou API interne
    return { openPorts: [80, 443] }
  },
})

const agent = new Agent({
  id: 'scanner-agent',
  tools: { portScanTool },
  model: 'openai/gpt-5.4',
})
```

### Chaîner des agents (Supervisor pattern)

Ajouté dans `@mastra/core@1.8.0`. Un agent "superviseur" délègue à des sous-agents via la propriété `agents`.

```typescript
import { Agent } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'

const reconAgent = new Agent({
  id: 'recon',
  description: 'Gathers network reconnaissance data.',
  model: 'openai/gpt-5-mini',
})

const analysisAgent = new Agent({
  id: 'analysis',
  description: 'Analyzes findings and produces a report.',
  model: 'openai/gpt-5-mini',
})

const supervisor = new Agent({
  id: 'supervisor',
  instructions: 'Coordinate reconnaissance and analysis.',
  model: 'openai/gpt-5.4',
  agents: { reconAgent, analysisAgent },
  memory: new Memory(),
})

const stream = await supervisor.stream('Audit target example.com', { maxSteps: 10 })
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk)
}
```

Hooks de délégation disponibles : `onDelegationStart`, `onDelegationComplete`, `messageFilter`, `onIterationComplete`.

### Streaming

Mastra supporte le streaming natif via Vercel AI SDK. Le stream expose :
- `textStream` : tokens texte
- `toolCalls` / `toolResults` : résultats d'outils
- `steps` : étapes du raisonnement
- `usage` : statistiques de tokens

### Gérer l'état de l'agent

Mastra ne gère pas d'état "manuel" interne arbitraire pour un agent isolé, mais l'état est externalisé via :
- **Memory** (`thread`, `resource`) pour l'historique conversationnel.
- **Workflow state** quand l'agent est utilisé dans un workflow.
- **RequestContext** pour passer des variables par requête (ex: tier utilisateur).
- **Background tasks** (v1.29+) pour la persistance des tâches longues.

---

## C. Workflows

### Définir un workflow graphé

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'

const step1 = createStep({
  id: 'scan',
  inputSchema: z.object({ target: z.string() }),
  outputSchema: z.object({ rawOutput: z.string() }),
  execute: async ({ inputData }) => {
    return { rawOutput: `Scanned ${inputData.target}` }
  },
})

const step2 = createStep({
  id: 'report',
  inputSchema: z.object({ rawOutput: z.string() }),
  outputSchema: z.object({ report: z.string() }),
  execute: async ({ inputData }) => {
    return { report: `Report: ${inputData.rawOutput}` }
  },
})

export const auditWorkflow = createWorkflow({
  id: 'audit-workflow',
  inputSchema: z.object({ target: z.string() }),
  outputSchema: z.object({ report: z.string() }),
})
  .then(step1)
  .then(step2)
  .commit()
```

### Passer des données entre steps

Le `inputSchema` d'une step doit correspondre à l'`outputSchema` de la step précédente.  
En cas de divergence de forme, utiliser `.map()` pour transformer les données :

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows'

const workflow = createWorkflow({...})
  .then(step1)
  .map(async ({ inputData }) => ({ formatted: inputData.raw.toUpperCase() }))
  .then(step2)
  .commit()
```

### Branches conditionnelles

```typescript
const workflow = createWorkflow({...})
  .then(step1)
  .branch([
    [async ({ inputData }) => inputData.severity === 'critical', criticalStep],
    [async ({ inputData }) => inputData.severity === 'high', highStep],
    [async () => true, defaultStep],
  ])
  .then(finalStep)
  .commit()
```

### Parallélisme

```typescript
const workflow = createWorkflow({...})
  .parallel([stepA, stepB, stepC])
  .then(aggregateStep)
  .commit()
```

`aggregateStep` reçoit un objet dont les clés sont les `id` des steps parallèles.

```typescript
const aggregateStep = createStep({
  id: 'aggregate',
  inputSchema: z.object({
    'step-a': z.object({ result: z.string() }),
    'step-b': z.object({ result: z.string() }),
    'step-c': z.object({ result: z.string() }),
  }),
  outputSchema: z.object({ combined: z.string() }),
  execute: async ({ inputData }) => ({
    combined: `${inputData['step-a'].result} | ${inputData['step-b'].result}`,
  }),
})
```

### Persister l'état d'un workflow

Les workflows supportent la **suspension** (`suspend()`) et la **reprise** (`resume()`). L'état est stocké sous forme de snapshot dans le storage configuré (PostgreSQL, libSQL, etc.), permettant la reprise après redémarrage du serveur.

```typescript
const approvalStep = createStep({
  id: 'approval',
  inputSchema: z.object({ requestId: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  resumeSchema: z.object({ approved: z.boolean() }),
  execute: async ({ inputData, resumeData, suspend }) => {
    const { approved } = resumeData ?? {}
    if (!approved) {
      await suspend({})
      return { approved: false }
    }
    return { approved: true }
  },
})

const run = await workflow.createRun()
const result = await run.start({ inputData: { requestId: '123' } })

if (result.status === 'suspended') {
  await run.resume({ step: approvalStep, resumeData: { approved: true } })
}
```

### Streaming de workflow

```typescript
const run = await workflow.createRun()
const stream = run.stream({ inputData: { target: 'example.com' } })

for await (const chunk of stream.fullStream) {
  console.log(chunk)
}

const result = await stream.result
```

---

## D. Memory

### `createMemory` / classe `Memory`

```typescript
import { Memory } from '@mastra/memory'
import { Agent } from '@mastra/core/agent'

const agent = new Agent({
  id: 'memory-agent',
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
})
```

### Stores supportés

| Type | Package | Usage |
|------|---------|-------|
| libSQL | `@mastra/libsql` | Développement local, embarqué |
| PostgreSQL | `@mastra/pg` | Production, SQL relationnel |
| MongoDB | `@mastra/mongodb` | NoSQL documentaire |
| Redis | `@mastra/redis` | Cache rapide |
| Upstash | `@mastra/upstash` | Serverless Redis |
| Cloudflare D1 | `@mastra/cloudflare-d1` | Edge serverless |
| DynamoDB | `@mastra/dynamodb` | AWS ecosystem |
| LanceDB | `@mastra/lance` | Local vector |
| ClickHouse | `@mastra/clickhouse` | OLAP / observabilité |

Configuration recommandée composite (production) :

```typescript
import { Mastra } from '@mastra/core'
import { MastraCompositeStore } from '@mastra/core/storage'
import { LibSQLStore } from '@mastra/libsql'
import { PostgresStore } from '@mastra/pg'
import { ClickHouseStore } from '@mastra/clickhouse'

export const mastra = new Mastra({
  storage: new MastraCompositeStore({
    id: 'composite',
    default: new LibSQLStore({ id: 'mastra', url: 'file:./mastra.db' }),
    domains: {
      memory: new PostgresStore({ id: 'memory', connectionString: process.env.DATABASE_URL }),
      observability: new ClickHouseStore({ url: process.env.CLICKHOUSE_URL }),
    },
  }),
})
```

### Mémoire à long terme (Observational Memory)

Ajouté dans `@mastra/memory@1.1.0`. Système de compression automatique de l'historique via deux agents en arrière-plan (Observer / Reflector). Quand l'historique dépasse un seuil de tokens (défaut 30 000), l'Observer compresse les messages en observations denses. Quand les observations dépassent 40 000 tokens, le Reflector les condense davantage.

```typescript
const agent = new Agent({
  id: 'long-memory-agent',
  memory: new Memory({
    options: {
      observationalMemory: true, // ou { model: 'google/gemini-2.5-flash' }
    },
  }),
})
```

### Context Window / Memory Processors

Quand la mémoire combinée dépasse la limite du modèle, des **memory processors** peuvent filtrer, tronquer ou prioriser le contenu. Le système inclut aussi :
- **Semantic recall** : recherche vectorielle sur l'historique de messages.
- **Working memory** : stockage structuré (JSON/markdown) des préférences utilisateur.

---

## E. Observability

### Tracing

Mastra utilise **OpenTelemetry**. Chaque exécution d'agent, workflow, tool ou appel LLM génère des spans hiérarchiques. Les traces capturent inputs, outputs, token usage et timing.

```typescript
import { Observability, MastraStorageExporter, SensitiveDataFilter } from '@mastra/observability'

const mastra = new Mastra({
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new MastraStorageExporter(),
          new MastraPlatformExporter(), // si MASTRA_PLATFORM_ACCESS_TOKEN
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
})
```

### Intégrations externes

- **Langfuse**, **LangSmith**, **Datadog**, **Arize** (`@mastra/arize`), et toute plateforme compatible OpenTelemetry.
- **Mastra Platform** : traces, logs et métriques hébergés (produit payant).
- **ClickHouse** / **DuckDB** : stockage OLAP pour les métriques.

### Monitoring des coûts LLM

Le `CostGuardProcessor` permet de bloquer ou avertir quand un budget est dépassé.

```typescript
import { CostGuardProcessor } from '@mastra/core/processors'

const agent = new Agent({
  id: 'budget-agent',
  inputProcessors: [
    new CostGuardProcessor({ maxCost: 5.0, scope: 'thread', window: '24h' }),
  ],
})
```

### Debugging

- **Studio** : interface locale pour tester agents, visualiser workflows, inspecter traces, exécuter des évaluations (scorers, datasets, expériences).
- **Swagger/OpenAPI** : `http://localhost:4111/swagger-ui`
- **Traces structurées** : navigation d'une métrique anormale vers la trace complète et les logs corrélés.

---

## F. RAG (Retrieval-Augmented Generation)

### Pipeline RAG complet

```typescript
import { MDocument } from '@mastra/rag'
import { PgVector } from '@mastra/pg'
import { ModelRouterEmbeddingModel } from '@mastra/core/llm'
import { embedMany } from 'ai'

// 1. Document
const doc = MDocument.fromText(`Your document text here...`)

// 2. Chunking
const chunks = await doc.chunk({ strategy: 'recursive', maxSize: 512, overlap: 50 })

// 3. Embeddings
const { embeddings } = await embedMany({
  model: new ModelRouterEmbeddingModel('openai/text-embedding-3-small'),
  values: chunks.map(c => c.text),
})

// 4. Vector store
const pgVector = new PgVector({
  id: 'pg-vector',
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
})
await pgVector.createIndex({ indexName: 'embeddings', dimension: 1536 })
await pgVector.upsert({ indexName: 'embeddings', vectors: embeddings })

// 5. Query
const results = await pgVector.query({ indexName: 'embeddings', queryVector, topK: 3 })
```

### Vector stores supportés

PgVector, Pinecone, Qdrant, MongoDB (Atlas Vector Search), Chroma, Astra, libSQL, Upstash, Cloudflare Vectorize, OpenSearch, Elasticsearch, Couchbase, LanceDB, S3 Vectors, DuckDB.

### Chunking et embedding

Stratégies : `recursive`, `character`, `token`, `markdown`, `semantic-markdown`, `html`, `json`, `latex`, `sentence`.  
Paramètres courants : `maxSize`, `overlap`, `separators`, `extract: { metadata: true }`.

### Requêtes hybrides

Mastra permet le stockage de métad riches avec les vecteurs. Faire des requêtes filtrées par métadonnées (ex: `docId`, `category`) est possible via l'option `filter` des méthodes `.query()`.

---

## G. Déploiement

### Options

1. **Mastra Server (Hono)** : généré par `mastra build`. Standalone, idéal pour le contrôle total.
2. **Web Framework** : intégration dans Next.js, Express, Hono, Astro... en utilisant les **server adapters**.
3. **Mastra Platform** : déploiement cloud managé (Observability + Studio + Server).
4. **Cloud providers** : Vercel, Netlify, Cloudflare, AWS Lambda, Azure App Services, DigitalOcean, EC2.

### Exposer les agents comme API REST

Le serveur Hono génère automatiquement :
- `POST /api/agents/:agentId/generate`
- `POST /api/agents/:agentId/stream`
- `POST /api/workflows/:workflowId/start`
- `POST /api/workflows/:workflowId/stream`
- OpenAPI auto-généré sur `/api/openapi.json`

### SSE (Server-Sent Events)

Mastra supporte le streaming SSE natif via le serveur Hono ou les adapters. Le protocole de stream emet des chunks typés : `text-delta`, `tool-call`, `tool-result`, `background-task-*`, `tripwire`, etc.

### Déployer sur Bun / Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { MastraServer } from '@mastra/hono'
import { mastra } from './mastra/index.js'

const app = new Hono()
const server = new MastraServer({ app, mastra })
await server.init()

serve({ fetch: app.fetch, port: 3000 })
```

### Temporal / Inngest (Workflow Runners)

Pour des workflows durables longue durée, Mastra peut déléguer l'exécution à **Temporal** (expérimental, v1.32+) ou **Inngest**.

---

## H. Cas d'usage cybersécurité / Pentest (BJHUNT)

### Adaptation pour BJHUNT

Mastra est **très adapté** pour un framework de pentest comme BJHUNT pour plusieurs raisons :

1. **Supervisor pattern** : un agent superviseur peut coordonner des sous-agents spécialisés (reconnaissance, scan de vulnérabilités, exploitation, reporting).
2. **Tools natifs** : il est trivial d'encapsuler des outils de sécurité (nmap, sqlmap, zap, nikto) dans des `createTool`.
3. **Human-in-the-loop** : les outils destructeurs ou coûteux peuvent exiger une approbation via `requireApproval: true` ou `suspend()`.
4. **Memory** : l'historique d'audit et les findings peuvent être persistés par thread/resource.
5. **Observability** : traces complètes pour la compliance et le debugging des chaînes d'attaque.
6. **Workflows** : les audits structurés (recon → scan → analyse → rapport) peuvent être modélisés comme des workflows graphés.

### Exemple : workflow d'audit

```typescript
import { createWorkflow, createStep } from '@mastra/core/workflows'
import { z } from 'zod'

const reconStep = createStep({
  id: 'recon',
  inputSchema: z.object({ target: z.string() }),
  outputSchema: z.object({ subdomains: z.array(z.string()) }),
  execute: async ({ inputData }) => {
    // Appel tool nmap/subfinder
    return { subdomains: [`www.${inputData.target}`] }
  },
})

const vulnScanStep = createStep({
  id: 'vuln-scan',
  inputSchema: z.object({ subdomains: z.array(z.string()) }),
  outputSchema: z.object({ findings: z.array(z.string()) }),
  execute: async ({ inputData }) => {
    // Appel tool zap/sqlmap
    return { findings: ['Open redirect on / redirect'] }
  },
})

export const pentestWorkflow = createWorkflow({
  id: 'pentest',
  inputSchema: z.object({ target: z.string() }),
  outputSchema: z.object({ findings: z.array(z.string()) }),
})
  .then(reconStep)
  .then(vulnScanStep)
  .commit()
```

### Intégrer des outils de sécurité comme tools

```typescript
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { exec } from 'child_process'
import { promisify } from 'util'
const execAsync = promisify(exec)

const nmapTool = createTool({
  id: 'nmap-scan',
  description: 'Run nmap TCP SYN scan on a target',
  inputSchema: z.object({ target: z.string(), ports: z.string().default('1-65535') }),
  outputSchema: z.object({ stdout: z.string() }),
  execute: async ({ target, ports }) => {
    const { stdout } = await execAsync(`nmap -sS -p ${ports} ${target}`)
    return { stdout }
  },
})
```

### Human-in-the-loop pour approbation

```typescript
const exploitTool = createTool({
  id: 'run-exploit',
  description: 'Run a confirmed exploit against a target',
  inputSchema: z.object({ exploitId: z.string(), target: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  requireApproval: true,
  execute: async ({ exploitId, target }) => {
    // Exécution destructive
    return { result: 'Exploit executed' }
  },
})
```

En stream, attendre le chunk `tool-call-approval` puis appeler `agent.approveToolCall({ runId })`.

---

## I. Comparatifs

| Critère | Mastra | LangGraph | Vercel AI SDK | OpenAI Assistants API | Custom framework |
|---------|--------|-----------|---------------|------------------------|------------------|
| **Langage** | TypeScript | Python (lib) + TS (langgraphjs) | TypeScript | API REST | Any |
| **Philosophie** | "Prisma for AI" — framework complet | Graphe d'état pour agents | Librairie bas niveau pour LLM/UI | SaaS closed-source | DIY |
| **Agents** | Natif, tool calling, streaming | StateGraph, nodes/edges | `generateText`, `streamText`, tools manuels | Assistants + threads | À construire |
| **Workflows** | Graphe TS natif, `.then/parallel/branch` | StateGraph très puissant | Non inclus | Non inclus | À construire |
| **Memory** | Memory class, Observational Memory, Semantic Recall | Memory checkpoints | Non inclus | Threads + messages | À construire |
| **RAG** | Pipeline documentaire intégré | Document loaders / retrievers | Embeddings via AI SDK | Files + retrieval | À construire |
| **Observability** | OpenTelemetry, Studio, evals | LangSmith (obligatoire) | Aucun natif | API logs limités | À construire |
| **Multi-agent** | Supervisor pattern natif | Multi-agent graphique | Non | Non | À construire |
| **Deployment** | Serveur Hono, adapters, platform | LangGraph Platform / self-hosted | Vercel / DIY | OpenAI cloud | À construire |
| **Human-in-the-loop** | `suspend/resume`, `requireApproval` | Interrupts | Non | Runs + requires_action | À construire |
| **Lock-in** | Open source, multi-provider | Dépend de LangChain | Dépend de Vercel ecosystem | OpenAI only | Aucun / tout |
| **Type safety** | Excellent (Zod/Valibot/ArkType natives) | Moyen en JS | Bon | Aucun (REST) | Variable |

**Verdict** :
- **Mastra** est le meilleur choix pour une équipe TypeScript voulant un framework "batteries included" avec workflows déterministes, multi-agent supervisé, mémoire avancée et observabilité intégrée.
- **LangGraph** est plus mature côté Python et plus puissant pour des graphes d'état très complexes, mais l'écosystème TS est moins riche et plus verbeux.
- **Vercel AI SDK** reste excellent pour des UIs de chat et des appels LLM simples, mais il faut reconstruire tous les primitives (workflows, memory, evals).
- **OpenAI Assistants API** est rapide à prototyper mais impose le vendor lock-in et offre peu de contrôle sur l'orchestration.

---

## J. Dernières fonctionnalités (2025–2026)

### Mastra v1 (beta → stable)
- **Nov. 2025** : v1 beta. Toutes les APIs expérimentales stabilisées (`agent.network()`, Mastra Auth, multi-engine workflows).
- **APIs finalisées** : workflows (mai 2025), evals (sept. 2025), observability (oct. 2025).

### Mastra Playground / Studio
- Interface locale pour tester agents, workflows, tools.
- Évaluation avec **scorers**, **datasets**, **experiments**.
- **Editor** : modification des prompts et tools sans redéploiement.
- Visualisation des traces et de la mémoire en temps réel.

### Mastra Cloud
- Plateforme serverless pour déployer agents et workflows (beta depuis mars 2025).
- Monitoring, traces, chat avec agents en ligne.

### Background Tasks (v1.29.0, mai 2026)
- Tâches longues non bloquantes pendant l'agentic loop.
- Streaming de progression via SSE.
- Support de la suspension/reprise des tâches de fond.

### Observational Memory (v1.1.0+)
- Compression automatique de l'historique via agents en arrière-plan.
- Réduction du context window de 5× à 40×.
- Buffering asynchrone (default-on depuis fév. 2026).

### Temporal Support (v1.32.0, mai 2026)
- Workflows Mastra exécutés sur Temporal pour résilience et longue durée.

### MCP (Model Context Protocol)
- Support complet `MCPClient` et `MCPServer`.
- Connexion à des registres tiers : Klavis, mcp.run, Composio, Smithery, Apify, Ampersand.

### Autres nouveautés récentes
- **Channels** : intégration Slack / Discord / Telegram pour les agents (avr. 2026).
- **Browser support** : agents pouvant naviguer sur le web (avr. 2026).
- **Remote filesystems** : S3, GCS, Azure pour les workspaces (avr. 2026).
- **ClickHouse observability** : stockage scalable des traces (mai 2026).
- **LSP inspection** : introspection sémantique du codebase par les agents (avr. 2026).
- **Agent approval / Human-in-the-loop** : approbation pré-exécution et suspension runtime.
- **Voice** : TTS/STT natif (`mastra/voice-openai`).
- **Auth** : Simple Auth, JWT, Clerk, Supabase, Firebase, Auth0, Okta, WorkOS, Better Auth.

### Roadmap (inférée des changelogs)
- Stabilisation de Temporal.
- Amélioration continue de l'Observational Memory (vector search interne, scopes).
- Expansion de Mastra Cloud (multi-environnements, RBAC).
- Support de modèles multimodaux accrus.

---

## Références rapides

| Ressource | URL |
|-----------|-----|
| Site officiel | https://mastra.ai |
| Documentation | https://mastra.ai/docs |
| GitHub | https://github.com/mastra-ai/mastra |
| Blog | https://mastra.ai/blog |
| Modèles supportés | https://mastra.ai/models |
| Templates | https://mastra.ai/templates |
| Livre 1 — Principles | https://mastra.ai/books/principles-of-building-ai-agents |
| Livre 2 — Patterns | https://mastra.ai/books/patterns-of-building-ai-agents |
| Discord | https://discord.gg/BTYqqHKUrf |
| X (Twitter) | https://x.com/mastra |

---
*Fin du rapport.*
