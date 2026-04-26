// app/[locale]/dashboard/billing/page.tsx
//
// Refonte 2026 (Wave B8) — Billing.
// Hero + Current plan card (price mono 36, period 13 muted, status dot)
// + Usage card with progress bars + (placeholder) invoice history table.
// Stripe checkout/portal preserved via BillingActions.
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { PageHero, Eyebrow, StatusDot } from '@/components/ui/page-hero'
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

const PLAN_PRICES: Record<string, { price: string; period: string }> = {
  free: { price: '$0', period: 'free forever' },
  pro: { price: '$200', period: '/ month' },
  enterprise: { price: '$2000', period: '/ month' },
}

const CARD_STYLE: React.CSSProperties = {
  background: 'var(--bjhunt-bg-secondary, var(--surface, #101010))',
  borderColor: 'var(--bjhunt-border, #3d3a39)',
  borderRadius: 'var(--bjhunt-radius-md, 8px)',
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
  const priceInfo = PLAN_PRICES[planData.plan] ?? { price: '—', period: '' }
  const isFree = planData.plan === 'free'

  const scansPct = usageData ? Math.min(100, usageData.percentages.scans) : 0

  return (
    <div className="px-4 md:px-8 py-6 md:py-10 max-w-4xl mx-auto">
      <PageHero
        eyebrow={`02 / ${isFr ? 'FACTURATION' : 'BILLING'}`}
        title={isFr ? 'Facturation' : 'Billing'}
        lede={
          isFr
            ? 'Plan actuel, limites et consommation du mois en cours.'
            : 'Current plan, quotas and consumption for the running month.'
        }
      />

      {/* ── Current plan ─────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <Eyebrow>{isFr ? 'PLAN ACTUEL' : 'CURRENT PLAN'}</Eyebrow>
        </div>
        <div className="border p-6" style={CARD_STYLE}>
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h3
                  className="m-0"
                  style={{
                    fontFamily: 'var(--bjhunt-font-sans)',
                    fontWeight: 600,
                    fontSize: 20,
                    lineHeight: 1.4,
                    color: 'var(--bjhunt-text)',
                  }}
                >
                  {planLabel}
                </h3>
                <StatusDot
                  state={isFree ? 'neutral' : 'success'}
                  label={
                    <span
                      style={{
                        fontFamily: 'var(--bjhunt-font-sans)',
                        fontSize: 13,
                        color: isFree
                          ? 'var(--bjhunt-text-muted)'
                          : 'var(--bjhunt-status-success, #00d992)',
                      }}
                    >
                      {isFree
                        ? isFr
                          ? 'Demo limitee'
                          : 'Limited demo'
                        : isFr
                          ? 'Actif'
                          : 'Active'}
                    </span>
                  }
                />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  style={{
                    fontFamily: 'var(--bjhunt-font-mono)',
                    fontSize: 36,
                    fontWeight: 600,
                    letterSpacing: '-0.025em',
                    color: 'var(--bjhunt-text)',
                  }}
                >
                  {priceInfo.price}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--bjhunt-font-sans)',
                    fontSize: 13,
                    color: 'var(--bjhunt-text-muted)',
                  }}
                >
                  {priceInfo.period}
                </span>
              </div>
              <p
                className="mt-2"
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 13,
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                {planData.organizationName}
              </p>
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-6">
            <PlanRow
              label={isFr ? 'Scans / mois' : 'Scans / month'}
              value={String(planData.limits.scansPerMonth)}
            />
            <PlanRow
              label={isFr ? "Creation d'API keys" : 'API key creation'}
              value={
                planData.limits.apiKeyCreation
                  ? isFr
                    ? 'Oui'
                    : 'Yes'
                  : isFr
                    ? 'Non'
                    : 'No'
              }
            />
            <PlanRow
              label={isFr ? 'API v1 publique' : 'Public API v1'}
              value={
                planData.limits.apiV1Access
                  ? isFr
                    ? 'Oui'
                    : 'Yes'
                  : isFr
                    ? 'Non'
                    : 'No'
              }
            />
            <PlanRow
              label={isFr ? 'Export rapports' : 'Reports export'}
              value={
                planData.limits.exportMarkdown
                  ? planData.limits.exportCsv
                    ? 'MD + CSV'
                    : 'MD'
                  : '—'
              }
            />
          </ul>

          <BillingActions plan={planData.plan} locale={locale} />
        </div>
      </section>

      {/* ── Usage ────────────────────────────────────────────────── */}
      {usageData && (
        <section className="mb-8">
          <div className="mb-3">
            <Eyebrow>{isFr ? 'CONSOMMATION DU MOIS' : 'USAGE THIS MONTH'}</Eyebrow>
          </div>
          <div className="border p-6" style={CARD_STYLE}>
            <div className="mb-5">
              <div className="flex items-baseline justify-between mb-2">
                <span
                  style={{
                    fontFamily: 'var(--bjhunt-font-sans)',
                    fontSize: 13,
                    color: 'var(--bjhunt-text-muted)',
                  }}
                >
                  {isFr ? 'Scans lances' : 'Scans launched'}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--bjhunt-font-mono)',
                    fontSize: 13,
                    color: 'var(--bjhunt-text)',
                  }}
                >
                  {usageData.usage.scansThisMonth} / {usageData.limits.scansPerMonth}
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden"
                style={{
                  background: 'var(--bjhunt-bg, #050507)',
                  border: '1px solid var(--bjhunt-border, #3d3a39)',
                  borderRadius: 'var(--bjhunt-radius-pill, 9999px)',
                }}
                role="progressbar"
                aria-valuenow={Math.round(scansPct)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${scansPct}%`,
                    background:
                      scansPct >= 90
                        ? 'var(--bjhunt-status-danger, #fb565b)'
                        : scansPct >= 70
                          ? 'var(--bjhunt-status-warning, #ffba00)'
                          : 'var(--bjhunt-status-success, #00d992)',
                  }}
                />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span
                style={{
                  fontFamily: 'var(--bjhunt-font-sans)',
                  fontSize: 13,
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                {isFr ? 'Findings cumules' : 'Total findings'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 13,
                  color: 'var(--bjhunt-text)',
                }}
              >
                {usageData.usage.findings}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── Invoice history (placeholder) ─────────────────────────── */}
      <section className="mb-8">
        <div className="mb-3">
          <Eyebrow>{isFr ? 'HISTORIQUE FACTURES' : 'INVOICE HISTORY'}</Eyebrow>
        </div>
        <div className="border p-6 text-center" style={CARD_STYLE}>
          <p
            style={{
              fontFamily: 'var(--bjhunt-font-sans)',
              fontSize: 13,
              color: 'var(--bjhunt-text-muted)',
              margin: 0,
            }}
          >
            {isFr
              ? "L'historique des factures est disponible via le portail de facturation."
              : 'Invoice history is available through the billing portal.'}
          </p>
        </div>
      </section>
    </div>
  )
}

function PlanRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3 py-1">
      <span
        style={{
          fontFamily: 'var(--bjhunt-font-sans)',
          fontSize: 13,
          color: 'var(--bjhunt-text-muted)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 13,
          color: 'var(--bjhunt-text)',
        }}
      >
        {value}
      </span>
    </li>
  )
}
