# 09 — Auth & RBAC

> Implementation reelle de l'auth dans BJHUNT. Basee sur l'audit du code existant.
> Source : `app/actions/auth.ts`, `middleware.ts`, `lib/backend-client.ts`, `backend/src/middleware/auth.ts`

## Architecture auth actuelle

### Dual-cookie strategy

BJHUNT utilise **deux cookies** pour gerer l'auth entre le serveur Next.js et le streaming SSE :

| Cookie | HttpOnly | Secure | SameSite | Purpose |
|---|---|---|---|---|
| `bjhunt_session` | **Oui** | Oui | Lax | Auth cote serveur (Next.js server components, backend API) |
| `bjhunt_stream_token` | **Non** | Oui | Lax | Auth cote client pour les streams SSE directs (bypass Vercel) |

**Pourquoi deux cookies ?**
- `bjhunt_session` est HttpOnly → le JS ne peut pas le lire → securise contre XSS
- `bjhunt_stream_token` est lisible par le JS → necessaire car les streams SSE vont directement au VPS (pas via Vercel proxy) → le browser doit pouvoir lire le token pour le passer en query param

**Domaine cookie** : `.bjhunt.com` (production) → permet le partage entre `www.bjhunt.com`, `api.bjhunt.com`, `chat.bjhunt.com`
Dev : undefined (localhost)
Max-age : 30 jours

### Server Actions (`app/actions/auth.ts`)

**loginAction(email, password)** :
1. POST `/api/auth/login` → `{ email, password }`
2. Response contient `sessionToken`
3. Set cookie `bjhunt_session` (HttpOnly, Secure, Lax, path=/, 30 jours)
4. Set cookie `bjhunt_stream_token` (non-HttpOnly, Secure, Lax, path=/, 30 jours)
5. Retourne `{ user: { email, role }, organization: { id } }`
6. Erreur → throw avec code backend

**registerAction(email, password, displayName)** :
1. POST `/api/auth/register` → `{ email, password, displayName }`
2. Meme flow que login (set cookies, retourne user)
3. Erreur → throw avec code backend

**logoutAction()** :
1. Recupere le cookie `bjhunt_session`
2. POST `/api/auth/logout` avec cookie header (best-effort, erreurs ignorees)
3. Supprime les deux cookies localement

**Pourquoi server actions et pas API routes ?**
Vercel strip les headers `Set-Cookie` des responses de route handlers.
Les server actions contournent cette limitation en settant les cookies directement.

### Login Page (`app/[locale]/login/page.tsx`)

**Formulaire Registration** :
| Champ | Type | Validation |
|---|---|---|
| Display name | text | Requis |
| Email | email | Format email valide, placeholder `you@company.com` |
| Password | password | Min 14 chars, autocomplete `new-password` |

**Formulaire Login** :
| Champ | Type | Validation |
|---|---|---|
| Email | email | Format email valide |
| Password | password | Requis, autocomplete `current-password` |

**Messages d'erreur (FR/EN)** :

| Code backend | Francais | Anglais |
|---|---|---|
| `EMAIL_ALREADY_IN_USE` | "Cet email est deja utilise." | "This email is already in use." |
| `INVALID_CREDENTIALS` | "Identifiants invalides." | "Invalid credentials." |
| `PASSWORD_TOO_SHORT` | "Utilisez une passphrase d au moins 14 caracteres." | "Use a passphrase of at least 14 characters." |
| `PASSWORD_TOO_WEAK` | "Choisissez une passphrase plus unique..." | "Choose a more unique passphrase..." |
| `AUTH_RATE_LIMITED` | "Trop de tentatives. Reessayez dans quelques minutes." | "Too many attempts. Try again in a few minutes." |
| Default | "Connexion impossible pour le moment." | "Unable to complete authentication right now." |

**Protection open redirect** :
- Le param `redirect` est normalise : doit commencer par `/` et pas `//`
- Fallback vers `/{locale}/dashboard`
- Utilise `window.location.assign()` (pas `router.push`)

### Forgot Password (`app/[locale]/forgot-password/page.tsx`)

| Champ | Type | Validation |
|---|---|---|
| Email | email | Format valide, placeholder `you@company.com` |

- POST `/api/auth/forgot-password` via `browserBackendFetch()` (proxy)
- **Toujours** affiche le message de succes (pas de user enumeration)
- Message : "Si un compte existe avec cet email, un lien de reinitialisation a ete envoye."

### Reset Password (`app/[locale]/reset-password/page.tsx`)

| Champ | Type | Validation |
|---|---|---|
| New password | password | Min 14 chars |
| Confirm password | password | Doit matcher |

- Token depuis query param `?token=...`
- POST `/api/auth/reset-password` avec `{ token, newPassword }`
- Erreurs : `INVALID_RESET_TOKEN`, `RESET_TOKEN_ALREADY_USED`, `RESET_TOKEN_EXPIRED` → message lien expire
- Succes → bouton "Sign in" vers la page login

## Backend middleware auth

### requireAuth

```typescript
// backend/src/middleware/auth.ts
export function requireAuth(c: Context, next: Next) {
  // Extrait le session token du cookie bjhunt_session
  // Valide le token contre la DB
  // Set c.user et c.session
  // 401 si invalide ou expire
}
```

### requireAdmin

```typescript
export function requireAdmin(c: Context, next: Next) {
  // Verifie c.user.isPlatformAdmin === true
  // 403 "Admin access required" si non admin
}
```

## Roles actuels vs cible

| Aspect | Implementation actuelle | Architecture cible |
|---|---|---|
| Roles | `member`, `platform_admin` (2 niveaux) | `user`, `admin`, `super_admin` (3 niveaux) |
| Champ DB | `is_platform_admin: boolean` + `role: string` | `role: enum` |
| Admin check | `user.isPlatformAdmin === true` | `user.role in ['admin', 'super_admin']` |
| Super admin | Pas implemente | Delete users, change roles, platform settings |

## Middleware Next.js (`middleware.ts`)

### CSP (Content Security Policy)

```
script-src 'nonce-{random}' 'strict-dynamic'
object-src 'none'
base-uri 'none'
```

- Nonce genere avec `crypto.randomUUID()` a chaque requete
- Propage aux server components via header `x-nonce`
- **Pas de unsafe-eval** (jamais)

### Locale detection

```typescript
// Priorite : cookie BJHUNT_LOCALE → defaut 'fr'
// Valeurs : 'fr' ou 'en' uniquement
```

### Path blocking

Routes bloquees et redirigees vers `/dashboard` :
`/overview, /channels, /instances, /sessions, /usage, /cron, /agents, /skills, /nodes, /config, /communications, /appearance, /automation, /infrastructure, /ai-agents, /debug, /logs`

## Session Context (`/api/runtime/session-context`)

Endpoint GET qui retourne le contexte user :

```typescript
{
  locale: "en" | "fr",
  user: { displayName, email, role },
  organization: { id, slug, name },
  role: {
    label: string,          // "Admin plateforme" | "Analyste"
    workspaceLabel: string, // "Commande BJHUNT" | "Workspace BJHUNT"
    summary: string,
    adminSurface: boolean   // true = montre la section admin sidebar
  }
}
```

### Roles et metadata

| Role DB | Label FR | Label EN | Admin surface |
|---|---|---|---|
| `platform_admin` | Admin plateforme | Platform admin | **true** |
| `org_admin` | Admin organisation | Organization admin | false |
| `analyst` (defaut) | Analyste | Analyst | false |

## Password requirements

| Regle | Valeur | Source |
|---|---|---|
| Longueur minimum | **14 caracteres** | Frontend + backend |
| Complexite | Validation backend (weak password detection) | Backend |
| Hachage | **Argon2id** | Backend (affiche dans admin settings) |
| Pepper | Oui (env var) | Backend |

## Rate limiting

| Endpoint | Limite | Source |
|---|---|---|
| Login/Register | Rate limited par IP | Backend `AUTH_RATE_LIMITED` |
| Beta signup | 5/min/IP | Frontend API route |
| Contact form | 3/min/IP | Frontend API route |
| API general | Non documente | Backend |

### Implementation frontend

```typescript
// Utilise un Map en memoire (pas Redis)
// NE SURVIT PAS au restart du serveur Vercel
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
```

**Limitation** : Le rate limiting des API routes Next.js (`/api/beta`, `/api/contact`) est en memoire, pas persistant. Devrait utiliser Redis quand le backend est pret.

## CSRF protection

- Cookies `SameSite=Lax` → protection CSRF par defaut
- Pas de CSRF tokens explicites dans le code actuel
- L'architecture cible prevoit un origin check sur les mutations

## Captcha

- **hCaptcha** sur les formulaires publics (beta, contact)
- Verification serveur via `api.hcaptcha.com/siteverify`
- Requis avant soumission

## Backend client (`lib/backend-client.ts`)

### Resolution de l'URL backend

```typescript
const backendBaseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.bjhunt.com' : 'http://127.0.0.1:3001')
```

### Deux modes

| Mode | Fonction | Usage |
|---|---|---|
| Browser | `browserBackendFetch(path, init)` | Proxy via `/api/proxy/{path}` (cookie forwarding) |
| Server | `serverBackendFetch(path, init, cookie?, origin?)` | Direct backend (server components, actions) |

## Sanitization (`lib/sanitize.ts`)

Pipeline de sanitization applique a tous les inputs de formulaire :

1. Remove null bytes
2. Remove `<script>` tags et contenu
3. Remove event handlers (`onclick`, etc.)
4. Block `javascript:`, `data:`, `vbscript:` URLs
5. Escape HTML entities (`&`, `<`, `>`, `"`, `'`, `/`, `` ` ``, `=`)
6. Trim whitespace
7. Defense-in-depth SQL injection pattern blocking

## Tracking et analytics

### PostHog

- Init conditionnelle a `hasAnalyticsConsent()` (cookie consent)
- API host : `NEXT_PUBLIC_POSTHOG_HOST` ou `https://eu.i.posthog.com`
- Events : `$pageview`, `form_submission`, custom events
- User identification : `identifyUser(userId, traits)` si consent

### Cookie consent

```typescript
// Cookie: bjhunt_cookie_consent (365 jours)
{
  necessary: true,    // Toujours
  analytics: boolean, // Opt-in
  marketing: boolean, // Opt-in
  preferences: boolean,
  timestamp: ISO string
}
```

## Email (`lib/email.ts`)

**Provider** : Resend
**From** : `BJHUNT <noreply@bjhunt.com>`
**Recipient team** : `bjhuntcom@gmail.com`

### Templates

| Template | Sujet | Declencheur |
|---|---|---|
| Beta signup (team) | "Nouvelle inscription Beta: {name}" | POST /api/beta |
| Beta signup (user) | "Bienvenue dans le programme Beta BJHUNT!" | POST /api/beta |
| Contact (team) | "Contact: {subject}" | POST /api/contact |
| Contact (user) | "Nous avons bien recu votre message - BJHUNT" | POST /api/contact |
| Password reset | — | POST /api/auth/forgot-password |

## Variables d'environnement auth

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_BACKEND_URL` | Backend URL (browser) |
| `BACKEND_API_URL` | Backend URL (server) |
| `HCAPTCHA_SECRET` | Verification captcha |
| `RESEND_API_KEY` | Service email |
| `NEXT_PUBLIC_HCAPTCHA_SITEKEY` | Widget captcha frontend |
| `NEXT_PUBLIC_COOKIE_DOMAIN` | Domaine des cookies session |
| `NEXT_PUBLIC_APP_URL` | URL app (server actions) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog endpoint |
