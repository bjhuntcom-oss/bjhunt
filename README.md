# BJHUNT — Frontend

Marketing site (Next.js 16, App Router, next-intl FR/EN) for the BJHUNT cybersecurity platform.

This repo contains **only the public frontend**. The backend, agent engine, and infrastructure that previously lived here were purged on 2026-04-29 in preparation for a rebuild on a new agentic backend (OpenHands / equivalent).

## Stack

- **Next.js 16** (App Router, Turbopack, RSC)
- **React 19** + **TypeScript**
- **Tailwind 4** + **Radix UI** primitives
- **next-intl** for FR / EN routing
- **Resend** for transactional email (beta + contact forms)
- **hCaptcha** anti-spam
- **Upstash Redis** rate-limiting
- **PostHog** product analytics
- Hosted on **Vercel** (`bjhunts-projects/bjhunt`)

## Local development

```bash
bun install
bun run dev       # Turbopack on :3000
bun run typecheck
bun run build
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing |
| `/technology` | Technology overview |
| `/technology/deep-dive` | Long-form technical write-up |
| `/pricing` | Pricing tiers (CTA → `/beta`) |
| `/api-docs` | Public API documentation (illustrative — API not live yet) |
| `/investors` | Investor relations |
| `/contact` | Contact form (Resend) |
| `/beta` | Beta sign-up form (Resend + hCaptcha + rate-limit) |
| `/legal/*` | Privacy, terms, AI policy, accessibility |

## Required env vars

Set in Vercel project (`bjhunts-projects/bjhunt`):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Beta + contact form emails |
| `NEXT_PUBLIC_HCAPTCHA_SITEKEY` | hCaptcha widget |
| `HCAPTCHA_SECRET` | hCaptcha siteverify (server-side) |
| `UPSTASH_REDIS_REST_URL` | Rate-limit backing store (optional in dev — falls back in-memory) |
| `UPSTASH_REDIS_REST_TOKEN` | Same |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog analytics (optional) |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest URL (optional) |

## Status

- ✅ Marketing pages
- ✅ Beta + contact forms (autonomous, no backend dependency)
- ⏳ Authenticated dashboard — to be rebuilt on the new backend
- ⏳ Chat / audit interface — to be rebuilt
