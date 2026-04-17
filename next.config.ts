import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')
const backendBaseUrl =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.bjhunt.com' : 'http://127.0.0.1:3001')

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  // SECURITY (audit C-16 / F-003): Next.js performs an Origin check against
  // this allowlist before dispatching server actions. Combined with the
  // explicit `assertOrigin()` helper inside each action (see
  // `app/actions/_helpers.ts`), this blocks cross-origin `<form>` CSRF on
  // login / register / logout.
  // Ref: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
  experimental: {
    serverActions: {
      allowedOrigins: ['bjhunt.com', 'www.bjhunt.com'],
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.bjhunt.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
        ],
      },
    ]
  },
  async rewrites() {
    const backend = backendBaseUrl.replace(/\/$/, '')

    return [
      {
        source: '/api/chat/:path*',
        destination: `${backend}/api/chat/:path*`,
      },
      {
        source: '/api/admin/:path*',
        destination: `${backend}/api/admin/:path*`,
      },
      {
        source: '/api/settings/:path*',
        destination: `${backend}/api/settings/:path*`,
      },
    ]
  },
}

export default withNextIntl(nextConfig)
