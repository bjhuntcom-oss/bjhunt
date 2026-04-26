import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { PlatformSettingsForm } from './platform-settings-form'
import { Shield, Mail, Server } from 'lucide-react'
import { AdminHero, Eyebrow } from '../_components/admin-primitives'

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

  const sectionCls =
    'border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 mb-5'
  const rowCls =
    'flex items-center justify-between py-2.5 border-b border-[var(--bjhunt-border)] last:border-b-0'
  const keyCls =
    'font-mono text-[12px] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.12em]'
  const valueCls = 'font-mono text-[13px] text-[var(--bjhunt-text)]'

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto">
      <AdminHero
        eyebrow="ADMIN / SETTINGS"
        title="Platform Settings"
        description="Configuration globale, identité et état des composants critiques."
      />

      <PlatformSettingsForm
        initialName={defaults.identityName ?? 'BJHUNT'}
        initialDescription={defaults.identityDescription ?? ''}
      />

      {/* Security */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
          <Eyebrow>Security</Eyebrow>
        </div>
        <div>
          <div className={rowCls}>
            <span className={keyCls}>Session lifetime</span>
            <span className={valueCls}>30 days</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Min password length</span>
            <span className={valueCls}>14 chars</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Password hash</span>
            <span className={valueCls}>Argon2id</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>2FA (TOTP)</span>
            <span
              className="font-mono text-[13px]"
              style={{ color: 'var(--bjhunt-status-warning)' }}
            >
              Optional
            </span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>CSP</span>
            <span className={valueCls}>strict-dynamic nonce</span>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
          <Eyebrow>Email</Eyebrow>
        </div>
        <div>
          <div className={rowCls}>
            <span className={keyCls}>Provider</span>
            <span className={valueCls}>Resend</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Status</span>
            <span
              className="font-mono text-[13px]"
              style={{ color: 'var(--bjhunt-status-success)' }}
            >
              Configured
            </span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Sending domain</span>
            <span className={valueCls}>bjhunt.com</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Templates</span>
            <span className={valueCls}>reset, welcome, beta-invite</span>
          </div>
        </div>
      </div>

      {/* Infrastructure */}
      <div className={sectionCls}>
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-[var(--bjhunt-text-muted)]" />
          <Eyebrow>Infrastructure</Eyebrow>
        </div>
        <div>
          <div className={rowCls}>
            <span className={keyCls}>VPS</span>
            <span className={valueCls}>Hostinger KVM 8 — 8 vCPU / 32 GB</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>IP</span>
            <span className={valueCls}>82.25.117.79</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>OS</span>
            <span className={valueCls}>Ubuntu 24.04.4 LTS</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Reverse proxy</span>
            <span className={valueCls}>Caddy (443)</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Docker services</span>
            <span className={valueCls}>
              8 (caddy, backend, langgraph, pg, redis, neo4j, sandbox, litellm)
            </span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Frontend</span>
            <span className={valueCls}>Vercel · bjhunt.com</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>Disk</span>
            <span className={valueCls}>400 GB (7% used)</span>
          </div>
          <div className={rowCls}>
            <span className={keyCls}>VPS expires</span>
            <span className={valueCls}>2027-01-25</span>
          </div>
        </div>
      </div>
    </div>
  )
}
