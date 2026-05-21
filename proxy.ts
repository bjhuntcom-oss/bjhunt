import createMiddleware from 'next-intl/middleware'
import { NextRequest } from 'next/server'
import { routing } from './i18n/routing'

const intlMiddleware = createMiddleware(routing)

function buildCspHeader(nonce: string): string {
  const connectSrc = [
    "'self'",
    'https://api.hcaptcha.com',
    'https://eu.i.posthog.com',
    'https://app.posthog.com',
    'https://us.i.posthog.com',
    'https://api.bjhunt.com',
    'https://chat.bjhunt.com',
    'wss://chat.bjhunt.com',
  ]

  const directives: Record<string, string[] | null> = {
    'default-src': ["'self'"],
    'script-src': [
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "'unsafe-inline'",
      "'unsafe-eval'",
      'https:',
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'style-src-elem': ["'self'", "'unsafe-inline'"],
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': connectSrc,
    'frame-src': ['https://newassets.hcaptcha.com', 'https://hcaptcha.com'],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'data:', 'blob:'],
    'upgrade-insecure-requests': [],
    'report-uri': ['/api/security/csp-report'],
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

export default async function proxy(request: NextRequest) {
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
  response.headers.set('Reporting-Endpoints', 'default="/api/security/csp-report"')
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next|images|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
}
