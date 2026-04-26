import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { ProviderEditForm } from './provider-edit-form'
import { AdminHero } from '../../_components/admin-primitives'

export default async function ProviderEditPage({
  params,
}: {
  params: Promise<{ locale: string; providerId: string }>
}) {
  const { locale, providerId } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const isNew = providerId === 'new'
  let existing = null

  if (!isNew) {
    const res = await serverBackendFetch(
      `/api/admin/gateway/providers/${providerId}`,
      {},
      cookieHeader,
    )
    if (res.ok) {
      const data = await res.json()
      existing = data.provider ?? null
    }
  }

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <AdminHero
        eyebrow={`ADMIN / GATEWAY / ${isNew ? 'NEW' : providerId.toUpperCase()}`}
        title={isNew ? 'New Provider' : `Provider · ${providerId}`}
        description="Configuration du provider et de ses modèles. La clé API est chiffrée AES-256-GCM avant stockage."
      />
      <ProviderEditForm
        providerId={isNew ? '' : providerId}
        initialProvider={existing}
        locale={locale}
      />
    </div>
  )
}
