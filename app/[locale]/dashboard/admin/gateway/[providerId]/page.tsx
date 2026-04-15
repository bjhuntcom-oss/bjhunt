import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { ProviderEditForm } from './provider-edit-form'

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
    const res = await serverBackendFetch(`/api/admin/gateway/providers/${providerId}`, {}, cookieHeader)
    if (res.ok) {
      const data = await res.json()
      existing = data.provider ?? null
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">
          {isNew ? 'Nouveau provider' : `Provider : ${providerId}`}
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Configuration du provider et de ses modèles
        </p>
      </div>
      <ProviderEditForm
        providerId={isNew ? '' : providerId}
        initialProvider={existing}
        locale={locale}
      />
    </div>
  )
}
