import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { PlatformSettingsForm } from './platform-settings-form'
import { Shield, Mail, Server } from 'lucide-react'

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

  const labelClass = "text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.15em]"
  const valueClass = "text-[11px] font-mono text-white"
  const sectionClass = "border border-[var(--border)] bg-[var(--bg-card)] p-6 mb-6"
  const rowClass = "flex items-center justify-between py-2.5"
  const dividerClass = "border-t border-[var(--border)]"

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Settings plateforme</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          Configuration globale et identite
        </p>
      </div>

      <PlatformSettingsForm
        initialName={defaults.identityName ?? 'BJHUNT'}
        initialDescription={defaults.identityDescription ?? ''}
      />

      {/* Security */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <p className={labelClass}>Securite</p>
        </div>
        <div className="space-y-0">
          <div className={rowClass}>
            <span className={labelClass}>Duree de session</span>
            <span className={valueClass}>30 jours</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Mot de passe minimum</span>
            <span className={valueClass}>14 caracteres</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Hachage mot de passe</span>
            <span className={valueClass}>Argon2id</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>2FA (TOTP)</span>
            <span className="text-[10px] font-mono text-[var(--warning)]">Optionnel</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>CSP</span>
            <span className={valueClass}>strict-dynamic nonce</span>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <p className={labelClass}>Email</p>
        </div>
        <div className="space-y-0">
          <div className={rowClass}>
            <span className={labelClass}>Provider</span>
            <span className={valueClass}>Resend</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Statut</span>
            <span className="text-[10px] font-mono text-[var(--success)]">Configure</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Domaine expediteur</span>
            <span className={valueClass}>bjhunt.com</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Templates</span>
            <span className={valueClass}>Reset password, Welcome, Beta invite</span>
          </div>
        </div>
      </div>

      {/* Infrastructure */}
      <div className={sectionClass}>
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <p className={labelClass}>Infrastructure</p>
        </div>
        <div className="space-y-0">
          <div className={rowClass}>
            <span className={labelClass}>VPS</span>
            <span className={valueClass}>Hostinger KVM 8 — 8 vCPU, 32 GB RAM</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>IP</span>
            <span className={valueClass}>82.25.117.79</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>OS</span>
            <span className={valueClass}>Ubuntu 25.10</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Reverse proxy</span>
            <span className={valueClass}>Caddy + sslh (443)</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Services Docker</span>
            <span className={valueClass}>8 (caddy, backend, langgraph, pg, redis, neo4j, sandbox, litellm)</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Frontend</span>
            <span className={valueClass}>Vercel (bjhunt.com)</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Disque</span>
            <span className={valueClass}>400 GB (7% utilise)</span>
          </div>
          <div className={dividerClass} />
          <div className={rowClass}>
            <span className={labelClass}>Expiration VPS</span>
            <span className={valueClass}>25 janvier 2027</span>
          </div>
        </div>
      </div>
    </div>
  )
}
