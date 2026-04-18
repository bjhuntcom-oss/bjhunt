import { NextRequest, NextResponse } from 'next/server'

/**
 * CSP violation report sink.
 *
 * Browsers POST here with content-type `application/csp-report` (legacy)
 * or `application/reports+json` (Reporting API). We do not persist these
 * client-side; instead we forward them to the backend over a fire-and-
 * forget HTTP call so they land in the platform `audit_logs` table with
 * action='security.csp_violation'. Backend handles dedup + sampling.
 *
 * Per docs/architecture/14-SECURITY.md and CSP3 reporting spec.
 */

export const runtime = 'edge'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  'https://api.bjhunt.com'

export async function POST(req: NextRequest) {
  let payload: unknown = null
  try {
    payload = await req.json()
  } catch {
    // Some browsers send empty body — ignore silently.
    return new NextResponse(null, { status: 204 })
  }

  // Best-effort forward — never blocking, never throwing.
  // We send to a backend endpoint that will be implemented in a future
  // wave. Until then the call returns 404 and we still return 204 to the
  // browser so it doesn't retry.
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'

  // Don't await — fire and forget so the report doesn't block the page.
  fetch(`${BACKEND_URL}/api/security/csp-report`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-source-ip': ip,
      'x-source-ua': ua,
    },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Backend may not have the route yet — drop silently.
  })

  return new NextResponse(null, { status: 204 })
}
