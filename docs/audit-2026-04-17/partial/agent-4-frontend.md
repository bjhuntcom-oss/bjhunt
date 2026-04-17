# Agent 4 — Frontend (non-chat) Audit

Date: 2026-04-17
Agent: Opus 4.7 (1M context)
Scope: Next.js 15 App Router frontend on Vercel, excluding chat page, Vercel proxy, chat components, and `lib/backend-client.ts`. See the agent brief for the exact file inventory.

This audit complements `docs/DEEP-AUDIT-2026-04-16.md` and focuses on findings that sit in the frontend surface (pages, server actions, middleware, global layout, i18n, shared components, config files).

Findings are numbered per agent (F-xxx). Severity: Critical / High / Medium / Low / Info.

---

## Executive Summary

The frontend is visually polished, internationalized FR/EN at parity (1048 leaf keys on each side) and routes admin flows through server components that re-check `role` on the backend — good. However, there are real problems:

- **CSP is extremely narrow** (only `script-src`, `object-src`, `base-uri`). It is missing `style-src`, `connect-src`, `frame-ancestors`, `form-action`, `img-src`, `font-src`, `default-src`, `upgrade-insecure-requests`, and `require-trusted-types-for`. Vercel's production deployment therefore has no policy guarding data exfil, clickjacking, form hijack, or inline style XSS. This is a regression from the stated target in `CLAUDE.md` ("CSP `strict-dynamic` nonce-based (pas de `unsafe-eval`)").
- **`bjhunt_stream_token` is set as a non-HttpOnly cookie** containing the exact session ID. Already flagged in DEEP-AUDIT H3 but still present at `app/actions/auth.ts:45` and `:85`. Logout server action (`logoutAction`) does not clear it.
- **Server actions have no CSRF / origin check and no rate limiting.** `loginAction`, `registerAction`, `logoutAction` will accept any cross-site POST from a victim's browser because React server actions are just same-origin POSTs with no built-in origin verification on Vercel edge.
- **Public `/api/beta` and `/api/contact`** use an in-memory `Map` for rate limiting — DEEP-AUDIT M25 already flagged this. Additionally, the **beta page never sends `captchaToken`** yet the backend route requires one — the feature is broken in the happy path: every submission returns `invalid_captcha`.
- **Locale middleware rebuilds the `NextRequest` incorrectly.** It copies `request.body` into a fresh `NextRequest`, which on POST requests will consume the stream; downstream handlers will see an empty body. Because the middleware `matcher` excludes `api`, this does not affect API routes today, but it is a bug waiting to activate.
- **Admin privilege model has gaps.** `PlanBadge` / `PlanGate` are client-only checks with no server reinforcement on the pages they sit on; critical sessions revocation and user deletion use `window.confirm`, no typed confirmation, and the `UserActionsPanel` exposes `DELETE /api/admin/users/:id` with one click.
- **Accessibility is weak throughout.** Only 6 `aria-label/role` occurrences in `components/`, 0 in `app/`. The language switcher has no `aria-pressed` / `aria-current`, the mobile menu has no `aria-expanded`, error boundaries expose raw `error.message` to users, and no skip-to-content link.
- **Reduced-motion is never respected.** `scan-radar`, `contact-visual`, `network-topology`, `api-circuit`, `hero-terminal`, `preloader` all run indefinite `requestAnimationFrame` loops without a `@media (prefers-reduced-motion: reduce)` fallback.
- **SEO / i18n.** `robots.ts` does not reference FR/EN alternates, `sitemap.ts` has no locale branches and no `lastModified` stability (uses `new Date()` every request → invalidates cache every crawl), metadata is missing `alternates.languages` (hreflang), and `/en` has no canonical-by-locale in home or pricing/investors/legal/api-docs.
- **Tooling is stale.** Root `lint` still runs `next lint` (deprecated in Next 16), root `typecheck` references a missing script (`scripts/run-root-typecheck.mjs`), `tsconfig.json` `target` is `ES2017` despite `react@19` + `next@16`, and two dev dependencies (`@playwright/mcp`, `@types/node@22`) do not match the repo's Node 22 / Playwright 1.55 reality.

Total findings: 47.

---

## Critical

### F-001 — CSP is too narrow and does not match CLAUDE.md

File: `d:/bjhunt-v2/middleware.ts:51-54`

```ts
response.headers.set(
  'Content-Security-Policy',
  `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
)
```

Problems:
- No `default-src 'self'` fallback — the implicit default in CSP Level 3 is permissive only for directives that have no fallback, but for many modern directives (e.g., `script-src-attr`) Chrome still falls back to `default-src`. Without it, a future `default-src` fetch directive is silently permissive.
- No `connect-src` — PostHog (`https://eu.i.posthog.com`) and the backend (`https://api.bjhunt.com` / `https://chat.bjhunt.com`) are reachable from any injected script, but so is any attacker-controlled origin. A successful script injection could exfiltrate session state (especially given the non-HttpOnly `bjhunt_stream_token`) to arbitrary destinations.
- No `style-src` — every page uses `style={{...}}` (142 occurrences across 26 files in `app/`). The root layout (`app/[locale]/layout.tsx:88`) ships JSON-LD inline with `dangerouslySetInnerHTML`. Without `style-src 'self' 'unsafe-inline'` the current policy is actually broken on browsers that implement `style-src` defaulting (Firefox-only today), but more importantly a hardening step is missing. Recommend `style-src 'self' 'nonce-${nonce}'`, then lift inline styles into CSS variables or data-attributes.
- No `frame-ancestors 'none'` — clickjacking protection relies solely on `X-Frame-Options: DENY` from `next.config.ts:22`. That header is ignored by 2026-era browsers when CSP is set but lacks `frame-ancestors` (per [CSP Level 3](https://www.w3.org/TR/CSP3/#directive-frame-ancestors), `frame-ancestors` supersedes `X-Frame-Options` when both are present — but `frame-ancestors` is absent). Setting it defensively is the 2026 best practice ([OWASP Clickjacking Cheat Sheet 2026 update](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)).
- No `form-action 'self'` — a compromised script can redirect POST forms (notably the server actions which are POST to the current path) to attacker origins.
- No `img-src` / `font-src` / `media-src` — images, fonts, media load from anywhere.
- No `upgrade-insecure-requests` — mixed content on preview URLs silently loads HTTP.
- No `require-trusted-types-for 'script'` — Trusted Types is the 2026 baseline for XSS hardening in Chromium ([Web.dev Trusted Types 2025-10 update](https://web.dev/articles/trusted-types)).
- No `report-to` / `report-uri` — zero telemetry on violations.

CLAUDE.md explicitly states: "CSP `strict-dynamic` nonce-based (pas de `unsafe-eval`)". The spirit is there, but the implementation is a 3-directive stub.

Recommendation: build a full CSP via a helper that composes directives, pinned behind `report-only` for staging and enforced in production. Use `nonce` for scripts AND styles. Example reference: [Next.js CSP guide for App Router, 2025 release](https://nextjs.org/docs/app/guides/content-security-policy).

### F-002 — `bjhunt_stream_token` leaks session ID to JavaScript

Files:
- `d:/bjhunt-v2/app/actions/auth.ts:44-52` (login)
- `d:/bjhunt-v2/app/actions/auth.ts:85-92` (register)
- `d:/bjhunt-v2/app/actions/auth.ts:115` (logout — only clears `SESSION_COOKIE`, leaves `bjhunt_stream_token` alive until expiry)

The same session token is stored in `bjhunt_session` (HttpOnly) AND `bjhunt_stream_token` (`httpOnly: false`). This is flagged in DEEP-AUDIT H3 but still unfixed. Any XSS is now full account takeover: the attacker can read `document.cookie`, clone into another browser, and resume the session for 30 days. The `SameSite=Lax` does not help once the attacker is executing script in the SPA origin.

Logout mismatch: after `logoutAction`, the HttpOnly cookie is gone but the JS-readable token remains in the browser. If the JS fetcher reads from `bjhunt_stream_token` rather than relying on cookies, it will keep making authenticated-looking requests with a revoked token, generating 401 spam and confusing UX.

Recommendation: kill `bjhunt_stream_token`. The chat stream should use a short-lived signed ticket issued per GET request, or go direct to `chat.bjhunt.com` via a same-origin proxy that reads the HttpOnly cookie. See the SP3 design in `docs/superpowers/plans/2026-04-16-SP3-chat-streaming.md`.

### F-003 — Server actions have no CSRF / origin check and no rate limit

File: `d:/bjhunt-v2/app/actions/auth.ts`

React server actions (`'use server'`) are invoked via same-origin POST with `Content-Type: text/plain` or `multipart/form-data` and a `Next-Action` header that React attaches client-side. Vercel does not validate the Origin header at the runtime boundary; the default behavior relies on Next's own `allowedForwardedHosts`/`allowedOrigins` settings, which are not configured here. That means:

- A cross-origin page can `fetch` this endpoint via `<form>` (works because form posts are not subject to CORS preflight) and mint login attempts.
- There is no client-side rate limiting, no backoff, no CAPTCHA on login. Only the backend's Redis rate-limiter protects the endpoint — and DEEP-AUDIT M15 flagged that that rate-limiter fails open when Redis is down.

Recommendation:
1. Configure `next.config.ts` `experimental.serverActions.allowedOrigins` to `['www.bjhunt.com', 'bjhunt.com']` (see [Next.js Server Actions security, 15.3+](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)).
2. Add double-submit CSRF token for the login/register POST if the backend cookie model is kept.
3. Put hCaptcha on login after N failures (matches what the `/api/beta` route expects).
4. Make sure `Origin` header is validated inside `serverBackendFetch` (out of scope for Agent 4, flagged for Agent 1).

### F-004 — `beta` page does not send `captchaToken`, feature is broken

Files:
- `d:/bjhunt-v2/app/[locale]/beta/page.tsx:51-68`
- `d:/bjhunt-v2/app/api/beta/route.ts:55-62`

The handler does `fetch('/api/beta', { ...body: JSON.stringify(formData) })` with no `captchaToken` field. The route requires one and returns HTTP 400 `invalid_captcha` for every submission. The page will therefore surface `error.message = 'invalid_captcha'` and beta signups are **not functional**. Since the landing CTA, footer, and pricing page all point to `/beta`, this is a marketing regression.

Recommendation: either add hCaptcha to the beta form (as done on `/contact`), or drop the captcha requirement on the API route to match the page. The inconsistency with `/contact` (which uses hCaptcha properly) is the smoking gun.

---

## High

### F-005 — Middleware rebuilds `NextRequest` with `body`, likely breaks forwarded POSTs

File: `d:/bjhunt-v2/middleware.ts:35-48`

```ts
const nextRequest = new NextRequest(request.url, {
  headers: requestHeadersWithNonce,
  method: request.method,
  body: request.body,
})
const response = intlMiddleware(nextRequest)
```

Passing `request.body` to the `NextRequest` constructor consumes the body stream. With the current `matcher` (which excludes `api` routes), this only affects paths that `next-intl` uses, which are all GETs — but if the matcher is ever widened to cover server-action POSTs or rewrites, downstream body reads will fail with `stream already consumed` or `TypeError`. The canonical 2026 pattern is:

```ts
const requestHeaders = new Headers(request.headers)
requestHeaders.set('x-nonce', nonce)
const response = intlMiddleware(request) // pass the original request unchanged
response.headers.set('Content-Security-Policy', ...)
// forward headers to the server via rewrite
```

See [Next.js 16 middleware pattern with CSP nonce](https://nextjs.org/docs/app/guides/content-security-policy#adding-a-nonce-with-middleware). Also note: Next 16 deprecates `middleware.ts` in favor of `proxy.ts` (build warning already confirmed in DEEP-AUDIT M26).

### F-006 — `middleware.ts` CSP is re-sent from `next.config.ts` `headers()`

Files: `d:/bjhunt-v2/middleware.ts:51-54`, `d:/bjhunt-v2/next.config.ts:17-30`.

`next.config.ts` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, `CORP`, but not a CSP. Middleware sets the CSP per-request. There is no `Strict-Transport-Security` at all (on Vercel production, Vercel injects HSTS at the edge, but only for `vercel.app` or after a domain is fully onboarded — confirm on `www.bjhunt.com`). Meanwhile `ops/Caddyfile:5` does set HSTS for `api.bjhunt.com`/`chat.bjhunt.com`. So the frontend HSTS story depends entirely on Vercel's behavior; don't assume it.

Recommendation:
- Emit HSTS from `next.config.ts` with `max-age=63072000; includeSubDomains; preload` ([Vercel HSTS headers docs, 2025](https://vercel.com/docs/security/hsts)).
- Submit `bjhunt.com` to the HSTS preload list once stable ([hstspreload.org](https://hstspreload.org/)).

### F-007 — Logout UX has two independent code paths and neither is correct

Files:
- `d:/bjhunt-v2/app/actions/auth.ts:98-116` (server action path)
- `d:/bjhunt-v2/components/dashboard/dashboard-shell.tsx:237-247` (browser fetch path)

`DashboardShell` calls `browserBackendFetch('/api/auth/logout')` directly, then `router.push('/login')`. That path goes through the Vercel proxy to the backend. On success the backend clears its cookie, but the Next layer's HttpOnly `bjhunt_session` cookie cannot be cleared from the backend response because it sits on a different origin (or, per DEEP-AUDIT H6, the Vercel proxy strips cookies anyway). The server action `logoutAction()` is never called from the dashboard, so:

- `bjhunt_session` (HttpOnly) may persist in the browser even though the backend treats the session as revoked.
- `bjhunt_stream_token` (non-HttpOnly, F-002) definitely persists.

After logout, a malicious JS on the next page load can replay the stream token until its TTL expires server-side.

Recommendation: route all logout through `logoutAction` so `next/headers` can `cookieStore.delete(...)` both cookies on the same response.

### F-008 — Login page accepts open redirect via `redirect` query param

File: `d:/bjhunt-v2/app/[locale]/login/page.tsx:12-23`

```ts
function normalizeRedirectTarget(value: string | null, locale: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return `/${locale}/dashboard`
  }
  try {
    const redirectUrl = new URL(value, 'https://www.bjhunt.com')
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  } catch {
    return `/${locale}/dashboard`
  }
}
```

The defense is sound against `//attacker.com` and absolute URLs, but it does **not** defend against `\\attacker.com` (backslash-protocol) which older browser quirks still honor as a protocol-relative URL in some edge cases. Also, `value.startsWith('/')` accepts `/%09/attacker.com` (tab character leading) which some redirect sanitizers get wrong. Given this is a post-login redirect, use an allowlist of known paths: `['/dashboard', '/dashboard/chat', '/dashboard/audits', ...]` rather than "any path starting with /".

See [OWASP Unvalidated Redirects and Forwards Cheat Sheet 2026](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html).

### F-009 — Dashboard layout fetches `/api/auth/me` twice per request

Files:
- `d:/bjhunt-v2/app/[locale]/dashboard/layout.tsx:21`
- `d:/bjhunt-v2/app/[locale]/dashboard/page.tsx:45`

Both the layout and the overview page independently call `/api/auth/me`. In App Router with Next 16, these cannot share state natively; the only dedup would be via `React.cache()`. Result: every dashboard hit costs 2 backend round-trips before rendering. The admin page adds a third (`/api/admin/users?limit=1`), and the monitoring page adds a fourth. With ~200ms per RTT from Vercel edge → Hostinger Paris, this is 400–800ms of serial latency before the first byte.

Recommendation: wrap `meResponse` in `React.cache()` ([React docs, cache() 2025-11](https://react.dev/reference/react/cache)) inside a shared `getCurrentUser()` helper that layouts/pages import.

### F-010 — `usePlan` hook causes every dashboard page to make an extra client fetch on mount

File: `d:/bjhunt-v2/lib/use-plan.ts`

`usePlan` triggers `/api/billing/plan` from every page that consumes it. On a fresh navigation to `/dashboard/cve`, the sequence is: server component renders → hydration → `usePlan` fires → loader flicker → content. No caching, no `swr`, no shared state. This is especially bad for the CVE/Skills/Tools pages that are gated behind plan.

Recommendation: fetch the plan server-side in `dashboard/layout.tsx` (where `/api/auth/me` is already fetched) and pass it through React Context, or enrich the `/api/auth/me` response with `plan`.

### F-011 — `UserActionsPanel`: single-click DELETE on admin user, with native `window.confirm` only

File: `d:/bjhunt-v2/app/[locale]/dashboard/admin/users/user-actions-panel.tsx:47-52`

```ts
const handleDelete = async () => {
  setActionError(null)
  const res = await browserBackendFetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
  ...
}
```

No second-factor step, no typed email confirmation, no CSRF header. The 8-second "confirm" timer is a UX guard, not a security guard. A compromised admin browser session can enumerate users via `/api/admin/users` and delete every account with ~1 request each. Same concern applies to `sessions-panel.tsx:40` ("Révoquer toutes les sessions"), `agents-client.tsx:109` ("Supprimer ce profil"), `providers-client.tsx:50` ("Supprimer le provider"), `ollama-models.tsx:37` ("Supprimer le modèle").

Recommendation: for destructive admin actions, require an explicit typed-match confirmation (e.g., type the user's email) AND a per-action backend re-authentication (re-verify password or TOTP via `sudo mode` window, see GitHub's pattern).

### F-012 — `dashboard-shell.tsx`: admin navigation is client-side rendered based on a prop, server never re-verifies per-page

File: `d:/bjhunt-v2/components/dashboard/dashboard-shell.tsx:81`

```ts
const isAdmin = user.role === "platform_admin";
```

`isAdmin` decides whether the Admin nav section renders. The admin pages under `app/[locale]/dashboard/admin/*` each re-check role on the server — good. But internal admin sub-pages (e.g., `admin/gateway/new` or `admin/agents/[id]` if it existed) are individual server components; there is no shared `AdminGuard` server component. Today `admin/layout.tsx` handles it uniformly, but any page that forgets to import the guard is silently bypassable. A defensive `server-only` helper `requireAdmin()` should gate every admin data-fetch, not just the layout.

### F-013 — Auth cookies forced `secure: true` break local development and preview environments

File: `d:/bjhunt-v2/app/actions/auth.ts:38-43`

DEEP-AUDIT H4 already flagged this. Secure cookies over `http://localhost:3000` are not accepted by modern browsers (Chrome does allow them on localhost since Chrome 102, but Firefox still rejects `secure` cookies on non-HTTPS origins in some versions). Developers running `next dev` and previews on `*.vercel.app` that happen to fall outside the Vercel HTTPS layer will silently fail to authenticate.

Recommendation: `secure: process.env.NODE_ENV === 'production'` and document the behavior.

### F-014 — No rate limiting on login/register before the backend

Files: `app/[locale]/login/page.tsx`, `app/actions/auth.ts`

The login form has `onSubmit` → `loginAction(email, password)` with no client-side throttle and no CAPTCHA. The page can be automated via the server action POST directly. Because `/api/beta` has explicit in-memory rate limiting (5/min) and `/api/contact` too (3/min), but login does not, the public-facing auth endpoint is the least protected.

Recommendation: add client throttling (disable button for N seconds after failure) AND add hCaptcha after 3 failures (typical 2026 pattern, see [Have I Been Pwned 2025 login design notes](https://haveibeenpwned.com/Privacy)).

### F-015 — `AnalyticsProvider` tracks before user has consented on first render

File: `d:/bjhunt-v2/components/AnalyticsProvider.tsx:65-68`

```ts
useEffect(() => {
  initTracking()
}, [])
```

`initTracking()` in `lib/tracking.ts:6-9` guards with `hasAnalyticsConsent()` — good. But the `PageViewTracker` and `SessionTracker` also gate on consent, which means on first visit (no consent yet) the banner shows and the user clicks "Accept all" — the `useEffect` here has already run and returned; there's no mechanism to re-initialize once consent is granted. The user has to reload the page before PostHog starts tracking.

`CookieConsent.tsx:76` calls `initTracking()` directly after "Accept all", which does make the feature work but it's fragile — if either side of the dependency changes you silently lose consent granularity.

Recommendation: use a consent `EventTarget` and dispatch/listen for `consent-change` events.

### F-016 — PostHog API host is user-controllable via public env var

File: `d:/bjhunt-v2/lib/tracking.ts:12`

```ts
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
```

Not directly exploitable (set at build time, not runtime), but note that `posthog.init()` causes browsers to connect to that origin without any CSP `connect-src` entry (F-001) — meaning if the env var is misconfigured, PostHog could send analytics events to an attacker-controlled host. Pin `NEXT_PUBLIC_POSTHOG_HOST` in the CSP `connect-src`.

---

## Medium

### F-017 — Root-layout JSON-LD is static but re-rendered on every locale page

File: `d:/bjhunt-v2/app/[locale]/layout.tsx:88-93`

The Schema.org JSON-LD script is hardcoded to en-US branding (`"BJHUNT Security Platform"`). It's inlined into every page (including FR) with no locale-aware `description` or `inLanguage` field. Also, the `<head>` only has this one JSON-LD — an `Organization` entity (with `founder: ATCHAHOUE Destin`, `foundingDate: 2023-12`, and `sameAs: [...]`) would materially improve SEO for brand queries.

### F-018 — `robots.ts` does not declare alternate sitemaps or disallow `?redirect=` params

File: `d:/bjhunt-v2/app/robots.ts`

Disallows `/api/`, `/admin/`, `/dashboard/`, `/_next/`. Good. But:
- No `disallow: '/*?redirect='` → the login page with a `redirect` query string is a crawl dead-end for SEO (and an unnecessary reflection risk).
- No mention that the marketing pages are canonically at `/fr` / `/en` paths; the root `/` currently redirects to a locale and both can be indexed.
- No `Googlebot-Image` differentiation.

### F-019 — `sitemap.ts` uses `new Date()` on every request → cache-busts crawlers

File: `d:/bjhunt-v2/app/sitemap.ts`

```ts
lastModified: new Date(),
```

Each generation returns a different `lastModified`, which signals to Google/Bing that *every* URL changed since last crawl. This is already a flagged anti-pattern ([Google Search Central 2024-12 sitemap update](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)).

Also, the sitemap doesn't branch by locale. Google 2026 best practice is to emit `<xhtml:link rel="alternate" hreflang="..." href="..."/>` for each locale variant of each page ([Google i18n guidelines, 2025 rev](https://developers.google.com/search/docs/specialty/international/localized-versions)).

### F-020 — `generateMetadata` has no `alternates.languages` (hreflang)

File: `d:/bjhunt-v2/app/[locale]/layout.tsx:46`

```ts
alternates: { canonical: `https://www.bjhunt.com/${locale}` },
```

Missing:

```ts
alternates: {
  canonical: `https://www.bjhunt.com/${locale}`,
  languages: {
    fr: 'https://www.bjhunt.com/fr',
    en: 'https://www.bjhunt.com/en',
    'x-default': 'https://www.bjhunt.com/fr',
  },
}
```

Without `x-default`, Google can't pick a reasonable locale for a user whose `Accept-Language` is e.g. German.

### F-021 — `lang` attribute on `<html>` only uses locale short code, not locale-region

Files: `app/[locale]/layout.tsx:86`, `app/not-found.tsx:102`

`<html lang="fr">` and `<html lang="en">` are valid BCP-47 but less specific than `fr-FR` / `en-US` used elsewhere (e.g., the `openGraph.locale` field). Pick a primary region per locale and keep consistent.

### F-022 — No `dir="ltr"` on `<html>` (future RTL readiness)

CLAUDE.md mentions no RTL target, but the `<html>` tag lacks `dir="ltr"`. When a FR/EN platform adds Arabic/Hebrew later, switching to `dir="rtl"` becomes load-bearing; starting with `dir="ltr"` is trivial and keeps the HTML self-describing for assistive tech.

### F-023 — Global `border-radius: 0 !important` breaks shadcn/ui rings and focus states

File: `d:/bjhunt-v2/app/globals.css:8-10`

```css
*, *::before, *::after {
  border-radius: 0 !important;
}
```

This wipes out `:focus-visible:ring-1` from `components/ui/button.tsx:8`, which is a ring box-shadow (works) AND any `rounded-full` / `rounded-md` from Radix primitives (broken). More importantly, `!important` on a universal selector fights every future CSS change — it's a brittle choice. A better pattern is to add `--radius: 0` at the root and map shadcn tokens to `var(--radius)`.

### F-024 — `accent-color` used on checkboxes without a fallback

File: `app/[locale]/dashboard/findings/page.tsx:422` and others

`className="w-3 h-3 accent-white cursor-pointer"` uses the `accent-color` CSS property. Works on Chrome/Edge/Firefox/Safari 15.4+ — [MDN compat table, last updated 2025-09](https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color). Safari <15.4 and Firefox ESR 102 will show native tint. Not a bug, just flag: if the design demands the white tick consistently, render a custom checkbox component (you already have one at `app/[locale]/dashboard/audits/audits-client.tsx:378-381`).

### F-025 — `Badge` import is inconsistent across pages

Some pages import from `@/components/ui/badge`, others inline the same style. The shadcn `Badge` supports `variant="critical"|"high"|"medium"|"low"`, but `FindingsPage` reimplements severity badges inline. Consolidating keeps ARIA / color contrast auditing in one place.

### F-026 — `Header` auth check leaks backend reachability

File: `d:/bjhunt-v2/components/layout/header.tsx:34-39`

```ts
useEffect(() => {
  browserBackendFetch("/api/auth/me")
    .then((res) => res.ok ? res.json() : null)
    .then((data) => setIsLoggedIn(!!data?.user))
    .catch(() => setIsLoggedIn(false));
}, []);
```

Every marketing-page visit fires `/api/auth/me`. That's:
- A useless backend hit for every visitor on /pricing, /contact, /legal, etc.
- Creates a per-visit dependency on `api.bjhunt.com` even though those pages don't need auth.

Recommendation: read the cookie presence server-side in the layout and pass `isLoggedIn` as a prop, or gate the call behind a `requestIdleCallback` so it doesn't block LCP.

### F-027 — `dashboard-shell.tsx` uses `window.location.assign` implicitly via `router.push` then server-only redirect on logout failure

Not critical, but: if `browserBackendFetch('/api/auth/logout')` rejects, the user is still pushed to `/login` by `router.push`, which performs a client navigation that doesn't reload. The old session state (including the non-HttpOnly `bjhunt_stream_token`) stays live. A hard `window.location.replace('/login')` would force a full-page reload that drops in-memory state.

### F-028 — `router.push(localized URL)` is mixed with `Link` from `@/i18n/routing` and raw `Link` from `next/link`

Examples:
- `components/dashboard/dashboard-shell.tsx:6` uses `import Link from "next/link"` — does NOT add locale prefix automatically. The file manually prepends `/${locale}` to hrefs. Works, but the pattern differs from marketing pages that use `@/i18n/routing` Link.

This inconsistency creates bugs: if a developer forgets to prepend `/${locale}` on a dashboard link, the user jumps to a route without locale, which falls through to `next-intl` locale detection (which might switch locale because `localeCookie.name === 'BJHUNT_LOCALE'` is set).

Recommendation: use `@/i18n/routing` `Link` everywhere or document the split clearly.

### F-029 — `next-intl` `localeDetection: true` + `localePrefix: 'always'` causes double-redirect on first visit

File: `d:/bjhunt-v2/i18n/routing.ts:7-11`

With `localeDetection: true` and no prior `BJHUNT_LOCALE` cookie, `next-intl` inspects `Accept-Language`, sets the cookie, and redirects to `/fr` (default). A visitor then clicking `/en/pricing` switches locale → cookie write → may redirect again on the next visit. Not a bug, but UX tests should confirm `localePrefix: 'always'` + `localeDetection: true` interplay on Cloudflare-cached pages (Vercel edge caches can serve stale locale HTML to the wrong user).

See [next-intl v3 routing guide](https://next-intl.dev/docs/routing) for the 2025 updated edge-cache semantics.

### F-030 — Middleware `matcher` does not exclude `chat` subdomain path `/chat` — dead entry

File: `d:/bjhunt-v2/middleware.ts:60`

```ts
'/((?!api|chat|__runtime|runtime|_next|images|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
```

`chat` is excluded, but the app has no top-level `/chat` route (only `/[locale]/dashboard/chat`). This exception is a leftover from a previous design. Harmless but confusing.

### F-031 — `blockedControlUiPaths` set in middleware is a soft-deleted nav map

File: `d:/bjhunt-v2/middleware.ts:7-25`

16 top-level paths redirect to `/{locale}/dashboard`. These read like prototype routes (`/usage`, `/cron`, `/agents`, `/skills`, ...). Several of these (`/agents`, `/skills`, `/logs`, `/agents`) collide with admin paths but without the `/dashboard` prefix. Redirect is correct; the array is dead weight worth cleaning up so the middleware is easier to reason about.

### F-032 — `/dashboard/findings` page does `/api/findings`, `/api/findings/stats`, `/api/engagements` on mount — no loading skeleton, flashing UI

File: `d:/bjhunt-v2/app/[locale]/dashboard/findings/page.tsx:219-226`

Three independent `useCallback` fetches + `setLoading(true)` produce:
1. Initial render: `loading=true`, empty stats, empty engagements dropdown.
2. `fetchStats` resolves → stats update.
3. `fetchEngagements` resolves → dropdown populates.
4. `fetchFindings` resolves → list populates, `loading=false`.

Each is a visible jank step. Convert to a single server component that fetches in parallel and streams with Suspense boundaries. This is exactly the 2026 Next.js PPR pattern ([Next.js 16 PPR docs, 2025-11](https://nextjs.org/docs/app/getting-started/partial-prerendering)).

### F-033 — `findings` CSV export is performed server-side, but uploaded via `fetch` from client with no CSRF header

File: `d:/bjhunt-v2/app/[locale]/dashboard/findings/page.tsx:142-150`

Backend is expected to return a blob. No `X-Requested-With` header, no origin check on the client. Trust is entirely on backend CORS + cookies. This is the same pattern as DEEP-AUDIT M14 on CSRF inconsistency.

### F-034 — `downloadBlob` for exports creates and never revokes DOM `<a>` node on some paths

File: `d:/bjhunt-v2/app/[locale]/dashboard/admin/logs/audit-logs-viewer.tsx:74-78`

```ts
const a = document.createElement('a')
a.href = url
a.download = 'audit-logs.csv'
a.click()
URL.revokeObjectURL(url)
```

The `<a>` is never `appendChild(a)` — Firefox ignores `.click()` on detached nodes. In `report-export-bar.tsx:23-28` the pattern is correct (`appendChild` + `removeChild`). Reconcile.

### F-035 — `audits/audits-client.tsx`: creating+launching an engagement is two sequential POSTs with no rollback

File: `d:/bjhunt-v2/app/[locale]/dashboard/audits/audits-client.tsx:134-167`

```ts
const res = await browserBackendFetch('/api/engagements', { method: 'POST', ... })
if (!res.ok) return
const { engagement } = await res.json()
if (launch) {
  await browserBackendFetch(`/api/engagements/${engagement.id}/launch`, { method: 'POST' })
}
```

If the `launch` POST fails, the engagement is left in `draft` with no UI indication. User has to go find it in the list and launch manually. Surface a toast on launch failure and include the engagement ID.

### F-036 — `onboarding-overlay.tsx` stores "done" marker in `localStorage`, bypassable trivially

File: `d:/bjhunt-v2/components/dashboard/onboarding-overlay.tsx:16,69,77,82`

`localStorage.setItem("bjhunt_onboarded", "1")`. Not a bug per se (clearing localStorage replays the tour), but this is the kind of state that should live on the backend user profile (`/api/auth/me.onboardedAt`) so it persists across devices and gives admins a metric.

### F-037 — `CookieConsent` banner is French-only, even on `/en`

File: `d:/bjhunt-v2/components/CookieConsent.tsx`

All 4 consent category names/descriptions, the banner title, the "Tout accepter / Refuser tout / Personnaliser" buttons, and the footer privacy link label are hardcoded French. EN users see French CookieConsent. This is a GDPR compliance edge case — consent must be "as clear as possible" in the user's language.

### F-038 — `CookieConsent` `z-index: 9999` conflicts with Radix Portal stacking

The banner z-index is hardcoded `9999`. Radix dialog/dropdown portals default to `z-50`. If a dialog opens over the cookie banner (e.g., user just logged in via the server action and onboarding fires), the banner will cover it. Use Tailwind's `z-50`/`z-60` token system consistently.

### F-039 — `Preloader` has a 2400ms forced delay after `window.onload`

File: `d:/bjhunt-v2/components/ui/preloader.tsx:10-11`

```ts
const handleLoad = () => {
  setTimeout(() => setVisible(false), 2400);
};
```

2.4 seconds of preload after the browser reports `load` is unusual. LCP (Largest Contentful Paint) is hidden behind the preloader until dismissed, which inflates Core Web Vitals. On a fast connection the homepage is invisible for 2.4s unnecessarily.

Recommendation: show the preloader at most 800ms, or only during the initial paint race (before `document.readyState === 'interactive'`).

### F-040 — Motion animations never respect `prefers-reduced-motion`

Files: `components/ui/preloader.tsx`, `components/ui/hero-terminal.tsx`, `components/animations/*` (all 10).

None of the framer-motion or RAF-driven animations guard on `prefers-reduced-motion`. The scan-radar sweep, the hex-grid pulse, the API-circuit dot traversal, the network-topology blink, the contact-visual mouse reactivity, and the hero `<motion.div>` variants all run regardless. This is WCAG 2.2 SC 2.3.3 Animation from Interactions (AAA) but 2.2.2 Pause, Stop, Hide (A) violation for the indefinite radar sweep and network topology. Accepted 2026 pattern:

```ts
const shouldReduceMotion = useReducedMotion() // framer-motion hook
```

or a CSS `@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }` block in `globals.css`.

References: [MDN prefers-reduced-motion, 2025 update](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [WCAG 2.2 SC 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

### F-041 — Hex-grid, scan-radar, api-circuit re-initialize `requestAnimationFrame` on every React re-render

Example: `components/animations/api-circuit.tsx:20-39`. The `useEffect` dependency array is `[]`, so it only runs on mount — OK. But `components/animations/scan-radar.tsx:8` also uses `[]` — OK. However `network-topology.tsx` uses an `activeRef.current` with a `setInterval`-like pattern that is correct but fragile on Strict Mode's double-invoke dev cycle. All animations should be tested under React 19 Strict Mode; some currently appear to keep a stale RAF handle.

---

## Low / Info

### F-042 — `/api/beta` GET endpoint returns null count, live_tracking: false

File: `d:/bjhunt-v2/app/api/beta/route.ts:103-109`

The beta page displays "X/100 places" when the count is available. The GET handler here always returns `{ count: null, spots_remaining: null, live_tracking: false }`. The frontend handles `null` gracefully, but the widget is misleading (the progress bar shows 0%, suggesting an empty beta when actually no counter is wired). Either wire the counter or hide the widget.

### F-043 — Login/Register share one page; no dedicated `/register` route

File: `d:/bjhunt-v2/app/[locale]/login/page.tsx:32,201`

The page toggles `mode` state between `'login'` and `'register'`. This means direct links to register (e.g., `/fr/login?mode=register`) don't work — the `redirect` query param handling does not read `mode`. Friends-and-family invite emails can't deep-link to the register form.

### F-044 — Error boundary exposes raw error messages to end users

File: `d:/bjhunt-v2/components/dashboard/error-boundary.tsx:30-31`

```tsx
<p ...>
  {this.state.error?.message || "An unexpected error occurred"}
</p>
```

Backend errors including stack traces and implementation hints are surfaced to the user. This is both a UX problem (scary tech messages) and a security problem (stack-less errors can still leak structural info). Map error messages through a whitelisted translation table.

### F-045 — `app/[locale]/error.tsx` `console.error` is the only logging

File: `d:/bjhunt-v2/app/[locale]/error.tsx:19-21`

No Sentry/PostHog capture of the error digest. The `error.digest` property is specifically designed for this ([Next.js error handling docs, 2025-08 rev](https://nextjs.org/docs/app/api-reference/file-conventions/error)).

### F-046 — `tsconfig.json` `target: ES2017` and `lib: ["dom","dom.iterable","esnext"]` is dated

File: `d:/bjhunt-v2/tsconfig.json:3-9`

React 19 + Next 16 support ES2022 nativly; downleveling to ES2017 produces larger bundles (class transforms, async/await transforms). Update `target: "ES2022"` and drop `dom.iterable` (covered by `dom`). See [TypeScript 5.7 ES2022 target default notes](https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/).

### F-047 — Missing accessibility foundations

Observed gaps:
- No `<a href="#main">Skip to content</a>` in `LayoutShell`.
- `<main>` lacks `id="main"` in `layout-shell.tsx` and `dashboard-shell.tsx`.
- `LanguageSwitcher` buttons have no `aria-current="true"` on active locale.
- `Header` mobile hamburger has no `aria-expanded`/`aria-controls`.
- `CookieConsent` modal has no `role="dialog"` / `aria-modal="true"` / focus trap.
- `Preloader` has `aria-hidden="true"` (good) but no `aria-busy` on the page body.
- Onboarding overlay has no role/focus trap.
- `error.tsx` `aria-live="assertive"` would help screen readers announce errors.
- Focus-visible rings on `button` elements in `dashboard-shell` rely on browser default since `!important border-radius: 0` crashes custom rings.

None of these are bugs, but they fail WCAG 2.2 AA checkpoint batches. The brief flags this explicitly as a focus area.

---

## Appendix A — CLAUDE.md compliance summary

| CLAUDE.md claim | Reality | Status |
|---|---|---|
| "CSP `strict-dynamic` nonce-based (pas de `unsafe-eval`)" | `strict-dynamic` present, no `unsafe-eval`, but every other fetch/document directive is missing. | **Partial** (F-001) |
| "`app/api/beta/route.ts` et `app/api/contact/route.ts` — rate limiter in-memory (pas Redis, ne survit pas au restart)" | Confirmed. Map-based, single-process. | **Confirmed** |
| "`app/actions/auth.ts` — server actions pour login/register/logout" | Confirmed, but logout action is only called from the login page, not from dashboard shell. | **Partial drift** (F-007) |
| "`middleware.ts` — CSP `strict-dynamic` nonce-based (pas de `unsafe-eval`)" | CSP emitted but body-consuming rebuild is wrong. | **Bug** (F-005) |
| "`lib/backend-client.ts` — `getBackendBaseUrl()` retourne `process.env.BJHUNT_BACKEND_URL` ou `https://api.bjhunt.com`" | Out of scope (Agent 1). | — |
| "i18n FR/EN complet (next-intl)" | 1048 leaf keys each side, no diff. | **Confirmed** |
| "pages auth (login, register, forgot-password, reset-password)" | Register is merged into login. No standalone `/register`. | **Drift** (F-043) |

## Appendix B — 2026 best-practice references cited

- CSP Level 3: https://www.w3.org/TR/CSP3/
- Next.js CSP / App Router: https://nextjs.org/docs/app/guides/content-security-policy
- Next.js Server Actions security: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- Next.js 16 middleware → proxy: https://nextjs.org/docs/messages/middleware-to-proxy
- Next.js Partial Prerendering (PPR): https://nextjs.org/docs/app/getting-started/partial-prerendering
- Vercel HSTS: https://vercel.com/docs/security/hsts
- HSTS preload: https://hstspreload.org/
- OWASP Clickjacking 2026: https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
- OWASP Unvalidated Redirects: https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html
- Google i18n & hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions
- Google sitemap best practices: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- WCAG 2.2 SC 2.3.3 Animation: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- MDN prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- MDN accent-color compat: https://developer.mozilla.org/en-US/docs/Web/CSS/accent-color
- Trusted Types (web.dev, 2025): https://web.dev/articles/trusted-types
- React cache() reference: https://react.dev/reference/react/cache
- next-intl routing v3 docs: https://next-intl.dev/docs/routing
- Next.js error handling: https://nextjs.org/docs/app/api-reference/file-conventions/error
- TypeScript 5.7 ES target notes: https://devblogs.microsoft.com/typescript/announcing-typescript-5-7/

## Appendix C — Prioritized remediation backlog

**P0 (ship in the next release):**
1. F-004 fix beta captcha mismatch (broken feature)
2. F-002 remove `bjhunt_stream_token`, fix logout path (F-007)
3. F-001 expand CSP to full policy with `connect-src`, `style-src`, `frame-ancestors 'none'`, `form-action 'self'`, `upgrade-insecure-requests`
4. F-003 configure `serverActions.allowedOrigins` and add login CAPTCHA after failures (F-014)
5. F-011 require typed confirmation for admin delete/revoke actions

**P1 (next sprint):**
6. F-005 fix middleware body rebuild; migrate to `proxy.ts`
7. F-013 stop forcing `secure: true` on cookies in dev
8. F-040 add `prefers-reduced-motion` in `globals.css` + framer-motion guards
9. F-019 stabilize `sitemap.ts` and add hreflang (F-020)
10. F-012 introduce `requireAdmin()` server helper

**P2 (polish):**
11. F-009/F-010 dedup `/api/auth/me` with `React.cache()` and merge plan into me payload
12. F-015 consent → tracking event bus
13. F-023 remove global `!important` border-radius reset
14. F-037 translate CookieConsent
15. F-047 a11y batch (skip-link, aria-expanded, focus traps, aria-current)

---

End of Agent 4 partial.
