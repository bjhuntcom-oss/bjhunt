import { NextRequest } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend-client'

export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ slug: string[] }> }

// Proxy for read-only auth endpoints (/me).
// login/register/logout go through Server Actions (app/actions/auth.ts)
// so that next/headers cookies() can set HttpOnly session cookies —
// Vercel strips Set-Cookie from regular Route Handler responses.
async function proxy(request: NextRequest, slug: string[]) {
  const path = '/api/auth/' + slug.join('/')
  const search = request.nextUrl.search
  const backendUrl = `${getBackendBaseUrl()}${path}${search}`

  const reqHeaders = new Headers()
  const ct = request.headers.get('content-type')
  if (ct) reqHeaders.set('content-type', ct)
  const cookie = request.headers.get('cookie')
  if (cookie) reqHeaders.set('cookie', cookie)
  const xff = request.headers.get('x-forwarded-for')
  if (xff) reqHeaders.set('x-forwarded-for', xff)
  const ua = request.headers.get('user-agent')
  if (ua) reqHeaders.set('user-agent', ua)
  const origin = request.headers.get('origin')
  if (origin) reqHeaders.set('origin', origin)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const body = hasBody ? await request.arrayBuffer() : undefined

  const backendRes = await fetch(backendUrl, {
    method: request.method,
    headers: reqHeaders,
    body: body ? Buffer.from(body) : undefined,
    cache: 'no-store',
  })

  const responseBody = await backendRes.arrayBuffer()
  const resHeaders = new Headers()
  const resContentType = backendRes.headers.get('content-type')
  if (resContentType) resHeaders.set('content-type', resContentType)
  resHeaders.set('cache-control', 'no-store')

  return new Response(responseBody, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: resHeaders,
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxy(request, slug)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxy(request, slug)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxy(request, slug)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return proxy(request, slug)
}
