import createMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

const blockedControlUiPaths = new Set([
  '/overview',
  '/channels',
  '/instances',
  '/sessions',
  '/usage',
  '/cron',
  '/agents',
  '/skills',
  '/nodes',
  '/config',
  '/communications',
  '/appearance',
  '/automation',
  '/infrastructure',
  '/ai-agents',
  '/debug',
  '/logs',
])

function resolveLocale(request: NextRequest) {
  return request.cookies.get('BJHUNT_LOCALE')?.value === 'en' ? 'en' : 'fr'
}

function buildDashboardRedirect(request: NextRequest) {
  return new URL(`/${resolveLocale(request)}/dashboard`, request.url)
}

// ---------------------------------------------------------------------------
// Content-Security-Policy builder
// ---------------------------------------------------------------------------
// Full policy per audit F-001. Previous version was a 3-directive stub that
// missed style-src, img-src, font-src, connect-src, frame-ancestors,
// form-action, base-uri, upgrade-insecure-requests, etc. The new policy
// tightens every fetch and document directive while keeping Next.js 16 +
// shadcn/ui inline styles working.
//
// NOTE on Trusted Types (require-trusted-types-for / trusted-types):
// NOT enabled here. Trusted Types breaks many React 19 libraries that write
// raw HTML. It is staged for W3 — a dedicated hardening wave — after we
// audit every `dangerouslySetInnerHTML`, markdown renderer, and third-party
// script for TT compatibility. Ref: https://web.dev/articles/trusted-types
// ---------------------------------------------------------------------------
function buildCspHeader(nonce: string): string {
  // Origins the app legitimately connects to via fetch/XHR/WebSocket.
  // Dev URLs are intentionally excluded.
  const connectSrc = [
    "'self'",
    'https://api.bjhunt.com',
    'https://chat.bjhunt.com',
    'https://api.hcaptcha.com',       // hCaptcha siteverify (server-side, but keep for completeness)
    'https://eu.i.posthog.com',       // PostHog EU ingest (see lib/tracking.ts default)
    'https://app.posthog.com',        // PostHog global app
    'https://us.i.posthog.com',       // PostHog US ingest (safety for env switches)
  ]

  const directives: Record<string, string[] | null> = {
    'default-src': ["'self'"],
    // 'strict-dynamic' with a nonce is enforced by CSP3-capable browsers.
    // 'unsafe-inline' + https: are fallbacks ignored by modern browsers but
    // keep old/edge browsers functional. This is the Google/OWASP recommended
    // pattern for strict CSP: https://csp.withgoogle.com/docs/strict-csp.html
    'script-src': [
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'unsafe-inline'",
      'https:',
    ],
    // Next.js 15/16 + shadcn/ui emit inline <style> for RSC streaming and
    // CSS-in-JS. Keeping 'unsafe-inline' is acceptable per OWASP 2026 CSP
    // cheat sheet when other XSS mitigations (nonce on scripts, Trusted Types
    // roadmap, framework-level escaping) are in place.
    'style-src': ["'self'", "'unsafe-inline'"],
    'style-src-elem': ["'self'", "'unsafe-inline'"],
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': connectSrc,
    // hCaptcha widget runs inside an iframe it loads itself.
    'frame-src': ['https://newassets.hcaptcha.com', 'https://hcaptcha.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'data:', 'blob:'],
    // Force HTTPS for any subresource loaded via HTTP on an HTTPS page.
    'upgrade-insecure-requests': [],
  }

  return Object.entries(directives)
    .map(([key, values]) => {
      if (values === null) return ''
      if (values.length === 0) return key
      return `${key} ${values.join(' ')}`
    })
    .filter(Boolean)
    .join('; ')
}

export default async function middleware(request: NextRequest) {
  if (blockedControlUiPaths.has(request.nextUrl.pathname)) {
    return NextResponse.redirect(buildDashboardRedirect(request))
  }

  // Generate a per-request nonce for CSP and propagate it to Server Components
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const requestHeadersWithNonce = new Headers(request.headers)
  requestHeadersWithNonce.set('x-nonce', nonce)
  const nextRequest = new NextRequest(request.url, {
    headers: requestHeadersWithNonce,
    method: request.method,
    body: request.body,
  })
  const response = intlMiddleware(nextRequest)
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', buildCspHeader(nonce))
  return response
}

export const config = {
  matcher: [
    '/((?!api|chat|__runtime|runtime|_next|images|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
}
