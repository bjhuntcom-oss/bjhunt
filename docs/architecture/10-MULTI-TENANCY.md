# 10 — Multi-Tenancy

> Isolation complete entre utilisateurs. Chaque user ne voit que ses donnees,
> ses audits, ses findings. Aucun data leak entre tenants.

## Strategie d'isolation

BJHUNT utilise **3 couches d'isolation** :

```
┌─────────────────────────────────────────────────────────┐
│  Couche 1 — APPLICATION                                 │
│  RBAC middleware : ownership check sur chaque requete   │
│  Le code applicatif filtre par userId partout           │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Couche 2 — DATABASE                                    │
│  Row-Level Security (RLS) PostgreSQL                    │
│  Meme si le code applicatif a un bug, la DB bloque     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│  Couche 3 — INFRASTRUCTURE                              │
│  Container Docker separe par session d'audit            │
│  Reseau isole (bjhunt-sandbox)                          │
│  Secrets injectes par env vars, pas de fichiers partages│
└─────────────────────────────────────────────────────────┘
```

## Couche 1 — Application (Hono middleware)

### Ownership filter automatique

```typescript
// Chaque query user-facing filtre par userId
// C'est la premiere ligne de defense

// ❌ JAMAIS CA
const engagements = await db.query.engagements.findMany();

// ✅ TOUJOURS CA
const engagements = await db.query.engagements.findMany({
  where: eq(engagements.userId, c.get('user').id),
});
```

### Service layer pattern

```typescript
// services/engagement.service.ts
export class EngagementService {
  // Toutes les methodes prennent userId en parametre
  // Le controller passe c.get('user').id

  async list(userId: string, filters: ListFilters) {
    return db.query.engagements.findMany({
      where: and(
        eq(engagements.userId, userId),  // TOUJOURS filtrer
        filters.status ? eq(engagements.status, filters.status) : undefined,
      ),
      orderBy: desc(engagements.createdAt),
      limit: filters.limit,
      offset: filters.offset,
    });
  }

  async getById(userId: string, engagementId: string) {
    const engagement = await db.query.engagements.findFirst({
      where: and(
        eq(engagements.id, engagementId),
        eq(engagements.userId, userId),  // Ownership check
      ),
    });
    if (!engagement) throw new NotFoundError('Engagement');
    return engagement;
  }
}
```

## Couche 2 — Database (RLS PostgreSQL)

Row-Level Security est la **defense en profondeur**. Meme si le code applicatif
oublie un filtre, PostgreSQL bloque l'acces.

### Setup RLS

```sql
-- Activer RLS sur toutes les tables multi-tenant
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Policy: chaque user ne voit que ses lignes
CREATE POLICY user_isolation ON engagements
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation ON findings
    FOR ALL
    USING (
        engagement_id IN (
            SELECT id FROM engagements
            WHERE user_id = current_setting('app.current_user_id')::uuid
        )
    );

CREATE POLICY user_isolation ON api_keys
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

CREATE POLICY user_isolation ON jobs
    FOR ALL
    USING (user_id = current_setting('app.current_user_id')::uuid);

-- Role applicatif (pas superuser, donc soumis a RLS)
CREATE ROLE bjhunt_app LOGIN PASSWORD '...';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bjhunt_app;

-- Role admin (bypass RLS pour les endpoints admin)
CREATE ROLE bjhunt_admin LOGIN PASSWORD '...';
GRANT ALL ON ALL TABLES IN SCHEMA public TO bjhunt_admin;
ALTER ROLE bjhunt_admin SET row_security TO off;
-- Ou utiliser BYPASSRLS attribute
```

### Integration avec Drizzle

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Pool pour les requetes user (soumis a RLS)
const appPool = new Pool({
  connectionString: env.DATABASE_URL,
  user: 'bjhunt_app',
});

// Pool pour les requetes admin (bypass RLS)
const adminPool = new Pool({
  connectionString: env.DATABASE_URL,
  user: 'bjhunt_admin',
});

export const db = drizzle(appPool);
export const adminDb = drizzle(adminPool);

// Middleware: set le user_id courant avant chaque requete
export async function withUserContext<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await appPool.connect();
  try {
    await client.query(`SET LOCAL app.current_user_id = '${userId}'`);
    return await fn();
  } finally {
    client.release();
  }
}
```

## Couche 3 — Infrastructure (Docker)

### Container-per-session

Chaque audit tourne dans son propre container Kali :

```
User A audit → kali-sandbox-abc123 (container dedie)
User B audit → kali-sandbox-def456 (container dedie)
User C audit → kali-sandbox-ghi789 (container dedie)
```

Les containers :
- Ne partagent AUCUN filesystem
- Sont sur un reseau Docker isole (`bjhunt-sandbox`)
- N'ont PAS acces au reseau management (`bjhunt-mgmt`)
- Sont detruits apres l'audit (pas de reutilisation entre users)
- Ont des limites de ressources strictes (2GB RAM, 2 vCPU)

### Isolation reseau

```
bjhunt-mgmt (bridge)              bjhunt-sandbox (bridge, internal)
┌──────────────────┐              ┌──────────────────────┐
│ caddy            │              │                      │
│ backend          │              │ kali-sandbox-abc123  │
│ langgraph ───────┼──────────────┼── (dual-homed)      │
│ postgres         │              │ kali-sandbox-def456  │
│ redis            │              │ neo4j                │
│ litellm          │              │                      │
└──────────────────┘              └──────────────────────┘

Les sandboxes ne peuvent PAS atteindre :
- caddy (pas de sortie internet directe)
- backend (pas d'acces a l'API interne)
- postgres (pas d'acces aux donnees)
- redis (pas d'acces a la queue)
- litellm (pas d'acces aux cles LLM)

Les sandboxes PEUVENT atteindre :
- neo4j (pour le knowledge graph, via langgraph)
- internet (pour les scans, via NAT Docker)
```

### Secrets par session

```typescript
// Les credentials specifiques a un audit sont injectes par env vars
// PAS de fichier partage, PAS de volume monte

await docker.createContainer({
  Image: 'bjhunt/kali-sandbox:latest',
  Env: [
    `ENGAGEMENT_ID=${engagement.id}`,
    `THREAD_ID=${threadId}`,
    // PAS de credentials user
    // PAS de cles API
    // PAS de tokens de session
  ],
  HostConfig: {
    Memory: 2 * 1024 * 1024 * 1024,
    CpuPeriod: 100000,
    CpuQuota: 200000,
    NetworkMode: 'bjhunt-sandbox',
    SecurityOpt: ['no-new-privileges'],
    CapAdd: ['NET_RAW', 'NET_ADMIN'],
    CapDrop: ['ALL'],  // Drop tout, puis ajoute seulement ce qui est necessaire
    ReadonlyRootfs: false,  // Le sandbox a besoin d'ecrire (outils, tmp)
  },
});
```

## Quotas et limites

### Par plan

| Ressource | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Audits/mois | 1 | 10 | 50 | Illimite |
| Max concurrent | 1 (queue) | 1 | 2 | 3+ |
| Max duree audit | 30 min | 2h | 4h | 8h |
| Sandbox RAM | 1 GB | 2 GB | 2 GB | 4 GB |
| API requests/min | 10 | 50 | 100 | 500 |
| API keys | 1 | 5 | 20 | Illimite |
| Historique | 30 jours | 90 jours | 1 an | Illimite |

### Implementation des quotas

```typescript
// services/quota.service.ts
export class QuotaService {
  async checkAuditQuota(userId: string): Promise<void> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    const limits = PLAN_LIMITS[user.plan];

    // Compter les audits du mois en cours
    const monthStart = startOfMonth(new Date());
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(engagements)
      .where(and(
        eq(engagements.userId, userId),
        gte(engagements.createdAt, monthStart),
      ));

    if (count[0].count >= limits.auditsPerMonth) {
      throw new QuotaExceededError('audits', limits.auditsPerMonth);
    }

    // Verifier la concurrence
    const running = await db.select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(
        eq(jobs.userId, userId),
        eq(jobs.status, 'running'),
      ));

    if (running[0].count >= limits.maxConcurrent) {
      throw new QuotaExceededError('concurrent_audits', limits.maxConcurrent);
    }
  }
}
```

## Data lifecycle

### Retention

| Donnee | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Engagements | 30 jours | 90 jours | 1 an | Illimite |
| Findings | 30 jours | 90 jours | 1 an | Illimite |
| Audit logs | 7 jours | 30 jours | 90 jours | 1 an |
| Stream events | 24 heures | 7 jours | 30 jours | 90 jours |
| Reports PDF | 30 jours | 90 jours | 1 an | Illimite |

### Cleanup job

```typescript
// workers/cleanup.worker.ts
// Cron: tous les jours a 03:00 UTC

async function cleanupExpiredData() {
  // Pour chaque plan, supprimer les donnees expirees
  for (const [plan, retention] of Object.entries(RETENTION_POLICIES)) {
    const cutoff = subDays(new Date(), retention.engagementDays);

    await db.delete(findings)
      .where(and(
        inArray(findings.engagementId,
          db.select({ id: engagements.id }).from(engagements)
            .where(and(
              lte(engagements.createdAt, cutoff),
              eq(engagements.userId,
                db.select({ id: users.id }).from(users)
                  .where(eq(users.plan, plan))
              ),
            ))
        ),
      ));
  }
}
```

## GDPR / Data export

```
GET /api/users/export
Authorization: Bearer {session}

Response: JSON contenant toutes les donnees de l'utilisateur
- Profil
- Engagements et findings
- API keys (metadata, pas les secrets)
- Audit logs
- Settings

Format: JSON ou ZIP (si fichiers joints)
Delai: disponible sous 72h (async job)
```

## Checklist securite multi-tenant

- [ ] Toutes les queries filtrent par userId
- [ ] RLS active sur toutes les tables multi-tenant
- [ ] Containers detruits apres chaque audit (pas de reutilisation)
- [ ] Reseau sandbox isole du management
- [ ] Pas de secrets user dans les containers sandbox
- [ ] Quotas verifies avant chaque creation d'audit
- [ ] API keys hashees (SHA-256), jamais stockees en clair
- [ ] Sessions invalidees proprement a la deconnexion
- [ ] Rate limiting par IP ET par userId
- [ ] Audit logs pour toutes les actions sensibles
- [ ] Data retention automatique par plan
- [ ] Export GDPR fonctionnel
