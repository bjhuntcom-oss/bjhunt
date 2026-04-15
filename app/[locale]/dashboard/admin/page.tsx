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

  const { user } = (await meResponse.json()) as { user: { role: string } }
  if (user.role !== 'platform_admin') redirect(`/${locale}/dashboard`)

  redirect(`/${locale}/dashboard/admin/users`)
}
