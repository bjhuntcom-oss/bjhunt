# BJHUNT Architecture Documentation

> Documentation technique complete de la plateforme BJHUNT.
> Chaque fichier couvre un domaine precis. Lire dans l'ordre numerique pour une comprehension progressive.

## Index

| # | Document | Description |
|---|----------|-------------|
| 00 | [Vision & Mission](00-VISION.md) | Ce qu'est BJHUNT, pourquoi ca existe, le marche cible |
| 01 | [Architecture Systeme](01-ARCHITECTURE.md) | Vue d'ensemble, composants, flux de donnees, diagrammes |
| 02 | [Streaming Live](02-STREAMING.md) | Pipeline SSE temps reel, zero buffering, event types |
| 03 | [OpenHands Integration](03-OPENHANDS-INTEGRATION.md) | Comment OpenHands sert d'infrastructure multi-tenant |
| 04 | [Decepticon Engine](04-DECEPTICON-ENGINE.md) | Moteur securite, 17 agents, adaptation pour BJHUNT |
| 05 | [Backend API](05-BACKEND-API.md) | Spec complete de l'API Hono+Bun, routes, middleware |
| 06 | [Frontend](06-FRONTEND.md) | Architecture Next.js 15, composants, pages, i18n |
| 07 | [Dashboard User](07-DASHBOARD-USER.md) | Fonctionnalites utilisateur, UX flows, ecrans |
| 08 | [Dashboard Admin](08-DASHBOARD-ADMIN.md) | Fonctionnalites admin, monitoring, gestion plateforme |
| 09 | [Auth & RBAC](09-AUTH-RBAC.md) | Authentification, roles, permissions, sessions, API keys |
| 10 | [Multi-Tenancy](10-MULTI-TENANCY.md) | Isolation donnees, sandbox, quotas, RLS PostgreSQL |
| 11 | [Database Schema](11-DATABASE-SCHEMA.md) | Schema PostgreSQL complet, migrations, RLS policies |
| 12 | [Docker & Deployment](12-DOCKER-DEPLOYMENT.md) | Docker Compose, reseaux, volumes, deploiement VPS |
| 13 | [VPS Configuration](13-VPS-CONFIG.md) | Config complete du VPS Hostinger, sslh, UFW, services |
| 14 | [Security Model](14-SECURITY.md) | Modele de menaces, CSP, sandbox isolation, secrets |
| 15 | [Pricing & Billing](15-PRICING-BILLING.md) | Grille tarifaire, couts, Stripe integration, quotas |
| 16 | [CI/CD Pipeline](16-CI-CD.md) | GitHub Actions, lint, test, security scan, deploy |
| 17 | [Design System](17-DESIGN-SYSTEM.md) | UI/UX, couleurs, typographie, composants, animations |
| 18 | [LLM Providers](18-LLM-PROVIDERS.md) | Routing multi-provider, LiteLLM, couts, fallback |
| 19 | [Scaling Strategy](19-SCALING.md) | Phases de croissance, cloud burst, Fly.io, K8s |
| 20 | [Developer Guide](20-DEV-GUIDE.md) | Onboarding dev, setup local, conventions, workflow |

## Lecture rapide

- **Nouveau sur le projet ?** Commence par `00-VISION.md` puis `01-ARCHITECTURE.md`
- **Frontend dev ?** Lis `06-FRONTEND.md`, `07-DASHBOARD-USER.md`, `17-DESIGN-SYSTEM.md`
- **Backend dev ?** Lis `05-BACKEND-API.md`, `09-AUTH-RBAC.md`, `11-DATABASE-SCHEMA.md`
- **DevOps ?** Lis `12-DOCKER-DEPLOYMENT.md`, `13-VPS-CONFIG.md`, `16-CI-CD.md`
- **Business ?** Lis `00-VISION.md`, `15-PRICING-BILLING.md`, `19-SCALING.md`

## Conventions

- Tous les diagrammes utilisent des blocs ASCII (pas de Mermaid pour la compatibilite universelle)
- Les exemples de code sont en TypeScript (backend Hono+Bun) ou Python (engine Decepticon)
- Les prix sont en USD sauf mention contraire
- Les specs materiel referencent le VPS Hostinger KVM 8 (8 vCPU, 32GB RAM, 400GB SSD)
