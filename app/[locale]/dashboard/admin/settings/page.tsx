import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { PlatformSettingsForm } from './platform-settings-form'

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''

  if (!cookieHeader) redirect(`/${locale}/login`)

  const cpResponse = await serverBackendFetch('/api/admin/settings', {}, cookieHeader)
  const cpData = cpResponse.ok ? await cpResponse.json() : {}
  const settings = cpData.settings ?? cpData
  const defaults = {
    identityName: settings.platform_name ?? 'BJHUNT',
    identityDescription: settings.platform_description ?? '',
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Settings plateforme</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Configuration globale et identité
        </p>
      </div>
      <PlatformSettingsForm
        initialName={defaults.identityName ?? 'BJHUNT'}
        initialDescription={defaults.identityDescription ?? ''}
      />
    </div>
  )
}
