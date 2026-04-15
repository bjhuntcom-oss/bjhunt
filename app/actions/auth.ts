'use server'

import { cookies } from 'next/headers'
import { serverBackendFetch } from '@/lib/backend-client'

const SESSION_COOKIE = 'bjhunt_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days
// Dot-prefix domain shares the cookie across all bjhunt.com subdomains
// (www.bjhunt.com, chat.bjhunt.com) so Caddy forward_auth can validate it.
const SESSION_COOKIE_DOMAIN =
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN ??
  (process.env.NODE_ENV === 'production' ? '.bjhunt.com' : undefined)

export async function loginAction(email: string, password: string) {
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
    throw new Error(data.error ?? 'AUTH_FAILED')
  }

  // Vercel strips Set-Cookie from server-to-server fetch responses.
  // The backend returns sessionToken in the body so we can set it here.
  if (data.sessionToken) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, data.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
      ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
    })
  }

  return data as { user: { email: string; role: string }; organization: { id: string } }
}

export async function registerAction(email: string, password: string, displayName: string) {
  const res = await serverBackendFetch(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    },
    undefined,
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.bjhunt.com'
  )

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error ?? 'AUTH_FAILED')
  }

  if (data.sessionToken) {
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE, data.sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
      ...(SESSION_COOKIE_DOMAIN ? { domain: SESSION_COOKIE_DOMAIN } : {}),
    })
  }

  return data as { user: { email: string; role: string }; organization: { id: string } }
}

export async function logoutAction() {
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

  cookieStore.delete(SESSION_COOKIE)
}
