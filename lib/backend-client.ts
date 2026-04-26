const backendBaseUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.BACKEND_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.bjhunt.com' : 'http://127.0.0.1:3001')

export function getBackendBaseUrl() {
  return backendBaseUrl.replace(/\/$/, '')
}

export async function browserBackendFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  // Don't set Content-Type for FormData — browser must set it with the multipart boundary
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  // All browser API calls go through same-origin proxy for cookie forwarding.
  // The proxy at /api/proxy/[...path] handles SSE streaming too.
  let url: string
  if (path.startsWith('http')) {
    const target = new URL(path)
    const allowedOrigins = new Set([new URL(getBackendBaseUrl()).origin])
    if (typeof window !== 'undefined') {
      allowedOrigins.add(window.location.origin)
    }
    if (!allowedOrigins.has(target.origin)) {
      throw new Error('Refusing to send backend credentials to an untrusted origin')
    }
    url = target.toString()
  } else if (path.startsWith('/api/')) {
    url = `/api/proxy${path.slice(4)}`
  } else {
    url = path
  }

  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  })
}

export async function serverBackendFetch(
  path: string,
  init: RequestInit = {},
  cookieHeader?: string,
  originOverride?: string
) {
  const headers = new Headers(init.headers)
  if (cookieHeader) {
    headers.set('cookie', cookieHeader)
  }
  if (originOverride) {
    headers.set('origin', originOverride)
  }
  if (!headers.has('Content-Type') && init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`${getBackendBaseUrl()}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  })
}
