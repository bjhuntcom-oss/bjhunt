# BJHUNT

> **AI-powered autonomous cybersecurity platform.** Frontend on Vercel, backend
> + 17-agent engine on a single VPS. Streams a live red-team engagement to the
> user's browser via SSE. Built on Next.js 16, Hono+Bun, and the
> [Decepticon](https://github.com/PurpleAILAB/Decepticon) (Apache-2.0) engine.

```
   ┌─────────────────┐         ┌──────────────────────────────────────┐
   │  Vercel (front) │  HTTPS  │  VPS Hostinger (Paris)               │
   │  Next.js 16     │ ──────> │  Caddy + Hono + LangGraph + Kali     │
   │  Marketing      │         │  Postgres + Redis + Neo4j + LiteLLM  │
   │  + Dashboard    │         │                                      │
   └─────────────────┘         └──────────────────────────────────────┘
```

Full architecture: [`docs/architecture/`](docs/architecture/) (21 documents).

## Quick start (local development)

```bash
# 1. Clone
git clone https://github.com/bjhuntcom-oss/bjhunt.git && cd bjhunt

# 2. Run the bootstrap script (installs deps, generates .env, starts services)
bash scripts/dev-bootstrap.sh

# 3. Open
open http://localhost:3000
```

Prerequisites: **Node 22+**, **Bun 1.x**, **Python 3.13** (for engine work),
**Docker Desktop** (for backend services), and 16GB+ RAM (engine LangGraph + Kali sandbox eat ~4GB).

## Repo layout

```
bjhunt/
├── app/                       Next.js 16 App Router (frontend)
│   ├── [locale]/              i18n routing (FR / EN)
│   │   ├── (marketing pages)
│   │   ├── (auth)
│   │   └── dashboard/         User + admin dashboard
│   ├── api/                   Edge proxy + form handlers
│   └── globals.css            Tailwind v4 + design-tokens import
│
├── backend/                   Hono + Bun API (port 3001)
│   ├── src/
│   │   ├── index.ts           Entrypoint
│   │   ├── routes/            REST + SSE handlers
│   │   ├── middleware/        auth, RBAC, CSRF, rate-limit
│   │   ├── services/          Business logic
│   │   ├── db/                Postgres schema + migrations
│   │   └── lib/               Crypto, errors, SSE transform, …
│   └── Dockerfile
│
├── engine/                    Cybersecurity engine
│   ├── decepticon/            UPSTREAM (PurpleAILAB) — never edit
│   ├── bjhunt_engine/         BJHUNT wrapper layer (W5+ deliverables)
│   ├── containers/            Kali sandbox + LangGraph Dockerfiles
│   ├── config/litellm.yaml    Multi-provider LLM router
│   └── pyproject.toml         (use `uv sync --extra openhands` for W6+)
│
├── components/                React components (chat, dashboard, ui/)
├── lib/                       Shared frontend libs (auth client, rate-limit, …)
├── hooks/                     React hooks (use-audit-stream, …)
├── i18n/                      next-intl routing config
├── messages/                  FR / EN translation files
│
├── ops/                       Operational scripts & infra config
│   ├── Caddyfile              Reverse proxy
│   ├── scripts/               install-sslh, snapshot, backup, RLS-apply, …
│   └── observability/         Prometheus + Grafana overlay (opt-in)
│
├── .github/                   CI/CD workflows + CODEOWNERS + Dependabot
├── docker-compose.yml         8-service prod stack
├── docs/architecture/         21-doc target architecture (the source of truth)
└── docs/superpowers/specs/    Refonte master roadmap + per-wave specs
```

## Development workflow

```bash
# Run the frontend in dev mode (Next.js Turbopack)
bun install && bun run dev

# Run the backend (in another terminal)
cd backend && bun install && bun run dev

# Run the engine LangGraph server (in a third terminal, requires uv + Docker)
cd engine && uv sync && uv run langgraph dev

# Run all tests
bun test                                   # frontend
cd backend && bun test                     # backend
cd engine && uv run pytest decepticon/tests/  # engine
```

## Where to learn more

| Topic                 | Document                                                |
|-----------------------|---------------------------------------------------------|
| Vision & roadmap      | [`docs/architecture/00-VISION.md`](docs/architecture/00-VISION.md) |
| Architecture overview | [`docs/architecture/01-ARCHITECTURE.md`](docs/architecture/01-ARCHITECTURE.md) |
| Streaming SSE pipeline| [`docs/architecture/02-STREAMING.md`](docs/architecture/02-STREAMING.md) |
| OpenHands integration | [`docs/architecture/03-OPENHANDS-INTEGRATION.md`](docs/architecture/03-OPENHANDS-INTEGRATION.md) |
| Decepticon engine     | [`docs/architecture/04-DECEPTICON-ENGINE.md`](docs/architecture/04-DECEPTICON-ENGINE.md) |
| Backend API spec      | [`docs/architecture/05-BACKEND-API.md`](docs/architecture/05-BACKEND-API.md) |
| Frontend stack        | [`docs/architecture/06-FRONTEND.md`](docs/architecture/06-FRONTEND.md) |
| Database schema       | [`docs/architecture/11-DATABASE-SCHEMA.md`](docs/architecture/11-DATABASE-SCHEMA.md) |
| Multi-tenancy & RLS   | [`docs/architecture/10-MULTI-TENANCY.md`](docs/architecture/10-MULTI-TENANCY.md) |
| Security model        | [`docs/architecture/14-SECURITY.md`](docs/architecture/14-SECURITY.md) |
| Deploy & VPS config   | [`docs/architecture/12-DOCKER-DEPLOYMENT.md`](docs/architecture/12-DOCKER-DEPLOYMENT.md) + [`13-VPS-CONFIG.md`](docs/architecture/13-VPS-CONFIG.md) |
| CI/CD                 | [`docs/architecture/16-CI-CD.md`](docs/architecture/16-CI-CD.md) |
| Pricing & billing     | [`docs/architecture/15-PRICING-BILLING.md`](docs/architecture/15-PRICING-BILLING.md) |
| Design system         | [`docs/architecture/17-DESIGN-SYSTEM.md`](docs/architecture/17-DESIGN-SYSTEM.md) |
| Scaling phases        | [`docs/architecture/19-SCALING.md`](docs/architecture/19-SCALING.md) |
| **Dev guide**         | [`docs/architecture/20-DEV-GUIDE.md`](docs/architecture/20-DEV-GUIDE.md) |

## Security

We take security seriously. See [`SECURITY.md`](SECURITY.md) for our
disclosure policy and SLA. **Do not** open public GitHub issues for
vulnerabilities — use the channels listed there.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE) and [`engine/NOTICE`](engine/NOTICE).

This product includes the
[Decepticon](https://github.com/PurpleAILAB/Decepticon) framework
(Apache-2.0, © PurpleAILAB) under `engine/decepticon/`.
