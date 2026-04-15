# BJHUNT — AI-Powered Autonomous Cybersecurity Platform

## Project Context

BJHUNT est une plateforme SaaS de cybersecurite offensive propulsee par l'IA. Elle orchestre des audits de securite autonomes via une interface conversationnelle.

### Architecture

```
Frontend (Next.js 15)     → app/, components/, lib/, messages/
Engine  (Decepticon)      → engine/   (PurpleAILAB/Decepticon, Apache-2.0)
Backend (A CONSTRUIRE)    → backend/  (Hono + Bun, auth, RBAC, jobs, multi-tenant)
Infra   (VPS Hostinger)   → ops/     (Caddy + sslh + Docker Compose)
CI/CD   (GitHub Actions)  → .github/workflows/
```

### Repos

- **Actuel** : `bjhuntcom-oss/bjhunt` (ce repo)
- **Legacy** : `bjhuntcom-oss/bjhunt-v1-legacy` (ancien, archive)
- **Engine source** : `PurpleAILAB/Decepticon`

### VPS (Hostinger KVM 8)

- **IP** : 82.25.117.79
- **SSH** : `ssh bjhunt-vps` (port 443 via sslh, cle `~/.ssh/bjhunt_vps`)
- **OS** : Ubuntu 25.10, 8 vCPU, 32GB RAM, 400GB disk
- **Domaines** : bjhunt.com, api.bjhunt.com, chat.bjhunt.com
- **VPS ID** : 1295179, Firewall ID: 255451
- **sslh** : port 443 → SSH (localhost:22) + HTTPS (localhost:8443 Caddy)

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui |
| i18n | next-intl (FR/EN) |
| Backend (cible) | Hono + Bun, PostgreSQL 17, Redis 7 |
| Engine | Python 3.13, LangGraph, LangChain, 17 agents IA |
| LLM | LiteLLM proxy (Anthropic, OpenAI, Ollama Cloud) |
| Sandbox | Kali Linux Docker (nmap, nuclei, sqlmap, ffuf, sliver) |
| Graph DB | Neo4j 5.24 (attack chain knowledge graph) |
| Reverse proxy | Caddy 2.10 + sslh (port 443 multiplexer) |
| CI/CD | GitHub Actions → Vercel (frontend) + SSH deploy (VPS) |

### Decepticon Engine (engine/)

17 agents IA specialises :
- **Decepticon** (orchestrateur), **Soundwave** (planification RoE/OPPLAN)
- **Recon**, **Exploit**, **PostExploit**, **Analyst**, **Reverser**
- **Contract Auditor** (Solidity), **Cloud Hunter** (AWS/Azure/K8s), **AD Operator**
- **Defender** (vaccine), **Scanner**, **Detector**, **Verifier**, **Patcher**, **Exploiter**
- **VulnResearch** (coordinateur recherche vulnerabilites)

## Regles de developpement

- Ecrire du code securise — c'est une plateforme de cybersecurite
- SQL toujours parametre, jamais d'interpolation
- Argon2id pour les passwords, AES-256-GCM pour les secrets
- RLS PostgreSQL pour l'isolation multi-tenant
- Pas de `unsafe-eval` dans le CSP
- Valider tous les inputs avec Zod
- Rate limiting Redis sur tous les endpoints publics
- Pas de secrets dans le code — tout dans `.env`
- Docker pour l'isolation — jamais d'execution directe sur le host
- Tests de securite dans le CI (Trivy, Gitleaks, CodeQL)

## Hostinger MCP

La cle API Hostinger est dans `.mcp.json`. Le MCP permet de gerer le VPS, DNS, firewall, backups, snapshots directement depuis Claude Code.

## Prochaines etapes

1. Construire le backend API (auth, RBAC, jobs, orchestration Decepticon)
2. Docker Compose pour le VPS (Caddy + Backend + LangGraph + PG + Redis + Neo4j)
3. Connecter le frontend au nouveau backend
4. Premier deploiement complet
