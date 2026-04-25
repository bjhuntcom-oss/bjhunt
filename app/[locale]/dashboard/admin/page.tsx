// app/[locale]/dashboard/admin/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'

export default async function AdminRootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''

  const meResponse = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meResponse.ok) redirect(`/${locale}/login`)

  // DASH-P0-3: deny by default if either signal is missing/false. Other
  // admin sub-pages already use isPlatformAdmin; checking both keeps the
  // gate consistent if they ever drift (e.g. role string mutates while
  // is_platform_admin column lags during a migration).
  const { user } = (await meResponse.json()) as {
    user?: { role?: string; isPlatformAdmin?: boolean }
  }
  const isAdmin =
    user?.role === 'platform_admin' && user?.isPlatformAdmin === true
  if (!isAdmin) redirect(`/${locale}/dashboard`)

  redirect(`/${locale}/dashboard/admin/users`)
}
