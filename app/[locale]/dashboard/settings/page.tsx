// app/[locale]/dashboard/settings/page.tsx
//
// Refonte 2026 (Wave B8) — User account settings.
// Hero (eyebrow + H1 + lede) + 3 sub-section cards: Profile, Security,
// API Keys. All forms preserve existing server actions and the 2FA flow.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { Input } from '@/components/ui/input'
import { PageHero, Eyebrow } from '@/components/ui/page-hero'
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
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-3xl mx-auto">
      <PageHero
        eyebrow={`01 / ${isFr ? 'PARAMETRES' : 'SETTINGS'}`}
        title={isFr ? 'Paramètres' : 'Settings'}
        lede={
          isFr
            ? 'Compte, sécurité, clés API et préférences de votre profil.'
            : 'Account, security, API keys and personal preferences.'
        }
      />

      {/* ── Profile ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <Eyebrow>{isFr ? '01.1 / PROFIL' : '01.1 / PROFILE'}</Eyebrow>
        </div>
        <div
          className="border"
          style={{
            background: 'var(--bjhunt-bg-secondary, var(--surface, #101010))',
            borderColor: 'var(--bjhunt-border, #3d3a39)',
            borderRadius: 'var(--bjhunt-radius-md, 8px)',
          }}
        >
          <div
            className="p-6 border-b"
            style={{ borderColor: 'var(--bjhunt-border, #3d3a39)' }}
          >
            <label
              htmlFor="settings-email"
              className="block mb-2"
              style={{
                fontFamily: 'var(--bjhunt-font-sans)',
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--bjhunt-text)',
              }}
            >
              Email
            </label>
            <Input
              id="settings-email"
              type="email"
              defaultValue={mePayload.user?.email ?? ''}
              readOnly
              className="opacity-60 h-10 md:h-10"
              style={{ borderRadius: 'var(--bjhunt-radius, 6px)', height: 40 }}
            />
            <p
              className="mt-2"
              style={{
                fontFamily: 'var(--bjhunt-font-sans)',
                fontSize: 13,
                color: 'var(--bjhunt-text-subtle, #52525b)',
              }}
            >
              {isFr
                ? 'Adresse de connexion (lecture seule).'
                : 'Sign-in address (read-only).'}
            </p>
          </div>
          <DisplayNameForm
            locale={locale}
            initialName={mePayload.user.displayName ?? ''}
          />
        </div>
      </section>

      {/* ── Security (password + 2FA) ────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <Eyebrow>{isFr ? '01.2 / SECURITE' : '01.2 / SECURITY'}</Eyebrow>
        </div>
        <div
          className="border mb-4"
          style={{
            background: 'var(--bjhunt-bg-secondary, var(--surface, #101010))',
            borderColor: 'var(--bjhunt-border, #3d3a39)',
            borderRadius: 'var(--bjhunt-radius-md, 8px)',
          }}
        >
          <ChangePasswordForm locale={locale} />
        </div>
        <TwoFactorPanel locale={locale} />
      </section>

      {/* ── API Keys ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <Eyebrow>{isFr ? '01.3 / CLES API' : '01.3 / API KEYS'}</Eyebrow>
        </div>
        <ApiKeysPanel locale={locale} />
      </section>
    </div>
  )
}
