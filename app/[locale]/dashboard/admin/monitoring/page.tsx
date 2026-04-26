import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { MonitoringDashboard } from './monitoring-dashboard'

// Hits the new /api/admin/monitoring/{health,metrics,queue} routes (commit a654818).
export default async function AdminMonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const [healthRes, metricsRes, queueRes] = await Promise.all([
    serverBackendFetch('/api/admin/monitoring/health', {}, cookieHeader),
    serverBackendFetch('/api/admin/monitoring/metrics', {}, cookieHeader),
    serverBackendFetch('/api/admin/monitoring/queue', {}, cookieHeader),
  ])

  const initialHealth = healthRes.ok
    ? await healthRes.json()
    : { status: 'degraded', services: {}, timestamp: new Date().toISOString() }

  const initialMetrics = metricsRes.ok
    ? await metricsRes.json()
    : {
        users: { total: 0, active_30d: 0 },
        engagements: { total: 0, running: 0, this_month: 0 },
        findings: { total: 0, critical: 0, high: 0 },
        timestamp: new Date().toISOString(),
      }

  const initialQueue = queueRes.ok ? await queueRes.json() : { status: 'not_implemented' }

  return (
    <div className="p-6 md:p-10">
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
          <span aria-hidden style={{ width: 6, height: 6, background: 'var(--bjhunt-status-success)', boxShadow: '0 0 8px var(--bjhunt-status-success)', display: 'inline-block' }} />
          <span>Admin · Platform Health</span>
        </div>
        <h1 style={{ fontFamily: 'var(--bjhunt-font-sans)', fontWeight: 200, fontSize: 'clamp(48px, 7vw, 80px)', letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--bjhunt-text)', margin: 0 }}>
          Monitoring
        </h1>
        <p className="mt-5 max-w-2xl" style={{ fontFamily: 'var(--bjhunt-font-sans)', fontWeight: 300, fontSize: 17, lineHeight: 1.5, color: 'var(--bjhunt-text-muted)' }}>
          Santé des services, métriques plateforme et profondeur de queue BullMQ — vue temps réel.
        </p>
      </header>
      <MonitoringDashboard
        initialHealth={initialHealth}
        initialMetrics={initialMetrics}
        initialQueue={initialQueue}
      />
    </div>
  )
}
