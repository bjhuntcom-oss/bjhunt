# 04 — Multi-tenancy & isolation

> Comment garantir qu'un tenant ne peut JAMAIS voir / exécuter / affecter les données ou actions d'un autre tenant.

## Modèle hiérarchique

```
Organization (= tenant payant, 1 par contrat)
   │
   ├─ Users (membres, rôles : owner, admin, operator, viewer)
   │
   └─ Engagements (= un client à auditer, une cible)
        │
        ├─ Targets (sites, IPs, domaines autorisés via DNS TXT challenge)
        ├─ Runs (= un audit, un thread de chat)
        │   ├─ Messages (chat history)
        │   ├─ Stream events (SSE persistés 7j)
        │   ├─ Tool calls + results
        │   └─ Findings (vulnérabilités identifiées)
        ├─ Reports (PDF/SARIF/JSON livrables)
        └─ Sandbox (1 par engagement actif, TTL 30min idle)
```

Un user peut appartenir à plusieurs orgs (consultant freelance qui audit pour plusieurs clients).

## 6 couches d'isolation (defense in depth)

### 1. Application — `withOrg(orgId, fn)` partout

Toute logique d'écriture/lecture passe par un wrapper qui :
1. Vérifie que `orgId` est dans les orgs autorisées de l'utilisateur courant
2. Set `app.current_org_id` dans la session Postgres
3. Exécute la callback dans ce contexte

```ts
import postgres from 'postgres'

const appSql = postgres(env.BJHUNT_APP_DATABASE_URL, {
  // bjhunt_app role : NOSUPERUSER, NOBYPASSRLS
  user: 'bjhunt_app',
})

const adminSql = postgres(env.BJHUNT_ADMIN_DATABASE_URL, {
  // postgres role : pour login, signup, admin staff (avant set context)
})

export async function withOrg<T>(
  orgId: string,
  fn: (sql: postgres.Sql) => Promise<T>,
): Promise<T> {
  return appSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_org_id', ${orgId}, true)`
    return fn(tx)
  })
}
```

**Règles absolues** :
- Les routes métier authentifiées utilisent **uniquement** `appSql` (impossible de bypass RLS)
- `adminSql` réservé à : login, signup, password reset, platform_admin staff routes
- Tout call `appSql` hors `withOrg` = bug critique (revue de code obligatoire)

### 2. Database — Postgres Row-Level Security FORCE

```sql
-- Pour chaque table tenant-scoped
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;  -- même owner respecte les policies

CREATE POLICY tenant_isolation ON messages
  USING (org_id = current_setting('app.current_org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO bjhunt_app;
```

`FORCE ROW LEVEL SECURITY` est critique : sans ça, le owner du table bypass automatiquement les policies. Avec FORCE, même `bjhunt_app` (qui n'est pas owner) est forcé.

`WITH CHECK` empêche les INSERTs/UPDATEs avec un `org_id` différent du contexte.

**Tables RLS-scoped** :
- `users` (org_id via membership), `org_members`, `engagements`, `targets`, `runs`, `messages`, `stream_events`, `tool_calls`, `findings`, `reports`, `evidences`, `audit_logs` (read-only via app), `quota_usage`, `provider_api_keys` (chiffrées)

**Tables NON-RLS** (cross-org par nature) :
- `organizations` (lu via membership), `sessions` (clé `user_id`, pas org), `feature_flags`, `audit_logs` (write-only via trigger), `migrations_history`

### 3. Sandbox — 1 E2B sandbox par engagement actif

Chaque engagement actif = 1 sandbox E2B Firecracker live :
- Créé via `e2b.create({ template: 'bjhunt-kali', metadata: { orgId, engagementId } })`
- Network namespace dédié (E2B garantit l'isolation hardware-level)
- TTL idle 30 min — kill automatique si pas d'activité
- Volumes éphémères (montés en tmpfs)
- Snapshot upload final à Cloudflare R2 si l'audit termine
- `cap_drop: ALL` sauf `NET_RAW` (pour `nmap -sS`)
- Resource limits : 2 vCPU, 4 GB RAM, 50 PIDs, 10 GB disk

**Image** : `bjhunt/sandbox:latest` (pinned digest, signed cosign, scanned trivy)

**Lifecycle** :
```
[user envoie 1er message] → engagement.status = 'active'
                          → spawn sandbox via E2B
                          → store sandbox_id dans engagement
                          
[messages successifs]      → réutilise sandbox existant
                          
[idle 30min OR user termine] → kill sandbox via E2B
                             → engagement.status = 'idle'
                             → snapshot artifacts → R2
                             
[user reprend après idle]  → si <24h : restore sandbox snapshot
                          → si >24h : spawn fresh sandbox
```

**Pas de sandbox shared cross-engagement** même au sein d'un même tenant. Un engagement compromis ne peut pas pivoter vers un autre engagement.

### 4. LLM — SecretRegistry per-tenant + masking output

Les API keys que le tenant entre (provider Anthropic perso, GitHub PAT pour scan repo privé, AWS keys pour audit cloud, etc.) sont :

1. **Chiffrées AES-256-GCM** au repos avec une clé per-tenant dérivée HKDF de `KMS_MASTER_KEY` + `org_id`
2. **Stockées chiffrées** dans `provider_api_keys` (RLS-scoped)
3. **Déchiffrées uniquement** dans le contexte d'exécution de l'org propriétaire (jamais loggé en clair)
4. **Masquées** dans tout output SSE par un middleware `SecretRegistry` qui pattern-matche les secrets actifs avant émission

```ts
class SecretRegistry {
  constructor(private orgId: string) {}

  async load(): Promise<Map<string, string>> {
    return withOrg(this.orgId, async (sql) => {
      const rows = await sql`
        SELECT name, encrypted_value FROM provider_api_keys
        WHERE org_id = ${this.orgId}
      `
      return new Map(rows.map(r => [r.name, decrypt(r.encrypted_value, this.orgId)]))
    })
  }

  maskOutput(text: string): string {
    for (const [name, value] of this.secrets.entries()) {
      // Replace ALL occurrences (gradual reveal attack mitigation)
      text = text.replaceAll(value, `<${name}_MASKED>`)
    }
    return text
  }
}
```

Pipeline : tout event `tool_result` ou `token` passe par `secretRegistry.maskOutput()` avant `XADD` Redis.

### 5. Streaming — Redis Streams + cancel channel par tenant

Channel naming :
- Stream events : `stream:{org_id}:{run_id}`
- Cancel pub/sub : `cancel:{org_id}:{run_id}`

JAMAIS de glob `stream:*` ni de channel global `cancel:*`. Voir [03-STREAMING.md](03-STREAMING.md) §multi-tenant.

### 6. Knowledge graph — pgvector scoped par org

Au lieu de Neo4j separate-DB-per-tenant, on utilise pgvector dans Postgres avec colonne `org_id` + RLS :

```sql
CREATE TABLE attack_chain_nodes (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL,
  run_id TEXT NOT NULL,
  asset_type TEXT,
  identifier TEXT,
  metadata JSONB,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE attack_chain_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_chain_nodes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON attack_chain_nodes
  USING (org_id = current_setting('app.current_org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);
```

Bénéfices vs Neo4j :
- 1 DB technology de moins à opérer
- RLS unifié avec le reste des tables
- pgvector pour embeddings RAG sur skills + similar findings
- Cypher query → SQL recursive CTEs (suffisant pour attack chains MVP)

## Modèle RBAC

| Rôle | Peut |
|---|---|
| `org_owner` | Tout, dont gérer billing + supprimer org |
| `org_admin` | Inviter users, gérer engagements, voir all runs, voir all findings |
| `org_operator` | Lancer audits, voir ses propres runs et ceux partagés, exporter rapports |
| `org_viewer` | Lire seulement (use case : auditeur externe consulté) |

`platform_admin` (BJHUNT staff) : flag séparé sur `users.is_platform_admin`. Donne accès aux admin endpoints (logs, monitoring, gateway providers) mais **pas** aux données tenant sans flag explicite "support mode" loggé en `audit_logs`.

## Quotas par tier

| Quota | Free | Pro | Enterprise |
|---|---|---|---|
| Audits / mois | 3 | 100 | Illimité |
| Audits concurrents | 1 | 5 | 50 |
| Tools / audit | 50 | 200 | 1000 |
| RAM sandbox | 1 GB | 4 GB | 16 GB |
| Audit duration max | 5 min | 30 min | 4 h |
| Custom API keys (provider perso) | ❌ | 5 | Illimité |
| Storage (findings + reports) | 100 MB | 10 GB | Illimité |
| Retention | 7 j | 90 j | 2 ans |

Enforcement via middleware `quotaCheck(orgId, action)` qui consulte la table `quota_usage` (consume + refill cron mensuel).

## Audit logs (compliance + forensic)

Tout accès cross-org (admin staff, support) est loggé en append-only :

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  actor_role TEXT,
  org_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id TEXT,
  ip INET,
  user_agent TEXT,
  ts TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);
-- Pas de RLS — admin only, write-only via INSERT trigger sur tables critiques
-- Lecture : platform_admin uniquement, queryable via /admin/audit-logs
```

Exporté quotidien vers Cloudflare R2 (immutable storage WORM), cycle 7 ans.

## Tests d'isolation obligatoires (avant prod)

- [ ] Tenant A INSERT message avec `org_id` = B → DB rejette via WITH CHECK
- [ ] Tenant A SELECT messages → ne voit que les siens (RLS)
- [ ] Tenant A demande stream de B → 404
- [ ] Tenant A scrute admin endpoints → 403
- [ ] Sandbox A peut-il atteindre sandbox B en réseau ? Ping E2B → DROP attendu
- [ ] Secret de A leak dans log de B ? Test SecretRegistry sur mock org
- [ ] SQL injection via input user dans Postgres ? Param-binding strict (postgres.js raw template literals) + tests fuzz
- [ ] pgvector similarity search d'un tenant retourne des nodes d'un autre ? RLS doit bloquer
