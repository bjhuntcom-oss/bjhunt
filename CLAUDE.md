# BJHUNT — Frontend (post-purge état 2026-04-29)

Ce repo contient UNIQUEMENT le frontend Next.js public de BJHUNT.

Le backend (Hono+Bun), l'engine Decepticon (17 agents IA), et toute l'infra VPS ont été purgés le **2026-04-29** en préparation d'un rebuild sur un backend agentique différent (OpenHands ou équivalent).

## État actuel

- ✅ Frontend Next.js 16 déployé sur **Vercel** (`bjhunts-projects/bjhunt` → `bjhunt-bjhunts-projects.vercel.app` + custom `bjhunt.com`)
- ✅ Pages marketing complètes (landing, pricing, technology, contact, beta, investors, legal)
- ✅ Formulaires beta + contact autonomes (Resend + hCaptcha + Upstash Redis rate-limit)
- ✅ i18n FR / EN via next-intl
- ✅ VPS Hostinger purgé (containers stopped, volumes drop, /opt/bjhunt removed)
- ✅ Engine archivé en repo privé `bjhuntcom-oss/bjhunt-legacy-engine` (read-only)
- ⏳ **À rebuild** : auth, dashboard, chat, audit, admin (sur nouveau backend)

## Stack
- Next.js 16 (App Router, RSC, Turbopack), React 19, TypeScript, Tailwind 4
- next-intl (FR/EN), Resend, hCaptcha, Upstash Redis, PostHog
- Pas de framework de tests dédié (Playwright config présent pour E2E futurs)

## Structure
```
app/[locale]/        Pages localisées FR/EN (marketing only)
app/api/             beta + contact (autonomes, Resend)
components/          UI primitives + layout (header, footer, cookie consent)
hooks/               (vide — supprimé use-audit-stream avec backend)
i18n/                routing + request configuration next-intl
lib/                 cookies (consent), email (Resend), rate-limit, sanitize, tracking, utils, validations
messages/            fr.json + en.json (contiennent encore des keys dashboard/login obsolètes — à nettoyer au rebuild)
middleware.ts        CSP + intl middleware (sans rewrites backend)
next.config.ts       Pas de rewrites backend
public/              Assets statiques
tests/               (vide — supprimé smoke.spec.ts)
docs/                Design system docs uniquement
```

## VPS — état post-purge

VPS Hostinger `82.25.117.79` (KVM 8, Ubuntu 24.04, srv1295179) :
- 0 containers, 0 volumes, 0 networks bjhunt-*, 0 cron jobs bjhunt
- `/opt/bjhunt` supprimé, `/var/backups/bjhunt` supprimé
- Disque : 2.9GB / 387GB
- SSH : port 22, clé `bjhunt-vps-2026-04-29` (ed25519) — registry Hostinger ET `/root/.ssh/authorized_keys` à jour
- Clés locales : `C:\Users\CODEUR\.ssh\bjhunt_vps` (priv+pub), config `~/.ssh/config` host alias `bjhunt-vps`
- UFW : 22/80/443 ouverts

## Vercel envs (active)
- `RESEND_API_KEY`
- `NEXT_PUBLIC_HCAPTCHA_SITEKEY`
- `HCAPTCHA_SECRET`

(`NEXT_PUBLIC_API_URL` supprimé)

## GitHub
- Repo principal : `bjhuntcom-oss/bjhunt` (public)
- Repo legacy archive (engine) : `bjhuntcom-oss/bjhunt-legacy-engine` (privé)
- Repo legacy v1 : `bjhuntcom-oss/bjhunt-v1-legacy` (privé)
- Workflows : `ci.yml` (lint+build+gitleaks frontend uniquement)
- Secrets : (aucun — `VPS_SSH_KEY` supprimé)
- Branche unique : `main`

## Connaissances opérationnelles à connaître
- Vercel CLI authentifiée (team `bjhunts-projects`) — `vercel env ls`, `vercel deploy`
- gh CLI authentifiée (`bjhuntcom-oss`)
- SSH VPS via alias `bjhunt-vps` (config dans `~/.ssh/config`)
- Playwright MCP autorisé pour navigateur (Hostinger panel, GitHub web, Vercel web)
- **Pas d'usage des MCP Vercel/GitHub** — uniquement CLI locales

## Roadmap rebuild

Phase 2 (à venir) : recherche + sélection d'un backend agentique
- Candidats : **OpenHands** (open source, AI agent framework), Warp.dev open source, autres
- Hosting : Fly.io, AWS, RunPod, Modal, ou auto-hébergé
- LLM : **Ollama Cloud** en attendant (modèle entraîné sur RunPod GPU rentés ensuite)
- Objectif : interface chat ChatGPT-like pour audits de vulnérabilité, streaming live, multi-tenant isolé sécurisé robuste

## Règles de développement (frontend)

- Code sécurisé (pas d'unsafe-eval, CSP strict avec nonce, Resend/hCaptcha au boundary)
- Inputs validés via Zod (`lib/validations.ts`)
- Sanitize via `lib/sanitize.ts` avant tout traitement HTML
- Rate-limit toutes les routes API publiques (`lib/rate-limit.ts`)
- Préférer Server Components par défaut
- Pas de secrets dans le code
- TypeScript strict
- Commits conventional : `feat:`, `fix:`, `chore:`, `ci:`, `docs:`
