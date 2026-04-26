'use server'

import { cookies } from 'next/headers'
import { serverBackendFetch } from '@/lib/backend-client'
import { assertOrigin } from './_helpers'

const SESSION_COOKIE = 'bjhunt_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
// Dot-prefix domain shares the cookie across all bjhunt.com subdomains
// (www.bjhunt.com, chat.bjhunt.com) so Caddy forward_auth can validate it.
const SESSION_COOKIE_DOMAIN =
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN ??
  (process.env.NODE_ENV === 'production' ? '.bjhunt.com' : undefined)
const SESSION_COOKIE_SECURE =
  process.env.SESSION_COOKIE_SECURE === 'true' ||
  (process.env.SESSION_COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production')

type AuthActionResult =
  | { user: { email: string; role: string }; organization: { id: string }; requiresTwoFactor?: false }
  | { requiresTwoFactor: true; tempToken: string }

export async function loginAction(email: string, password: string) {
  // SECURITY (audit C-16 / F-003): reject cross-origin POSTs before any work.
  await assertOrigin()

  const res = await serverBackendFetch(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    undefined,
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.bjhunt.com'
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(extractErrorCode(data))
  }

  // Re-forward the backend HttpOnly session cookie onto the Next response.
  // Vercel strips backend Set-Cookie headers from server-to-server fetch
  // responses, so we read the raw header and re-set it ourselves.
  // SECURITY (audit C-13 / F-002 / #3-21): we DO NOT store the session id
  // in any JS-readable cookie. The HttpOnly cookie is the only session
  // material and the JSON body must not contain it.
  await applySessionCookieFromBackend(res)

  return data as AuthActionResult
}

export async function registerAction(email: string, password: string, displayName: string) {
  // SECURITY (audit C-16 / F-003): reject cross-origin POSTs before any work.
  await assertOrigin()

  const res = await serverBackendFetch(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    },
    undefined,
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.bjhunt.com'
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(extractErrorCode(data))
  }

  // SECURITY (audit C-13 / F-002 / #3-21): HttpOnly cookie only, no JS-readable
  // duplicate, no session id in JSON body.
  await applySessionCookieFromBackend(res)

  return data as { user: { email: string; role: string }; organization: { id: string } }
}

export async function verifyTwoFactorAction(code: string, tempToken: string) {
  await assertOrigin()

  const res = await serverBackendFetch(
    '/api/auth/2fa/verify',
    {
      method: 'POST',
      body: JSON.stringify({ code, tempToken }),
    },
    undefined,
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.bjhunt.com'
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(extractErrorCode(data))
  }

  await applySessionCookieFromBackend(res)

  return data as { user: { email: string; role: string }; organization: { id: string } }
}

export async function logoutAction() {
  // SECURITY (audit C-16 / F-003): reject cross-origin POSTs before any work.
  await assertOrigin()

  const cookieStore = await cookies()
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value

  if (sessionToken) {
    // Tell backend to invalidate the session
    await serverBackendFetch(
      '/api/auth/logout',
      {
        method: 'POST',
        headers: { cookie: `${SESSION_COOKIE}=${sessionToken}` },
      },
      undefined,
      process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.bjhunt.com'
    ).catch(() => { /* ignore errors — cookie is cleared regardless */ })
  }

  // Clear the HttpOnly session cookie.
  cookieStore.delete(SESSION_COOKIE)

  // Belt-and-suspenders: also emit explicit Max-Age=0 Set-Cookie entries for
  // any legacy JS-readable duplicate cookies that may still exist in clients
  // from before audit C-13 / F-002 was fixed. Safe to leave in place.
  for (const legacyName of ['bjhunt_stream_token']) {
    cookieStore.set(legacyName, '', {
      httpOnly: false,
      secure: SESSION_COOKIE_SECURE,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
      ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
    })
  }
}

// Backend now returns either { error: { code, message } } (new envelope) or
// { error: "STRING_CODE" } (legacy). Normalise to the bare code so the client
// can switch on it without re-implementing the parsing.
function extractErrorCode(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error
    if (typeof err === 'string') return err
    if (err && typeof err === 'object' && 'code' in err) {
      const code = (err as { code: unknown }).code
      if (typeof code === 'string') return code
    }
  }
  return 'AUTH_FAILED'
}

/**
 * Reads Set-Cookie headers from the backend response and re-applies the
 * `bjhunt_session` HttpOnly cookie on the outgoing Next.js response. Vercel
 * strips Set-Cookie from server-to-server fetches so this is required.
 *
 * Only the HttpOnly session cookie is forwarded. Any other Set-Cookie entries
 * (including legacy JS-readable duplicates) are intentionally discarded —
 * see audit C-13 / F-002 / #3-21.
 */
async function applySessionCookieFromBackend(res: Response) {
  // Vercel's Node runtime sometimes returns an empty array from getSetCookie()
  // even when the upstream did send Set-Cookie headers. Fall through to the
  // joined .get('set-cookie') string (which Next/undici DOES expose) so we
  // always find the session value as long as the backend actually emitted it.
  const setCookies: string[] = res.headers.getSetCookie?.() ?? []
  if (setCookies.length === 0) {
    const joined = res.headers.get('set-cookie')
    if (joined) {
      // Multi-cookie strings are comma-joined inside undici's Headers.get().
      // Only safe to split on `, ` between cookies because cookie values
      // never contain literal commas (RFC 6265). Date attribute uses commas
      // but we only need the first attribute (`name=value`).
      for (const part of joined.split(/,(?=\s*[A-Za-z0-9_-]+=)/)) {
        setCookies.push(part.trim())
      }
    }
  }

  let sessionValue: string | undefined
  for (const entry of setCookies) {
    const m = entry.match(/^bjhunt_session=([^;]*)/)
    if (m) {
      sessionValue = m[1]
      break
    }
  }
  if (!sessionValue) return

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionValue, {
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
    ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
  })
}
