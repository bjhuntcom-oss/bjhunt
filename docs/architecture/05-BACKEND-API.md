# 05 — Backend API

> API Hono + Bun. Port 3001. Le cerveau de la plateforme :
> auth, RBAC, jobs, streaming relay, admin, billing.

## Stack

| Composant | Technologie | Justification |
|---|---|---|
| Runtime | Bun 1.x | Streaming natif, startup instantane, compatible Node |
| Framework | Hono v4 | Leger, streaming SSE natif, middleware modulaire |
| ORM | Drizzle | Type-safe, SQL raw quand necessaire, migrations |
| Validation | Zod | Schema-first, inference TypeScript |
| Auth | Lucia v3 | Sessions PostgreSQL, zero vendor lock |
| Queue | BullMQ | Redis-backed, priorites, concurrency control |
| Password | @node-rs/argon2 | Argon2id natif (Rust binding), rapide et sur |
| Rate limit | @upstash/ratelimit | Sliding window Redis, par IP et par user |
| Docker | dockerode | API Docker pour gestion des sandboxes |

## Structure du projet

```
backend/
├── src/
│   ├── index.ts                 # Entrypoint Hono app
│   ├── env.ts                   # Validation env vars (Zod)
│   ├── routes/
│   │   ├── auth.ts              # Register, login, logout, password reset
│   │   ├── users.ts             # Profile, settings
│   │   ├── engagements.ts       # CRUD engagements, lancement
│   │   ├── stream.ts            # SSE relay vers LangGraph
│   │   ├── api-keys.ts          # Gestion API keys
│   │   ├── admin/
│   │   │   ├── users.ts         # Admin CRUD users
│   │   │   ├── settings.ts      # Platform settings
│   │   │   ├── agents.ts        # Agent monitoring
│   │   │   ├── providers.ts     # LLM provider config
│   │   │   ├── logs.ts          # Audit logs
│   │   │   └── monitoring.ts    # Health, metrics
│   │   └── health.ts            # /live, /ready, /version
│   ├── middleware/
│   │   ├── auth.ts              # Session resolution
│   │   ├── rbac.ts              # Role-based access control
│   │   ├── cors.ts              # CORS whitelist
│   │   ├── csrf.ts              # CSRF origin check
│   │   ├── rate-limit.ts        # Rate limiting Redis
│   │   └── request-id.ts        # X-Request-ID generation
│   ├── services/
│   │   ├── auth.service.ts      # Business logic auth
│   │   ├── engagement.service.ts # Business logic engagements
│   │   ├── sandbox.service.ts   # Docker container lifecycle
│   │   ├── stream.service.ts    # LangGraph stream relay
│   │   └── audit-log.service.ts # Logging actions sensibles
│   ├── db/
│   │   ├── index.ts             # Drizzle connection
│   │   ├── schema.ts            # Tables definition
│   │   └── migrations/          # SQL migrations
│   ├── workers/
│   │   ├── audit.worker.ts      # BullMQ worker pour audits
│   │   └── cleanup.worker.ts    # Nettoyage containers orphelins
│   └── lib/
│       ├── docker.ts            # dockerode wrapper
│       ├── redis.ts             # Redis connection
│       ├── crypto.ts            # Argon2id, AES-256-GCM, tokens
│       └── errors.ts            # Error types standardises
├── drizzle.config.ts            # Config Drizzle
├── package.json
├── tsconfig.json
├── Dockerfile
└── .env.example
```

## Routes API

### Auth (`/api/auth/*`)

| Method | Path | Body | Response | Auth | Rate limit |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | `{ email, password, name }` | `{ user, session }` | Non | 5/min/IP |
| POST | `/api/auth/login` | `{ email, password }` | `{ user, session }` | Non | 10/min/IP |
| POST | `/api/auth/logout` | - | `204` | Oui | - |
| POST | `/api/auth/forgot-password` | `{ email }` | `204` (always) | Non | 3/min/IP |
| POST | `/api/auth/reset-password` | `{ token, password }` | `{ user, session }` | Non | 5/min/IP |
| GET | `/api/auth/me` | - | `{ user }` | Oui | 60/min |

### Users (`/api/users/*`)

| Method | Path | Body | Response | Auth | Role |
|---|---|---|---|---|---|
| GET | `/api/users/profile` | - | `{ user }` | Oui | user |
| PATCH | `/api/users/profile` | `{ name?, email? }` | `{ user }` | Oui | user |
| PATCH | `/api/users/password` | `{ current, new }` | `204` | Oui | user |
| GET | `/api/users/settings` | - | `{ settings }` | Oui | user |
| PATCH | `/api/users/settings` | `{ key, value }` | `{ settings }` | Oui | user |

### Engagements (`/api/engagements/*`)

| Method | Path | Body | Response | Auth | Role |
|---|---|---|---|---|---|
| POST | `/api/engagements` | `{ target, scope, roe }` | `{ engagement, jobId }` | Oui | user |
| GET | `/api/engagements` | query: `page, limit, status` | `{ engagements[], total }` | Oui | user |
| GET | `/api/engagements/:id` | - | `{ engagement }` | Oui | owner |
| DELETE | `/api/engagements/:id` | - | `204` | Oui | owner |
| POST | `/api/engagements/:id/stop` | - | `204` | Oui | owner |
| GET | `/api/engagements/:id/findings` | - | `{ findings[] }` | Oui | owner |
| GET | `/api/engagements/:id/report` | - | PDF binary | Oui | owner |

### Stream (`/stream/*`)

| Method | Path | Headers | Response | Auth |
|---|---|---|---|---|
| GET | `/stream/:jobId` | `Authorization: Bearer {token}` | `text/event-stream` | Oui |
| POST | `/api/jobs/:jobId/message` | `{ content }` | `204` | Oui |

### API Keys (`/api/api-keys/*`)

| Method | Path | Body | Response | Auth | Role |
|---|---|---|---|---|---|
| POST | `/api/api-keys` | `{ name, scopes[] }` | `{ apiKey, secret }` | Oui | user |
| GET | `/api/api-keys` | - | `{ apiKeys[] }` | Oui | user |
| DELETE | `/api/api-keys/:id` | - | `204` | Oui | owner |
| POST | `/api/api-keys/:id/rotate` | - | `{ apiKey, secret }` | Oui | owner |

### Admin (`/api/admin/*`)

| Method | Path | Response | Auth | Role |
|---|---|---|---|---|
| GET | `/api/admin/users` | `{ users[], total }` | Oui | admin |
| GET | `/api/admin/users/:id` | `{ user }` | Oui | admin |
| PATCH | `/api/admin/users/:id` | `{ user }` | Oui | admin |
| DELETE | `/api/admin/users/:id` | `204` | Oui | super_admin |
| GET | `/api/admin/settings` | `{ settings }` | Oui | admin |
| PATCH | `/api/admin/settings` | `{ settings }` | Oui | super_admin |
| GET | `/api/admin/agents` | `{ agents[] }` | Oui | admin |
| GET | `/api/admin/agents/:name/status` | `{ status }` | Oui | admin |
| GET | `/api/admin/providers` | `{ providers[] }` | Oui | admin |
| PATCH | `/api/admin/providers/:id` | `{ provider }` | Oui | super_admin |
| GET | `/api/admin/logs` | `{ logs[], total }` | Oui | admin |
| GET | `/api/admin/monitoring/health` | `{ services[] }` | Oui | admin |
| GET | `/api/admin/monitoring/metrics` | `{ metrics }` | Oui | admin |
| GET | `/api/admin/monitoring/queue` | `{ queue }` | Oui | admin |

### Health (`/api/health/*`)

| Method | Path | Response | Auth |
|---|---|---|---|
| GET | `/api/health/live` | `{ status: "ok" }` | Non |
| GET | `/api/health/ready` | `{ postgres, redis, langgraph, docker }` | Non |
| GET | `/api/health/version` | `{ version, commit, build_date }` | Non |

## Middleware Stack

L'ordre des middleware est critique :

```typescript
// src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

// 1. Request ID (premier, pour le tracing)
app.use('*', requestIdMiddleware);

// 2. CORS (avant tout le reste)
app.use('*', cors({
  origin: [
    'https://bjhunt.com',
    'https://www.bjhunt.com',
    'http://localhost:3000',  // Dev only
  ],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true,
  maxAge: 86400,
}));

// 3. CSRF (origin check sur mutations)
app.use('/api/*', csrfMiddleware);

// 4. Rate limiting (par IP, avant auth)
app.use('/api/auth/*', rateLimitMiddleware({ window: 60, max: 10 }));
app.use('/api/*', rateLimitMiddleware({ window: 60, max: 100 }));

// 5. Auth resolution (extrait session du cookie/bearer)
app.use('/api/*', authResolveMiddleware);

// 6. Routes
app.route('/api/auth', authRoutes);
app.route('/api/users', userRoutes);
app.route('/api/engagements', engagementRoutes);
app.route('/api/api-keys', apiKeyRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/health', healthRoutes);
app.route('/stream', streamRoutes);

export default app;
```

## Job Queue (BullMQ)

### Configuration

```typescript
// src/workers/audit.worker.ts
import { Worker, Queue } from 'bullmq';
import { redis } from '../lib/redis';

export const auditQueue = new Queue('audits', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

const worker = new Worker('audits', async (job) => {
  const { engagementId, userId, config } = job.data;

  // 1. Assigner un container du warm pool
  const container = await sandboxService.acquireFromPool();

  // 2. Demarrer le container
  await container.start();

  // 3. Creer un thread LangGraph
  const threadId = await langgraphClient.createThread();

  // 4. Mettre a jour le job avec le threadId (pour le streaming)
  await db.update(jobs).set({ threadId, status: 'running' }).where(eq(jobs.id, job.id));

  // 5. Lancer le run LangGraph (bloquant)
  const result = await langgraphClient.runAgent(threadId, config);

  // 6. Sauvegarder les resultats
  await db.update(engagements).set({
    status: 'completed',
    findings: result.findings,
    report: result.report,
  }).where(eq(engagements.id, engagementId));

  // 7. Detruire le container
  await container.stop();
  await container.remove();

  // 8. Replenish le warm pool
  await sandboxService.replenishPool();

  return { findingsCount: result.findings.length };
}, {
  connection: redis,
  concurrency: 3,  // Max 3 audits simultanes
  limiter: {
    max: 10,
    duration: 3600000,  // Max 10 audits par heure (protection)
  },
});
```

### Priorites par plan

| Plan | Priorite BullMQ | Concurrence |
|---|---|---|
| Free | 10 (basse) | Queue partagee, apres les payants |
| Starter | 5 (normale) | Queue standard |
| Pro | 1 (haute) | Passe devant les Starter et Free |
| Enterprise | 1 (haute) | Queue dediee si besoin |

## Error Handling

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

// Sous-classes
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string, limit: number) {
    super(429, 'QUOTA_EXCEEDED', `${resource} quota exceeded (limit: ${limit})`);
  }
}

export class ValidationError extends AppError {
  constructor(errors: ZodError) {
    super(400, 'VALIDATION_ERROR', 'Invalid input', errors.flatten());
  }
}
```

Format de response erreur :

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {
      "fieldErrors": {
        "target": ["Invalid URL or IP address"],
        "scope": ["At least one in-scope target required"]
      }
    }
  }
}
```

## Variables d'environnement

```bash
# .env.example

# Server
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Database
DATABASE_URL=postgresql://bjhunt:${PG_PASSWORD}@postgres:5432/bjhunt

# Redis
REDIS_URL=redis://redis:6379

# Auth
SESSION_SECRET=<random-64-chars>
PASSWORD_PEPPER=<random-32-chars>

# CORS
CORS_ORIGINS=https://bjhunt.com,https://www.bjhunt.com

# LangGraph
LANGGRAPH_URL=http://langgraph:2024

# Docker
DOCKER_SOCKET=/var/run/docker.sock
SANDBOX_IMAGE=bjhunt/kali-sandbox:latest
SANDBOX_MEMORY_LIMIT=2g
SANDBOX_CPU_LIMIT=2.0
SANDBOX_NETWORK=bjhunt-sandbox
WARM_POOL_SIZE=3
MAX_CONCURRENT_AUDITS=3

# Email (password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@bjhunt.com
SMTP_PASS=<app-password>

# Billing (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
```
