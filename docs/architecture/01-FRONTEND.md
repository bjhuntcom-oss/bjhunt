# 01 — Frontend (état actuel)

## Stack

| Couche | Choix | Version | Rôle |
|---|---|---|---|
| Framework | Next.js | 16.2.4 | App Router, RSC, Turbopack, Edge runtime ready |
| Runtime | React | 19.2.5 | Server + Client components |
| Langage | TypeScript | 5.7+ | Strict mode |
| Styling | Tailwind | 4.2.4 | Utility-first, custom design tokens |
| Primitives UI | Radix | react-slot 1.2 | Accessibilité native |
| Animations | Framer Motion | 12.38.0 | Transitions + scroll triggers |
| i18n | next-intl | 4.9.1 | FR par défaut + EN, locale prefix toujours visible |
| Email | Resend | 6.12.2 | Beta signup + contact form |
| Anti-spam | hCaptcha | 2.0.2 | Beta + contact |
| Rate limiting | Upstash Redis | 1.37.0 | API routes publiques |
| Analytics | PostHog | 1.372.1 | Funnel marketing, opt-in cookie consent |
| Cookie consent | js-cookie | 3.0.5 | RGPD, equal-prominence Reject/Accept |
| Icônes | Lucide | ^0.562.0 | Tree-shaken |
| Hébergeur | Vercel | Hobby plan | Auto-deploy from `main` |

## Structure des dossiers

```
app/
├── [locale]/                       # FR et EN, prefix toujours visible (/fr/, /en/)
│   ├── _components/                # Sections marketing partagées (hero, features, cta, pricing-teaser, api-section)
│   ├── api-docs/                   # Documentation API publique (illustrative)
│   ├── beta/                       # Formulaire beta signup
│   ├── contact/                    # Formulaire contact
│   ├── investors/                  # Page investisseurs
│   ├── legal/                      # Mentions légales, accessibility, AI policy
│   ├── pricing/                    # Tarifs (Free / Pro / Enterprise)
│   ├── technology/                 # Présentation technique
│   │   └── deep-dive/              # Long-form technique
│   ├── error.tsx                   # Error boundary
│   ├── layout.tsx                  # Locale layout (intl provider)
│   ├── loading.tsx                 # Loading skeleton
│   └── page.tsx                    # Landing
│
├── api/
│   ├── beta/route.ts               # POST: hCaptcha verify → Resend → success
│   └── contact/route.ts            # POST: hCaptcha verify → Resend → success
│
├── globals.css                     # Tailwind imports + design tokens
├── layout.tsx                      # Root layout (lang, fonts, analytics)
├── not-found.tsx                   # 404
├── robots.ts                       # robots.txt dynamique
└── sitemap.ts                      # sitemap.xml dynamique

components/
├── animations/                     # SVG animations (network-topology, growth-line)
├── layout/                         # Header, Footer, LayoutShell
├── ui/                             # Primitives (Button, Card, StatusDot, Logo, etc.)
├── AnalyticsProvider.tsx           # PostHog init + consent gate
├── CookieConsent.tsx               # Banner RGPD
└── LanguageSwitcher.tsx            # FR ⇄ EN

lib/
├── cookies.ts                      # Consent state (getConsent, setConsent, hasAnalyticsConsent)
├── email.ts                        # Resend wrapper (beta + contact emails)
├── rate-limit.ts                   # Upstash Redis rate-limit (fallback in-memory dev)
├── sanitize.ts                     # Form input sanitization
├── tracking.ts                     # PostHog event helpers
├── utils.ts                        # cn() class merger
└── validations.ts                  # Zod schemas (beta, contact)

i18n/
├── request.ts                      # Server config next-intl
└── routing.ts                      # Locales + Link/redirect/usePathname helpers

messages/
├── fr.json                         # 10 namespaces utilisés
└── en.json                         # idem

middleware.ts                       # Intl middleware + CSP nonce
next.config.ts                      # Headers sécurité (sans rewrites backend)
```

## Routes générées (build)

| Route | Type | Description |
|---|---|---|
| `/` | static | Redirect → `/fr` |
| `/[locale]` | dynamic | Landing |
| `/[locale]/api-docs` | dynamic | Doc API (illustrative) |
| `/[locale]/beta` | dynamic | Beta signup form |
| `/[locale]/contact` | dynamic | Contact form |
| `/[locale]/investors` | dynamic | Investor relations |
| `/[locale]/legal` | dynamic | Mentions légales |
| `/[locale]/legal/accessibility` | dynamic | Accessibility statement |
| `/[locale]/legal/ai-policy` | dynamic | AI policy (EU AI Act art.50) |
| `/[locale]/pricing` | dynamic | Tarifs |
| `/[locale]/technology` | dynamic | Technologie |
| `/[locale]/technology/deep-dive` | dynamic | Deep-dive technique |
| `/api/beta` | dynamic | POST: signup |
| `/api/contact` | dynamic | POST: contact |
| `/robots.txt`, `/sitemap.xml`, `/icon.png`, `/apple-icon.png` | static | Assets |

## Variables d'environnement

| Variable | Requis | Description |
|---|---|---|
| `RESEND_API_KEY` | ✅ | Email transactional (beta + contact) |
| `NEXT_PUBLIC_HCAPTCHA_SITEKEY` | ✅ | Widget hCaptcha frontend |
| `HCAPTCHA_SECRET` | ✅ | hCaptcha siteverify côté serveur |
| `UPSTASH_REDIS_REST_URL` | ⚠️ | Rate-limit (fallback in-memory si absent) |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ | Idem |
| `NEXT_PUBLIC_POSTHOG_KEY` | ⚠️ | Analytics (opt-in) |
| `NEXT_PUBLIC_POSTHOG_HOST` | ⚠️ | URL ingest PostHog |

## Conventions de code

- **Server components par défaut**, `"use client"` uniquement quand nécessaire (state, refs, listeners DOM)
- **Pas de `any`** sauf justification commentée
- **Validation Zod** sur toute entrée externe (forms, query params)
- **Sanitize** `lib/sanitize.ts` avant tout traitement HTML
- **Rate-limit** sur toutes les API publiques (`lib/rate-limit.ts`)
- **CSP nonce** propagé par `middleware.ts` à chaque request
- **Pas de secrets dans le code** — tout via `process.env`
- **Path aliases** : `@/components`, `@/lib`, `@/i18n`, `@/messages`

## Build & déploiement

- Vercel auto-deploy sur push `main`
- `bun run build` (15-25s) ou `npm run build`
- 14 routes app, 1 middleware proxy
- `next.config.ts` impose 6 headers sécurité (X-Frame-Options DENY, COOP, COEP, etc.)

## Ce qui n'existe PAS dans ce frontend

- ❌ Auth (login, register, sessions) — supprimé pour rebuild
- ❌ Dashboard utilisateur — supprimé pour rebuild
- ❌ Chat / audit interface — supprimé pour rebuild
- ❌ Admin — supprimé pour rebuild
- ❌ Routes proxy vers backend (`/api/proxy/*`, `/api/auth/*`) — supprimées
- ❌ Server actions auth — supprimées

Ces éléments seront recodés sur le nouveau backend (voir [02-BACKEND-TARGET.md](02-BACKEND-TARGET.md)).
