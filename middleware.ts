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
  response.headers.set(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'none';`
  )
  return response
}

export const config = {
  matcher: [
    '/((?!api|chat|__runtime|runtime|_next|images|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
}
