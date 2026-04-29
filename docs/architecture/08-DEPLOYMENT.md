# 08 — Déploiement & CI/CD

## État actuel (frontend uniquement)

### Pipeline GitHub Actions

`.github/workflows/ci.yml` :
- **lint** : `tsc --noEmit` (typecheck strict)
- **build** : `next build` (vérifie prod build)
- **security** : Gitleaks

Triggers : push `main`, PRs vers `main`.

### Vercel auto-deploy

- Repo `bjhuntcom-oss/bjhunt` connecté au team Vercel `bjhunts-projects`
- Push `main` → Production deploy
- Push autre branche / PR → Preview deploy
- Env vars : `RESEND_API_KEY`, `NEXT_PUBLIC_HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`

### Domaines

| Domaine | DNS | Type |
|---|---|---|
| `bjhunt.com` apex | A 76.76.21.21 (Vercel) | Production |
| `www.bjhunt.com` | CNAME `cname.vercel-dns.com` | Redirect |

## Pipeline cible (post-rebuild backend)

### Multi-job pipeline

```yaml
# .github/workflows/ci.yml (évolution)
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend-typecheck:
    # tsc + next build dry-run

  frontend-test:
    # Playwright e2e contre preview Vercel

  backend-typecheck:
    # tsc + bun test backend/

  backend-test:
    # Integration tests contre Postgres test container

  security:
    # Gitleaks + Trivy fs scan + Semgrep

  build-images:
    needs: [frontend-typecheck, backend-typecheck, backend-test, security]
    if: github.ref == 'refs/heads/main'
    # Build + push GHCR :
    #   - bjhunt/backend:{sha}
    #   - bjhunt/sandbox:{sha}
    # cosign sign + SBOM

  deploy-frontend:
    # Vercel auto via GitHub integration (rien à faire)

  deploy-backend:
    needs: [build-images]
    # flyctl deploy --image ghcr.io/bjhuntcom-oss/bjhunt-backend:{sha}
    # health check loop (30 essais x 2s)
    # on failure : flyctl rollback automatique

  smoke-test:
    needs: [deploy-frontend, deploy-backend]
    # curl /api/health/version → vérifier sha déployé
```

### Vercel pour le frontend
Inchangé — auto-deploy sur push main. Préviews automatiques sur PR.

### Fly.io pour le backend
Deploy via `flyctl deploy --image ghcr.io/bjhuntcom-oss/bjhunt-backend:{sha}` :
- Rolling deploy (au moins 2 instances always healthy)
- Health check `/api/health/ready` (200 OK requis avant cut-over)
- Rollback automatique si <80% des instances passent health check après 60s
- Environnements : `production` (cdg + ams), `staging` (cdg only)

### Hetzner pour les DBs
Pas de "deploy" automatique — schéma migrations via outil dédié.

```bash
# Workflow manuel via GitHub Action workflow_dispatch
- name: Run migrations
  run: |
    flyctl ssh console -a bjhunt-backend -C "bun run migrate up"
```

Outil migrations : **node-pg-migrate** (TS, simple, supporte rollback). Migrations idempotentes. JAMAIS de migration destructive (DROP COLUMN, DROP TABLE) sans phase intermédiaire (rename → deprecate → drop 30j plus tard).

## Modèle de release

### SemVer

`vMAJOR.MINOR.PATCH`
- MAJOR : breaking API change
- MINOR : nouvelle feature compatible
- PATCH : bugfix uniquement

Tags Git → release GitHub avec changelog auto-généré (Conventional Commits).

### Cadence
- Frontend : continuous deploy sur `main` (10-30 deploys/sem early stage)
- Backend : continuous deploy sur `main` post-CI (5-10 deploys/sem)
- Schéma migrations : 1 PR explicite par changement, review requis, déploiement contrôlé manuel

### Feature flags
Outil léger : table `feature_flags(name, enabled, percentage, allowlist_orgs)` côté backend, helpers `isEnabled(flag, ctx)` partout.

Usage :
- Nouvelle feature : flag off par défaut, rollout progressif (5% → 25% → 100%)
- Killswitch : flag pour désactiver une feature défaillante en prod sans redeploy
- A/B tests : split selon hash(org_id)

## Environnements

| Env | URL frontend | URL backend | DB |
|---|---|---|---|
| **Production** | `bjhunt.com` | `api.bjhunt.com` | Hetzner Falkenstein prod |
| **Staging** | `staging.bjhunt.com` | `staging-api.bjhunt.com` | Hetzner Falkenstein staging instance |
| **Preview** (Vercel) | `bjhunt-git-<branch>-...vercel.app` | (pointe vers staging API) | (mock ou staging) |
| **Local dev** | `localhost:3000` | `localhost:3001` | Postgres local Docker |

## Secrets management

### Frontend (Vercel)
- Vercel UI → Project → Environment Variables
- Sync local : `vercel env pull .env.local`

### Backend (Fly.io)
- `flyctl secrets set KEY=value -a bjhunt-backend`
- Encrypted at rest, injected as env vars at runtime
- Rotation : `flyctl secrets set KEY=newvalue` → trigger redeploy

### CI (GitHub Actions)
- `Settings → Secrets and variables → Actions`
- Build/deploy secrets : `GHCR_TOKEN`, `FLY_API_TOKEN`, `COSIGN_KEY`
- Pas de secret prod en CI sauf strict need

### Master keys
- `KMS_MASTER_KEY` (AES-GCM tenant secrets) : généré une fois, stocké Fly.io secrets + backup Yubikey founder
- `JWT_SIGNING_KEY` (tickets SSE) : rotation 30j, KMS-style avec clés actives + clés validées
- `SESSION_SECRET` : régénéré à chaque release majeure (force re-login global)

## Observability

### Logs
- Frontend : Vercel logs (UI) + drain vers Better Stack
- Backend : Fly.io logs → drain vers Loki (Grafana Cloud) ou Better Stack
- DBs : Postgres logs accessibles via SSH Hetzner, rotated 30j

### Metrics
- Fly.io built-in : RPS, latency p50/p95/p99, RAM, CPU per instance
- Custom : Prometheus scraped from `/metrics` endpoint backend, exporté vers Grafana Cloud
- Frontend : Vercel Analytics + PostHog funnel marketing

### Tracing
- OpenTelemetry instrumentation : Hono → orchestrator → DB calls
- Backend → Grafana Tempo (Phase 2)

### Alerting
- Better Stack : uptime monitor 1min sur `/api/health/ready` → SMS founder
- Sentry : alerts sur error rate spike (>10% req/min)
- PagerDuty (Phase 5) : on-call rotation Enterprise tier

## Disaster recovery

| Scénario | Recovery action | RTO target |
|---|---|---|
| Vercel down | StatusPage notif, attendre fix Vercel ou switch DNS to Cloudflare Pages | 4h |
| Fly.io region cdg down | Auto-failover ams (multi-region deploy) | <5 min |
| Hetzner DB down | Restore last R2 backup vers nouvelle instance | 2h |
| `KMS_MASTER_KEY` compromise | Rotate clé + re-encrypt all data + force logout all + audit logs review | 24h |
| Repo GitHub compromis | Restore from local clones + rotate all GHA secrets | 1h |
| Domain hijack | Registrar lock + 2FA, recovery via WHOIS escalation | 24-72h |
| openclaude DMCA | Switch to fallback custom orchestrator (préparé) | 1 sem |

## Runbook releases

### Release frontend (cas standard)
1. Open PR → CI passe → review → merge into `main`
2. Vercel auto-deploys → smoke test prod URL (1-2 min)
3. Monitor PostHog + Sentry 30 min post-deploy
4. Si problème : Vercel UI → "Promote previous deployment"

### Release backend (futur)
1. Open PR → CI green
2. Merge → CI build images + push GHCR
3. `flyctl deploy --image ghcr.io/.../backend:{sha}` automatique via GHA
4. Health check loop → si OK, traffic cut-over
5. Si KO → auto-rollback sur image précédente
6. Smoke test (post-deploy GHA job qui curl `/api/health/version`)
7. Monitor Sentry + Fly.io metrics 1h
