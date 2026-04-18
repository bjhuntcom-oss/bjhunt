# 16 — CI/CD Pipeline

> GitHub Actions pour lint, test, security scan, build, deploy.
> Deux workflows : CI (sur chaque PR) et Deploy (sur merge to main).

## Workflows

### CI (`ci.yml`) — Sur chaque PR et push

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:

  # ── LINT ─────────────────────────────────────────────────
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint frontend
        run: bun run lint
        working-directory: .

      - name: Lint backend
        run: bun run lint
        working-directory: backend

      - name: Type check frontend
        run: bun run type-check
        working-directory: .

      - name: Type check backend
        run: bun run type-check
        working-directory: backend

  # ── TEST ─────────────────────────────────────────────────
  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_DB: bjhunt_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: --health-cmd "redis-cli ping" --health-interval 10s --health-timeout 5s --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Run backend tests
        run: bun test
        working-directory: backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/bjhunt_test
          REDIS_URL: redis://localhost:6379
          SESSION_SECRET: test-secret-not-for-production
          PASSWORD_PEPPER: test-pepper
          ENCRYPTION_KEY: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

      - name: Run frontend tests
        run: bun test
        working-directory: .

  # ── SECURITY SCAN ────────────────────────────────────────
  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history pour gitleaks

      # Gitleaks — detecter les secrets dans le code
      - name: Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      # Trivy — scanner les vulnerabilites des dependances
      - name: Trivy (filesystem)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          severity: CRITICAL,HIGH
          exit-code: 1
          format: table

  # ── BUILD ────────────────────────────────────────────────
  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, test, security]
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build frontend
        run: bun run build
        env:
          NEXT_PUBLIC_API_URL: https://api.bjhunt.com

      - name: Build backend Docker image
        run: docker build -t bjhunt/backend:${{ github.sha }} backend/

      - name: Build engine Docker image
        run: docker build -t bjhunt/langgraph:${{ github.sha }} -f engine/containers/langgraph/Dockerfile engine/

      # Trivy — scanner les images Docker
      - name: Trivy (backend image)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: bjhunt/backend:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1

      - name: Trivy (engine image)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: bjhunt/langgraph:${{ github.sha }}
          severity: CRITICAL,HIGH
          exit-code: 1
```

### Deploy (`deploy-vps.yml`) — Sur merge to main

```yaml
# .github/workflows/deploy-vps.yml
name: Deploy to VPS

on:
  push:
    branches: [main]
  workflow_dispatch:  # Trigger manuel

concurrency:
  group: deploy-production
  cancel-in-progress: false  # Ne JAMAIS annuler un deploiement en cours

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: 82.25.117.79
          port: 443      # sslh
          username: root
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            set -euo pipefail

            cd /opt/bjhunt/app

            # Pull les changements
            git fetch origin main
            git reset --hard origin/main

            # Rebuilder les images modifiees
            docker compose build --no-cache backend langgraph

            # Rolling restart (zero downtime)
            docker compose up -d --no-deps --remove-orphans backend
            sleep 5
            docker compose up -d --no-deps --remove-orphans langgraph

            # Health check
            for i in {1..30}; do
              if curl -sf http://localhost:3001/api/health/ready > /dev/null; then
                echo "Backend healthy"
                break
              fi
              echo "Waiting for backend... ($i/30)"
              sleep 2
            done

            # Cleanup
            docker image prune -f

            echo "Deploy complete: $(git rev-parse --short HEAD)"

      - name: Verify deployment
        run: |
          sleep 10
          STATUS=$(curl -sf https://api.bjhunt.com/api/health/version | jq -r '.commit')
          echo "Deployed commit: $STATUS"
```

## Secrets GitHub

| Secret | Description |
|---|---|
| `VPS_SSH_KEY` | Cle privee SSH pour le VPS (ed25519) |
| `GITHUB_TOKEN` | Auto-genere par GitHub Actions |

**PAS de secrets applicatifs dans GitHub** — ils sont dans `.env` sur le VPS.

## Pipeline visuel

```
PR created / Push
    │
    ├── Lint ──────┐
    ├── Test ──────┤── tous en parallele
    └── Security ──┘
          │
          ▼
        Build (si lint + test + security passent)
          │
          ▼
     Merge to main
          │
          ▼
     Deploy to VPS
          │
          ├── git pull
          ├── docker compose build
          ├── docker compose up -d (rolling)
          ├── health check
          └── cleanup images
```

## Commandes locales

```bash
# Lancer les checks localement (avant de push)
bun run lint              # ESLint
bun run type-check        # TypeScript
bun test                  # Tests unitaires

# Dans backend/
cd backend
bun run lint
bun run type-check
bun test

# Gitleaks localement
gitleaks detect --source . --verbose
```

## Pre-commit hooks (optionnel)

```bash
# .husky/pre-commit
bun run lint-staged

# .lintstagedrc.json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```
