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

  const res = await serverBackendFetch('/api/admin/gateway', {}, cookieHeader)
  const config = res.ok
    ? await res.json()
    : { providers: {}, defaults: { model: '' }, ui: { assistant: { name: 'BJHUNT ALPHA 1.0', avatar: 'B' } } }

  const isNew = providerId === 'new'
  const existing = isNew ? null : (config.providers[providerId] ?? null)

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
