import { headers } from 'next/headers'

/**
 * Allowed origins for BJHUNT server actions.
 *
 * Per audit F-003 / C-16: React Server Actions are POSTed same-origin with a
 * `Next-Action` header, but Vercel does not validate the Origin header at the
 * runtime boundary. A cross-origin `<form>` can POST to our action endpoints
 * (form posts are exempt from CORS preflight) and mint login/register/logout
 * attempts against an authenticated user's browser.
 *
 * Defense in depth:
 *   1. `experimental.serverActions.allowedOrigins` in `next.config.ts`
 *      (handled by Next.js at the framework level).
 *   2. Explicit Origin check at the top of every action in this folder
 *      (this helper).
 *
 * Both must match or the request is rejected.
 *
 * Ref: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
 * Ref: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
 */
const ALLOWED_ACTION_ORIGINS = new Set([
  'https://bjhunt.com',
  'https://www.bjhunt.com',
])

// In dev, also accept localhost — `next dev` runs on arbitrary ports.
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ACTION_ORIGINS.add('http://localhost:3000')
  ALLOWED_ACTION_ORIGINS.add('http://127.0.0.1:3000')
}

/**
 * Throws if the request's Origin header is not in the allowlist.
 *
 * Server actions MUST call this as their first statement. Fail-closed: if
 * the Origin header is missing (e.g. older browser, non-browser caller) the
 * request is rejected. Browsers always set Origin on POST.
 */
export async function assertOrigin(): Promise<void> {
  const headersList = await headers()
  const origin = headersList.get('origin') ?? ''
  if (!ALLOWED_ACTION_ORIGINS.has(origin)) {
    // Do not leak the observed origin in the error — could help an attacker
    // probe the allowlist.
    throw new Error('INVALID_ORIGIN')
  }
}
