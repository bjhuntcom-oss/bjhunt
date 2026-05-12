# 09 — Guide dev local

## Prérequis

| Outil | Version | Install |
|---|---|---|
| Node.js | 22+ | https://nodejs.org/ |
| Bun | latest | `curl -fsSL https://bun.sh/install \| bash` (ou npm fallback) |
| Git | 2.40+ | https://git-scm.com/ |

Optionnel mais recommandé :
- VS Code + extensions : Tailwind IntelliSense, Prettier, ESLint, GitLens
- `gh` (GitHub CLI) si tu veux gérer les PRs en local

## Setup en 3 commandes

```bash
git clone https://github.com/bjhuntcom-oss/bjhunt.git
cd bjhunt
bun install               # ou npm install
cp .env.example .env.local
# Édite .env.local pour mettre tes clés (Resend, hCaptcha si tu testes les forms)
bun run dev               # http://localhost:3000
```

C'est tout. Pas de Docker, pas de DB, pas de backend à lancer (ce repo est uniquement le frontend marketing — le SaaS BJHUNT 4 MAX vit sur les repos privés `bjhunt-engine`, `bjhunt-backend`, `bjhunt-app`).

## Variables d'env minimum pour dev

| Variable | Comment obtenir | Note |
|---|---|---|
| `RESEND_API_KEY` | https://resend.com/api-keys (free tier 100 emails/jour) | Optionnel — si vide, les forms loggent au lieu d'envoyer |
| `NEXT_PUBLIC_HCAPTCHA_SITEKEY` | https://www.hcaptcha.com/ (free) | Optionnel — sans, le widget s'affiche en mode test |
| `HCAPTCHA_SECRET` | Idem | Optionnel pour dev |
| `UPSTASH_REDIS_REST_URL` | https://upstash.com/ free tier | Optionnel — fallback in-memory en dev |
| `UPSTASH_REDIS_REST_TOKEN` | Idem | Idem |
| `NEXT_PUBLIC_POSTHOG_KEY` | https://posthog.com/ | Optionnel |

Le frontend démarre sans aucune variable (les optionnelles tombent en mode dégradé).

## Commandes utiles

```bash
# Dev server
bun run dev               # Turbopack, hot reload

# Vérifications
bun run typecheck         # tsc --noEmit (équivalent au `bun run lint`)
bun run build             # Test prod build (15-25s)

# Si quelque chose va mal
rm -rf .next node_modules
bun install
bun run dev
```

## Structure mentale

```
1. C'est un Next.js 16 App Router pur. Pas de magie.
2. RSC par défaut. "use client" uniquement si state/refs/listeners DOM.
3. i18n via next-intl : tous les chemins sont sous /[locale]/...
4. Tailwind 4 + design tokens dans app/globals.css + app/design-tokens.css.
5. Pas de Redux / Zustand / autre state global — RSC + useState suffit pour le marketing.
6. Pas de fetch backend — TOUT est statique ou server action via /api/{beta,contact}.
```

## Conventions

### Components
- 1 composant = 1 fichier
- Server par défaut, `"use client"` au top du fichier si besoin
- Props typées, jamais d'`any`
- Pas de `forwardRef` sauf si la primitive le requiert (Radix)

### Imports
```ts
// Aliases configurés dans tsconfig.json
import { Button } from '@/components/ui/button'
import { sanitize } from '@/lib/sanitize'
import { Link } from '@/i18n/routing'        // navigation localisée
import { useTranslations } from 'next-intl'
```

### Forms
- Validation Zod (`lib/validations.ts`)
- Sanitize (`lib/sanitize.ts`)
- Rate-limit (`lib/rate-limit.ts`)
- Captcha hCaptcha verify côté serveur

Voir `app/api/beta/route.ts` comme template.

### Styling
- Tailwind utility-first
- Design tokens custom : `var(--bjhunt-bg)`, `var(--bjhunt-text)`, etc.
- Mobile-first (`sm:`, `md:`, `lg:` pour scale up)
- Pas de CSS modules sauf cas extrême

### i18n
```tsx
// Server component
import { getTranslations } from 'next-intl/server'
const t = await getTranslations('hero')
<h1>{t('title')}</h1>

// Client component
'use client'
import { useTranslations } from 'next-intl'
const t = useTranslations('hero')
<h1>{t('title')}</h1>

// Linking entre locales (auto-prefix /fr/, /en/)
import { Link } from '@/i18n/routing'
<Link href="/pricing">Tarifs</Link>
```

## Workflow Git

- Branches : `feat/...`, `fix/...`, `chore/...`, `docs/...`
- Conventional commits : `feat: add X`, `fix(scope): Y`, `chore(deps): bump`
- PR template : description + screenshots/GIF si UI + checklist tests
- Squash merge sur `main`

## Tests

Pas de framework de test installé pour le frontend marketing (gain de temps tant qu'on est en early stage). Les tests intégration arriveront avec le rebuild backend.

Smoke test minimum avant merge :
1. `bun run typecheck` passe
2. `bun run build` passe
3. `bun run dev` + ouvrir `/fr` et `/en`, naviguer sur toutes les pages, soumettre les forms

## Debugging

### Cookies / localStorage
DevTools → Application → Cookies / Local Storage. Le consent state est dans `bjhunt_cookie_consent` cookie.

### CSP issues
Si tu vois `Refused to execute inline script because it violates the following Content Security Policy directive` :
- Vérifie que le composant a bien le `nonce` (il devrait l'hériter automatiquement via Next.js + `middleware.ts`)
- Si tu charges un script externe : ajoute le domaine dans `connect-src` ou `script-src` dans `middleware.ts`

### Hot reload qui foire
```bash
rm -rf .next && bun run dev
```

### Type errors persistants
```bash
rm tsconfig.tsbuildinfo && bun run typecheck
```

## Resources

- [Next.js docs](https://nextjs.org/docs)
- [next-intl docs](https://next-intl-docs.vercel.app/)
- [Tailwind 4 docs](https://tailwindcss.com/)
- [Radix primitives](https://www.radix-ui.com/primitives)
- [Resend](https://resend.com/docs)
- [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview)
- [PostHog Next.js](https://posthog.com/docs/libraries/next-js)
