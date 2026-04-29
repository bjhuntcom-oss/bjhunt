# 08 — Déploiement & CI/CD

## État actuel (frontend uniquement)

### Pipeline GitHub Actions

`.github/workflows/ci.yml` :
- **lint** : `tsc --noEmit` (strict typecheck, échoue sur le moindre warning)
- **build** : `next build` (vérifie que la prod build passe, sans déployer)
- **security** : Gitleaks (block si secret détecté dans le diff)

Triggers : push sur `main`, pull requests vers `main`.

### Vercel auto-deploy

- Repo `bjhuntcom-oss/bjhunt` connecté au team Vercel `bjhunts-projects`
- Project `bjhunt` (URL prod : `bjhunt-bjhunts-projects.vercel.app` + custom `bjhunt.com`)
- Build command : `next build` (via `vercel-build` script qui pointe vers `next build`)
- Output dir : `.next` (auto-detected)
- Node version : auto (Vercel pinne par moteur de paquet — ici bun via `bun.lock`)
- Env vars (3 envs : Production, Preview, Development) :
  - `RESEND_API_KEY`
  - `NEXT_PUBLIC_HCAPTCHA_SITEKEY`
  - `HCAPTCHA_SECRET`

Auto-deploy comportement :
- Push sur `main` → Production deploy (avec rollback en 1 clic via dashboard)
- Push sur autre branche / PR → Preview deploy (URL unique `bjhunt-git-<branch>-bjhunts-projects.vercel.app`)

### Domaines custom

| Domaine | DNS | Type |
|---|---|---|
| `bjhunt.com` (apex) | A 76.76.21.21 (Vercel) | Production |
| `www.bjhunt.com` | CNAME `cname.vercel-dns.com` | Redirect → apex |

DNS managé chez le registrar du domaine (à confirmer — Cloudflare ou autre).

## Pipeline cible (post-rebuild backend)

### Multi-trigger

```yaml
# .github/workflows/ci.yml (évolution)
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  frontend-lint:        # tsc + next build dry-run
  frontend-test:        # bun test + Playwright e2e contre preview
  backend-lint:         # tsc + bun test backend/
  backend-test:         # integration tests contre Postgres test container
  security:             # Gitleaks + Trivy fs scan + Semgrep + CodeQL
  
  build-images:         # Si main/tag :
    needs: [..]         #   - bjhunt/backend:{sha}, bjhunt/orchestrator:{sha}, bjhunt/sandbox:{sha}
                        #   - cosign sign + push GHCR + SBOM
  
  deploy-frontend:      # Vercel auto via GitHub integration (rien à faire)
  
  deploy-backend:       # Si main + images built :
    needs: [build-images]
    steps:
      - flyctl deploy --image bjhunt/backend:{sha}
      - health check loop (30 essais x 2s)
      - on failure : flyctl rollback automatique
```

### Vercel pour le frontend
Inchangé — auto-deploy sur push main. Préviews automatiques sur PR.

### Fly.io pour le backend
Deploy via `flyctl deploy --image ghcr.io/bjhuntcom-oss/bjhunt-backend:{sha}` :
- Rolling deploy (au moins 2 instances always healthy)
- Health check `/api/health/ready` (200 OK requis avant cut-over)
- Rollback automatique si < 80% des instances passent health check après 60s
- Environnements : `production` (cdg + ams), `staging` (cdg only)

### Hetzner pour les DBs
Pas de "deploy" automatique — schéma migrations via outil dédié (ex: `dbmate`, `node-pg-migrate`, `Atlas`).

```bash
# Workflow manuel via GitHub Action (workflow_dispatch)
- name: Run migrations
  run: |
    flyctl ssh console -a bjhunt-backend -C "bunx dbmate up"
```

Migrations idempotentes, atomic, rollback-able. JAMAIS de migration destructive (DROP COLUMN, DROP TABLE) sans phase intermédiaire.

## Modèle de release

### SemVer

`vMAJOR.MINOR.PATCH`
- MAJOR : breaking API change (rare, planifié 6 mois en avance)
- MINOR : nouvelle feature compatible
- PATCH : bugfix uniquement

Tags Git → release GitHub avec changelog auto-généré (Conventional Commits).

### Cadence

- Frontend : continuous deploy sur `main` (10-30 deploys / semaine en early stage)
- Backend : continuous deploy sur `main` post-CI (5-10 deploys / semaine)
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
| **Production** | `bjhunt.com` | `api.bjhunt.com` | Hetzner cluster prod |
| **Staging** | `staging.bjhunt.com` | `staging-api.bjhunt.com` | Hetzner instance staging |
| **Preview** (Vercel) | `bjhunt-git-<branch>-...vercel.app` | (pointe vers staging API) | (mock ou staging) |
| **Local dev** | `localhost:3000` | `localhost:3001` | Postgres local Docker |

## Secrets management

### Frontend (Vercel)
- Vercel UI → Project → Environment Variables
- Sync via `vercel env pull .env.local` pour dev local

### Backend (Fly.io)
- `flyctl secrets set KEY=value -a bjhunt-backend`
- Encrypted at rest, injected as env vars at runtime
- Rotation : `flyctl secrets set KEY=newvalue` → trigger redeploy avec nouveaux secrets

### CI (GitHub Actions)
- `Settings → Secrets and variables → Actions`
- Limited to read-only build/deploy secrets : `GHCR_TOKEN`, `FLY_API_TOKEN`
- Pas de secret prod en CI sauf strict need

### Master keys
- `ENCRYPTION_KEY` (AES-GCM) : généré une fois, stocké dans Fly secret + backup hardware Yubikey du founder
- `SESSION_SECRET` : régénéré à chaque release majeure (force re-login global)
- `JWT_SIGNING_KEY` (tickets SSE) : rotation 30j, KMS-style avec clés actives + clés validées

## Observability

### Logs
- Frontend : Vercel logs (UI) + drain vers Better Stack
- Backend : Fly.io logs → drain vers Loki (Grafana Cloud)
- DBs : Postgres logs accessibles via SSH Hetzner, rotated 30j

### Metrics
- Fly.io built-in : RPS, latency p50/p95/p99, RAM, CPU per instance
- Custom : Prometheus scraped from `/metrics` endpoint backend, exporté vers Grafana Cloud
- Frontend : Vercel Analytics + PostHog funnel marketing

### Tracing
- OpenTelemetry instrumentation : Hono → orchestrator Python → DB calls
- Backend → Grafana Tempo

### Alerting
- Better Stack : uptime monitor 1min sur `/api/health/ready` → SMS + email founder
- Sentry : alerts sur error rate spike (>10% req/min)
- PagerDuty (Phase 5) : on-call rotation Enterprise tier

## Disaster recovery

| Scénario | Recovery action | RTO target |
|---|---|---|
| Vercel down | StatusPage notif, attendre fix Vercel ou switch DNS to Cloudflare Pages | 4h |
| Fly.io region cdg down | Auto-failover ams (multi-region deploy) | <5 min |
| Hetzner DB down | Restore last R2 backup vers nouvelle instance | 2h |
| Master encryption key compromise | Rotate clé + re-encrypt all data + force logout all + audit logs review | 24h |
| Repo GitHub compromis | Restore from local clones + rotate all GHA secrets | 1h |
| Domain hijack | Registrar lock + 2FA, recovery via WHOIS escalation | 24-72h |

## Runbook releases

### Release frontend (cas standard)
1. Open PR → CI passe → review → merge into `main`
2. Vercel auto-deploys → smoke test prod URL (1-2min)
3. Monitor PostHog + Sentry 30min post-deploy
4. Si problème : Vercel UI → "Promote previous deployment"

### Release backend (futur)
1. Open PR → CI green
2. Merge → CI build images + push GHCR
3. `flyctl deploy --image ghcr.io/.../backend:{sha}` automatique via GHA
4. Health check loop → si OK, traffic cut-over
5. Si KO → auto-rollback sur image précédente
6. Smoke test (post-deploy GHA job qui curl `/api/health/version`)
7. Monitor Sentry + Fly.io metrics 1h
