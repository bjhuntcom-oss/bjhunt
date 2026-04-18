# 00 — Vision & Mission

## Qu'est-ce que BJHUNT

BJHUNT est une **plateforme SaaS de cybersecurite offensive propulsee par l'IA**. Elle permet a des entreprises de lancer des audits de securite autonomes pilotes par des agents IA specialises, avec des resultats en temps reel.

Le user ne soumet pas un scan et attend — il **regarde le pentest se derouler en direct**, comme s'il avait un red teamer assis a cote de lui.

## Le probleme qu'on resout

| Approche actuelle | Probleme | BJHUNT |
|---|---|---|
| Pentest manuel | 2-4 semaines, $15k-$50k par engagement | Minutes a heures, abonnement mensuel |
| Scanner automatise (Nessus, Qualys) | Faux positifs, zero contexte, pas d'exploitation | Agents IA qui comprennent le contexte, exploitent, verifient |
| Bug bounty | Imprevisible, pas de couverture garantie | Couverture systematique, reproductible |

## Proposition de valeur

1. **Pentest autonome par IA** — 17 agents specialises couvrent la kill chain complete (Recon → Exploit → Post-Exploit → Reporting)
2. **Resultats en temps reel** — Streaming live de la pensee des agents, des commandes executees, des findings decouverts
3. **Fraction du cout** — $29-79/mois vs $15k-50k par pentest manuel
4. **Reproductible** — Relancer un audit identique a tout moment, comparer les resultats
5. **Multi-framework** — MITRE ATT&CK, CVSS, OWASP, avec knowledge graph Neo4j

## Marche cible

### Phase 1 — Early adopters
- **Startups tech** (10-200 employes) sans equipe securite dediee
- **Freelance pentesters** cherchant un outil d'acceleration
- **CTF players** et etudiants en cybersecurite
- **DevSecOps engineers** integrant la securite dans le CI/CD

### Phase 2 — Growth
- **PME** (200-2000 employes) avec compliance requirements
- **MSP/MSSP** (Managed Security Service Providers) offrant du pentest as a service
- **Consultants securite** utilisant BJHUNT comme backbone de leurs prestations

### Phase 3 — Enterprise
- **Grandes entreprises** avec red teams internes
- **Gouvernement** et defense (deployement on-premise)
- **Assureurs cyber** pour l'evaluation des risques

## Differentiateurs concurrentiels

| Concurrent | Type | Prix | BJHUNT vs |
|---|---|---|---|
| Pentera | Automated pentest | $50k+/an | 100x moins cher, agents IA plus flexibles |
| Horizon3.ai | Autonomous pentest | $30k+/an | Open-source engine, self-hostable |
| HackerOne | Bug bounty platform | Variable | Deterministe, pas dependant de humans |
| Invicti/Acunetix | Web scanner | $3k-15k/an | Couvre toute la kill chain, pas juste web |
| Cobalt | Pentest as a service | $10k+/engagement | Temps reel, reproductible, scalable |

## Stack technologique

| Couche | Technologie | Justification |
|---|---|---|
| **Frontend** | Next.js 15, React 19, shadcn/ui | SSR, i18n, composants accessibles |
| **Backend API** | Hono + Bun | Ultra-rapide, streaming natif, TypeScript |
| **Engine securite** | Decepticon (LangGraph, Python 3.13) | 17 agents specialises, kill chain complet |
| **Infrastructure agent** | OpenHands SDK | Multi-tenancy, sandbox isolation, API production |
| **Base de donnees** | PostgreSQL 17 + RLS | Multi-tenant, ACID, row-level security |
| **Cache/Queue** | Redis 7 + BullMQ | Job queue, rate limiting, sessions |
| **Knowledge graph** | Neo4j 5.24 | Chaines d'attaque, relations entre findings |
| **LLM routing** | LiteLLM | Multi-provider (Anthropic, OpenAI, Ollama Cloud) |
| **Reverse proxy** | Caddy | Auto-TLS, HTTP/3, config simple |
| **Sandbox** | Docker (Kali Linux) | Isolation reseau, 100+ outils securite |
| **CI/CD** | GitHub Actions | Lint, test, Trivy, Gitleaks, deploy |
| **Hosting frontend** | Vercel | Edge CDN, zero-config Next.js |
| **Hosting backend** | VPS Hostinger KVM 8 | 8 vCPU, 32GB RAM, 400GB SSD, Paris |

## Principes architecturaux

1. **Streaming-first** — Tout est en temps reel. Aucune operation "soumis et attend"
2. **Security-by-design** — C'est une plateforme de securite, la securite est non-negociable
3. **Multi-tenant natif** — Isolation complete entre utilisateurs (RLS, containers, secrets)
4. **Resource-efficient** — Le VPS KVM 8 doit suffire pour 50-100 users
5. **Queue-based scaling** — Containers ephemeres, pas always-on par user
6. **API-first** — Tout ce que le frontend fait, l'API peut le faire
7. **Modular engine** — Decepticon reste un module remplacable, pas couple au backend
