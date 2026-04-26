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
    <div className="p-6 md:p-10 max-w-3xl">
      <header className="mb-12 md:mb-16">
        <div
          className="mb-5 inline-flex items-center gap-2"
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: 'var(--bjhunt-text-subtle)',
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              background: 'var(--bjhunt-brand-primary)',
              boxShadow: '0 0 8px var(--bjhunt-brand-primary)',
              display: 'inline-block',
            }}
          />
          <span>{mePayload.user.email}</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 200,
            fontSize: 'clamp(40px, 6vw, 72px)',
            letterSpacing: '-0.04em',
            lineHeight: 1.0,
            color: 'var(--bjhunt-text)',
            margin: 0,
          }}
        >
          {isFr ? 'Paramètres' : 'Settings'}
        </h1>
        <p
          className="mt-5 max-w-xl"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 300,
            fontSize: 17,
            lineHeight: 1.5,
            color: 'var(--bjhunt-text-muted)',
          }}
        >
          {isFr
            ? 'Compte, sécurité, clés API et préférences de votre profil.'
            : 'Account, security, API keys and personal preferences.'}
        </p>
      </header>

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
