import { NextRequest } from 'next/server'
import { getBackendBaseUrl } from '@/lib/backend-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 60s for SSE streams (Vercel Pro: 300s)

type RouteContext = { params: Promise<{ path: string[] }> }

/**
 * Catch-all proxy for all backend API calls from the browser.
 * Forwards /api/proxy/* → backend /api/*
 * Preserves cookies, headers, and request body.
 * Handles SSE streaming for chat.
 */
async function proxy(request: NextRequest, pathSegments: string[]) {
  const apiPath = '/api/' + pathSegments.join('/')
  const search = request.nextUrl.search
  const backendUrl = `${getBackendBaseUrl()}${apiPath}${search}`

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
  const auth = request.headers.get('authorization')
  if (auth) reqHeaders.set('authorization', auth)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const body = hasBody ? await request.arrayBuffer() : undefined

  const backendRes = await fetch(backendUrl, {
    method: request.method,
    headers: reqHeaders,
    body: body ? Buffer.from(body) : undefined,
    cache: 'no-store',
  })

  // For SSE streams, pipe through directly
  if (backendRes.headers.get('content-type')?.includes('text/event-stream')) {
    return new Response(backendRes.body, {
      status: backendRes.status,
      headers: {
        'content-type': 'text/event-stream',
        'cache-control': 'no-cache',
        'connection': 'keep-alive',
        'x-conversation-id': backendRes.headers.get('x-conversation-id') || '',
      },
    })
  }

  // For regular responses, forward status + body + content-type
  const responseBody = await backendRes.arrayBuffer()
  const resHeaders = new Headers()
  const resContentType = backendRes.headers.get('content-type')
  if (resContentType) resHeaders.set('content-type', resContentType)
  resHeaders.set('cache-control', 'no-store')

  // Forward Set-Cookie from backend
  const setCookie = backendRes.headers.get('set-cookie')
  if (setCookie) resHeaders.set('set-cookie', setCookie)

  return new Response(responseBody, {
    status: backendRes.status,
    statusText: backendRes.statusText,
    headers: resHeaders,
  })
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params
  return proxy(request, path)
}
