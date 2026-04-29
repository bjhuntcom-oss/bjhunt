# 04 — Multi-tenancy & isolation

> Comment garantir qu'un tenant ne peut JAMAIS voir/exécuter/affecter les données ou actions d'un autre tenant.

## Modèle hiérarchique

```
Organization (= tenant payant)
   │
   ├─ Users (membres avec rôles : owner, admin, operator, viewer)
   │
   └─ Engagements (= un client à auditer, une cible)
        │
        ├─ Targets (sites, IPs, domaines autorisés)
        ├─ Runs (= un audit, un thread de chat)
        │   ├─ Messages (chat history)
        │   ├─ Stream events (SSE persistés)
        │   ├─ Tool calls + results
        │   └─ Findings (vulnérabilités identifiées)
        ├─ Reports (livrables PDF/SARIF)
        └─ Sandbox snapshots (artifacts récoltés)
```

Une `Organization` correspond à un compte client BJHUNT. Un user peut appartenir à plusieurs orgs (consultant freelance qui audit pour plusieurs clients).

## Couches d'isolation (defense in depth)

### 1. Application — `withOrg(orgId, fn)` partout

Toute logique d'écriture/lecture passe obligatoirement par un wrapper qui :
1. Vérifie que `orgId` ∈ orgs autorisées de l'utilisateur courant
2. Set `app.current_org_id` dans la session Postgres
3. Exécute la callback dans ce contexte

```ts
async function withOrg<T>(orgId: string, fn: (sql: Sql) => Promise<T>): Promise<T> {
  return appSql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_org_id', ${orgId}, true)`
    return fn(tx)
  })
}
```

- `appSql` est connecté en tant que role `bjhunt_app` (NOSUPERUSER, NOBYPASSRLS) → impossible de bypass RLS
- `adminSql` est un pool séparé pour flows cross-org (login pré-session, signup, admin)
- **Règle absolue** : aucune route métier n'utilise `adminSql` après auth.

### 2. Database — Postgres Row-Level Security FORCE

```sql
-- Pour chaque table tenant-scoped
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;  -- même le owner respecte les policies

CREATE POLICY tenant_isolation ON messages
  USING (org_id = current_setting('app.current_org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.current_org_id')::uuid);

-- Grant minimal au role app
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO bjhunt_app;
```

`FORCE ROW LEVEL SECURITY` est critique : sans ça, le owner du table bypass automatiquement les policies. Avec FORCE, même `bjhunt_app` (qui n'est pas owner) est forcé.

`WITH CHECK` empêche les INSERTs/UPDATEs avec un `org_id` différent de celui en contexte.

### 3. Knowledge graph — Neo4j 1 DB par tenant

```cypher
// À la création de l'org
CREATE DATABASE org_<sanitized_uuid>;
```

Connection pool maintient un client par org actif. Pas de Cypher cross-DB pour empêcher les jointures cross-tenant accidentelles.

Un cap (max 100 DBs Neo4j Community gratuit) limite la version self-hosted — au-delà → migrer vers Neo4j Aura cluster ou retirer l'isolation par-DB et utiliser un node label `:Org_<id>` + filter dans toutes les queries (moins safe, à éviter).

### 4. Sandbox — 1 DockerWorkspace OpenHands par engagement

Chaque engagement actif = 1 conteneur Docker live :
- Lancé sur Fly.io Firecracker microVM (isolation hardware-level)
- Network namespace dédié (pas de pont vers les autres sandboxes ni le management network)
- TTL idle 30min — tué si pas d'activité (économie de coût + minimise surface)
- Volumes éphémères, snapshot upload final à Cloudflare R2 si l'audit termine
- `cap_drop: ALL`, `no-new-privileges`, user non-root, read-only rootfs (sauf `/tmp` et `/workspace`)
- Resource limits enforced : 2 vCPU, 4GB RAM, 50 PIDs, 10GB disk

```python
from openhands.sdk import DockerWorkspace, SecurityAnalyzer

workspace = DockerWorkspace(
    image='bjhunt/sandbox:latest',
    network='bjhunt-sandbox-net-isolated',
    cap_drop=['ALL'],
    security_opt=['no-new-privileges'],
    user='1000:1000',
    read_only=True,
    tmpfs={'/tmp': 'size=2G', '/workspace': 'size=10G,exec'},
    mem_limit='4g',
    pids_limit=50,
    cpu_quota=200_000,  # 2 vCPU
    labels={'org_id': org_id, 'engagement_id': eng_id},
)
```

### 5. Streaming — Redis Streams + Postgres mirror par tenant

Channel `stream:{org_id}:{run_id}` — never `stream:{run_id}*` glob. Voir [03-STREAMING.md](03-STREAMING.md) §multi-tenant.

### 6. Secrets — chiffrement at rest par tenant

Les API keys que le tenant entre (provider Anthropic perso, GitHub PAT pour scan repo privé, etc.) sont :
- Chiffrées **AES-256-GCM** avec une clé per-tenant dérivée de `KMS_MASTER_KEY` + `org_id` (HKDF)
- Stockées chiffrées en base
- Déchiffrées **uniquement** dans le contexte d'exécution de l'org propriétaire
- Masquées dans tout output SSE par un middleware `SecretRegistry` qui pattern-matche les secrets actifs avant émission

```python
class SecretRegistry:
    def __init__(self, org_id: str):
        self.secrets = decrypt_org_secrets(org_id)

    def mask_output(self, text: str) -> str:
        for key, value in self.secrets.items():
            text = text.replace(value, f'<{key}_MASKED>')
        return text
```

## Modèle RBAC

| Rôle | Peut |
|---|---|
| `org_owner` | Tout — dont gérer billing + supprimer org |
| `org_admin` | Inviter users, gérer engagements, voir all runs, voir all findings |
| `org_operator` | Lancer audits, voir ses propres runs et ceux partagés, exporter rapports |
| `org_viewer` | Lire seulement (use case : auditeur externe consulté) |

`platform_admin` (BJHUNT staff) : flag séparé sur `users.is_platform_admin`. Donne accès aux admin endpoints (logs, monitoring, gateway providers) mais **pas** aux données tenant — l'admin staff ne peut pas lire `messages.content` d'un tenant sans flag explicite "support mode" loggé.

## Quotas par tier

| Quota | Free | Pro | Enterprise |
|---|---|---|---|
| Audits / mois | 3 | 100 | Illimité |
| Audits concurrents | 1 | 5 | 50 |
| Tools / audit | 50 | 200 | 1000 |
| RAM sandbox | 1 GB | 4 GB | 16 GB |
| Audit duration max | 5 min | 30 min | 4 h |
| Custom API keys (provider personnel) | ❌ | 5 | Illimité |
| Storage (findings + reports) | 100 MB | 10 GB | Illimité |
| Retention | 7 j | 90 j | 2 ans |

Enforcement via middleware `quotaCheck(orgId, action)` qui consulte la table `quota_usage` (consume + refill cron mensuel).

## Audit logs (compliance)

Tout accès cross-org (admin staff, support) est loggé en append-only :

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
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
-- Pas de RLS — admin only, write-only via `INSERT` trigger sur tables critiques
```

Exporté quotidien vers Cloudflare R2 (immutable storage), cycle 7 ans.

## Tests d'isolation obligatoires (avant prod)

- [ ] Tenant A INSERT message avec `org_id` = B → DB rejette via WITH CHECK
- [ ] Tenant A SELECT messages → ne voit que les siens (RLS)
- [ ] Tenant A demande stream de B → 404
- [ ] Tenant A scrute admin endpoints → 403
- [ ] Sandbox A peut-il atteindre sandbox B en réseau ? `iptables`/network policy block → DROP
- [ ] Secret de A leak dans log de B ? Test SecretRegistry sur mock org
- [ ] Cypher injection via input user dans Neo4j ? Param-binding strict + tests fuzz
