// app/[locale]/dashboard/billing/page.tsx
//
// W10 frontend — billing page. Reads /api/billing/plan + /api/billing/usage
// for the auth'd org and renders a plan card + usage bars + Stripe CTAs.
// Stripe checkout/portal buttons fall back to /contact when the backend
// reports stripe_not_configured (env vars unset).
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { BillingActions } from './billing-actions'

interface PlanResp {
  plan: string
  organizationName: string
  limits: {
    scansPerMonth: number
    canCreateEngagements: boolean
    apiKeyCreation: boolean
    apiV1Access: boolean
    exportMarkdown: boolean
    exportCsv: boolean
  }
  features?: Record<string, boolean>
}

interface UsageResp {
  plan: string
  usage: {
    scansThisMonth: number
    findings: number
  }
  limits: { scansPerMonth: number }
  percentages: { scans: number }
}

export default async function BillingPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const isFr = locale === 'fr'
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const [planRes, usageRes] = await Promise.all([
    serverBackendFetch('/api/billing/plan', {}, cookieHeader),
    serverBackendFetch('/api/billing/usage', {}, cookieHeader),
  ])
  if (!planRes.ok) redirect(`/${locale}/login`)

  const planData = (await planRes.json()) as PlanResp
  const usageData = usageRes.ok ? ((await usageRes.json()) as UsageResp) : null

  const planLabel = planData.plan.charAt(0).toUpperCase() + planData.plan.slice(1)
  const isFree = planData.plan === 'free'

  return (
    <div className="p-6 md:p-10 max-w-4xl">
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
          <span>{planData.organizationName}</span>
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
          {isFr ? 'Facturation' : 'Billing'}
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
            ? 'Plan actuel, limites et consommation du mois en cours.'
            : 'Current plan, quotas and consumption for the running month.'}
        </p>
      </header>

      {/* Current plan */}
      <section className="border border-[var(--border)] mb-6">
        <header className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
          <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
            {isFr ? 'Plan actuel' : 'Current plan'}
          </h2>
        </header>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black tracking-tight text-white">
              {planLabel}
            </span>
            {isFree && (
              <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-widest">
                {isFr ? 'Démo limitée' : 'Limited demo'}
              </span>
            )}
          </div>

          <ul className="space-y-1.5 text-[11px] font-mono text-[var(--text-muted)]">
            <li>
              {isFr ? 'Scans / mois' : 'Scans / month'}:{' '}
              <span className="text-white">{planData.limits.scansPerMonth}</span>
            </li>
            <li>
              {isFr ? 'Création d’API keys' : 'API key creation'}:{' '}
              <span className="text-white">
                {planData.limits.apiKeyCreation ? (isFr ? 'Oui' : 'Yes') : (isFr ? 'Non' : 'No')}
              </span>
            </li>
            <li>
              {isFr ? 'API v1 publique' : 'Public API v1'}:{' '}
              <span className="text-white">
                {planData.limits.apiV1Access ? (isFr ? 'Oui' : 'Yes') : (isFr ? 'Non' : 'No')}
              </span>
            </li>
            <li>
              {isFr ? 'Export reports' : 'Reports export'}:{' '}
              <span className="text-white">
                {planData.limits.exportMarkdown
                  ? planData.limits.exportCsv ? 'MD + CSV' : 'MD'
                  : '—'}
              </span>
            </li>
          </ul>

          <BillingActions plan={planData.plan} locale={locale} />
        </div>
      </section>

      {/* Usage */}
      {usageData && (
        <section className="border border-[var(--border)]">
          <header className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-card)]">
            <h2 className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
              {isFr ? 'Consommation du mois' : 'Usage this month'}
            </h2>
          </header>
          <div className="p-6 flex flex-col gap-5">
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {isFr ? 'Scans lancés' : 'Scans launched'}
                </span>
                <span className="text-[11px] font-mono text-white">
                  {usageData.usage.scansThisMonth} / {usageData.limits.scansPerMonth}
                </span>
              </div>
              <div className="h-1.5 bg-[var(--bg-card)] border border-[var(--border)] overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{
                    width: `${Math.min(100, usageData.percentages.scans)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-mono text-[var(--text-muted)]">
                  {isFr ? 'Findings cumulés' : 'Total findings'}
                </span>
                <span className="text-[11px] font-mono text-white">
                  {usageData.usage.findings}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
