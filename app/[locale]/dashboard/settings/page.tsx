// app/[locale]/dashboard/settings/page.tsx
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { Input } from '@/components/ui/input'
import { ChangePasswordForm } from './change-password-form'
import { DisplayNameForm } from './display-name-form'
import { ApiKeysPanel } from './api-keys-panel'
import { TwoFactorPanel } from './two-factor-panel'

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isFr = locale === 'fr'
  const cookieHeader = (await headers()).get('cookie') ?? ''

  if (!cookieHeader) redirect(`/${locale}/login`)

  const meResponse = await serverBackendFetch('/api/auth/me', {}, cookieHeader)
  if (!meResponse.ok) redirect(`/${locale}/login`)

  const mePayload = (await meResponse.json()) as {
    user: { displayName: string; email: string; role: string }
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">
          {isFr ? 'Paramètres' : 'Settings'}
        </h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          {mePayload.user.email}
        </p>
      </div>

      {/* Compte */}
      <section className="mb-8">
        <h2 className="text-[9px] font-mono uppercase tracking-[0.2em] text-[var(--text-muted)] mb-4">
          {isFr ? 'Compte' : 'Account'}
        </h2>
        <div className="border border-[var(--border)] divide-y divide-[var(--border)]">
          <div className="p-6">
            <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] font-mono block mb-2">
              Email
            </label>
            <Input type="email" defaultValue={mePayload.user?.email ?? ''} readOnly className="opacity-60" />
          </div>
          <DisplayNameForm locale={locale} initialName={mePayload.user.displayName ?? ''} />
          <ChangePasswordForm locale={locale} />
        </div>
      </section>

      <ApiKeysPanel locale={locale} />

      <TwoFactorPanel locale={locale} />
    </div>
  )
}
