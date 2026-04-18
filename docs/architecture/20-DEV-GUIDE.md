# 20 — Developer Guide

> Onboarding, setup local, conventions, workflow de developpement.

## Prerequis

| Outil | Version | Installation |
|---|---|---|
| Bun | >= 1.0 | https://bun.sh |
| Docker | >= 24 | https://docs.docker.com/get-docker/ |
| Docker Compose | >= 2.20 | Inclus avec Docker Desktop |
| Git | >= 2.40 | https://git-scm.com |
| Node.js | >= 22 | Optionnel (Bun suffit, mais certains outils l'utilisent) |
| Python | >= 3.13 | Pour le moteur Decepticon |

## Setup local

### 1. Cloner le repo

```bash
git clone https://github.com/bjhuntcom-oss/bjhunt.git
cd bjhunt
```

### 2. Installer les dependances

```bash
# Frontend
bun install

# Backend
cd backend
bun install
cd ..

# Engine (Python)
cd engine
pip install -e ".[dev]"
cd ..
```

### 3. Lancer les services de dev

```bash
# PostgreSQL + Redis + Neo4j en Docker
docker compose -f docker-compose.dev.yml up -d

# Backend (avec hot reload)
cd backend
bun run dev  # Port 3001

# Frontend (avec hot reload)
bun run dev  # Port 3000

# Engine (optionnel, pour tester les agents)
cd engine
python -m langgraph serve  # Port 2024
```

### 4. Variables d'environnement (dev)

```bash
# .env.local (frontend)
BJHUNT_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001

# backend/.env (backend)
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://bjhunt:bjhunt@localhost:5432/bjhunt
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev-secret-not-for-production
PASSWORD_PEPPER=dev-pepper-not-for-production
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
CORS_ORIGINS=http://localhost:3000
LANGGRAPH_URL=http://localhost:2024
```

## Structure du projet

```
bjhunt/
├── app/                     # Next.js App Router (frontend)
├── components/              # React components
├── lib/                     # Frontend utilities
├── messages/                # i18n translations (fr.json, en.json)
├── public/                  # Static assets
├── backend/                 # Hono + Bun API
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, RBAC, CORS, rate limit
│   │   ├── services/        # Business logic
│   │   ├── db/              # Drizzle schema + migrations
│   │   ├── workers/         # BullMQ workers
│   │   └── lib/             # Utilities
│   ├── Dockerfile
│   └── package.json
├── engine/                  # Decepticon (Python)
│   ├── decepticon/          # Core Python code
│   ├── containers/          # Dockerfiles
│   ├── config/              # LiteLLM config
│   └── tests/               # Python tests
├── docs/
│   └── architecture/        # Ce dossier (documentation complete)
├── .github/workflows/       # CI/CD
├── docker-compose.yml       # Production
├── docker-compose.dev.yml   # Developpement local
├── Caddyfile                # Reverse proxy config
├── CLAUDE.md                # Instructions pour Claude Code
└── package.json             # Frontend dependencies
```

## Conventions

### Git

```
# Branches
main             # Production, deploie automatiquement
develop          # Integration (optionnel)
feat/xxx         # Nouvelle fonctionnalite
fix/xxx          # Bug fix
chore/xxx        # Maintenance

# Commits (Conventional Commits)
feat: add user registration endpoint
fix: resolve race condition in sandbox pool
chore: update dependencies
ci: add Trivy scan to pipeline
docs: document streaming architecture
refactor: extract auth middleware

# Co-author (toujours ajouter si Claude a aide)
Co-Authored-By: Claude <noreply@anthropic.com>
```

### TypeScript (Frontend + Backend)

```typescript
// Nommage
const userName = 'camelCase';           // Variables et fonctions
type UserProfile = {};                   // Types et interfaces
const MAX_RETRIES = 3;                   // Constantes
function getUserById() {}                // Fonctions
class AuthService {}                     // Classes

// Fichiers
user.service.ts                          // kebab-case
auth.middleware.ts
engagement.routes.ts

// Imports
import { z } from 'zod';                // External d'abord
import { Hono } from 'hono';
import { db } from '../db';              // Internal ensuite
import { AuthService } from '../services/auth.service';

// Validation (toujours Zod)
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
});

// Erreurs (classes typees)
throw new NotFoundError('User');
throw new ValidationError(zodError);
throw new ForbiddenError();

// SQL (toujours Drizzle, jamais de string interpolation)
// ❌ db.execute(`SELECT * FROM users WHERE id = '${id}'`)
// ✅ db.query.users.findFirst({ where: eq(users.id, id) })
```

### Python (Engine)

```python
# PEP 8 standard
# snake_case pour les variables et fonctions
# PascalCase pour les classes
# Type hints partout

from pydantic import BaseModel

class Finding(BaseModel):
    title: str
    severity: Literal["critical", "high", "medium", "low", "info"]
    cvss_score: float

async def scan_target(target: str, scope: Scope) -> list[Finding]:
    ...
```

## Workflow de developpement

### Ajouter une fonctionnalite

```
1. Creer une branche: git checkout -b feat/audit-report-pdf
2. Ecrire le code
3. Tester localement: bun test
4. Committer: git commit -m "feat: add PDF report generation"
5. Pousser: git push origin feat/audit-report-pdf
6. Creer une PR sur GitHub
7. CI passe (lint, test, security)
8. Code review
9. Merge dans main
10. Deploy automatique sur le VPS
```

### Ajouter une route API

```
1. Definir le schema Zod (input + output)
2. Creer le handler dans routes/
3. Ajouter le middleware (auth, rbac, rate-limit)
4. Creer le service dans services/
5. Ajouter les tests
6. Documenter dans 05-BACKEND-API.md si necessaire
```

### Ajouter un composant frontend

```
1. Creer le composant dans components/
2. Utiliser shadcn/ui comme base (npx shadcn@latest add ...)
3. Styler avec Tailwind (respecter le design system)
4. Ajouter les traductions dans messages/fr.json et en.json
5. Tester sur mobile et desktop
```

### Modifier le schema DB

```
1. Modifier backend/src/db/schema.ts
2. Generer la migration: cd backend && bunx drizzle-kit generate
3. Appliquer localement: bunx drizzle-kit migrate
4. Tester
5. La migration s'appliquera au deploy
```

## Debug

### Backend

```bash
# Logs backend
docker compose logs -f backend

# Tester un endpoint
curl -v http://localhost:3001/api/health/ready
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Redis CLI
docker exec -it bjhunt-redis redis-cli
> KEYS *
> LLEN bull:audits:wait
```

### Frontend

```bash
# Dev server avec debug
DEBUG=* bun run dev

# Verifier le build
bun run build
bun run start  # Preview du build de production
```

### Engine

```bash
# Tester un agent localement
cd engine
python -m pytest tests/ -v

# Lancer LangGraph en mode debug
LANGCHAIN_TRACING_V2=true python -m langgraph serve
```

## Tests

### Backend tests

```bash
cd backend
bun test                    # Tous les tests
bun test --watch            # Mode watch
bun test auth               # Tests filtres par pattern
```

### Frontend tests

```bash
bun test                    # Tous les tests
bun run type-check          # Type checking seul
```

### Engine tests

```bash
cd engine
python -m pytest tests/ -v
python -m pytest tests/unit/ -v --cov=decepticon
```

## Commandes utiles

```bash
# Docker
docker compose ps                    # Status des services
docker compose logs -f backend       # Logs backend
docker compose restart backend       # Restart un service
docker compose exec postgres psql -U bjhunt_admin -d bjhunt  # SQL shell
docker compose exec redis redis-cli  # Redis CLI

# Database
cd backend
bunx drizzle-kit studio              # Drizzle Studio (DB browser)
bunx drizzle-kit generate            # Generer migration
bunx drizzle-kit migrate             # Appliquer migrations

# VPS
ssh bjhunt-vps                       # Connexion VPS
ssh bjhunt-vps 'docker compose -f /opt/bjhunt/app/docker-compose.yml ps'  # Status remote
```

## Contacts

- **Repo** : https://github.com/bjhuntcom-oss/bjhunt
- **Issues** : https://github.com/bjhuntcom-oss/bjhunt/issues
- **Email** : leformateurcha@gmail.com
- **VPS** : 82.25.117.79 (SSH via port 443)
