import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''

  if (!cookieHeader) {
    redirect(`/${locale}/login`)
  }

  const meResponse = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meResponse.ok) {
    redirect(`/${locale}/login`)
  }

  const { user } = (await meResponse.json()) as {
    user: { role: string } | null
  }

  if (!user) {
    redirect(`/${locale}/login`)
  }

  if (user.role !== 'platform_admin') {
    redirect(`/${locale}/dashboard`)
  }

  return <>{children}</>
}
