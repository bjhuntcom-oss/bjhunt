import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { MonitoringDashboard } from './monitoring-dashboard'
import { AdminHero } from '../_components/admin-primitives'

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

  const initialQueue = queueRes.ok
    ? await queueRes.json()
    : { status: 'not_implemented' }

  return (
    <div className="p-6 md:p-10 max-w-[1440px] mx-auto">
      <AdminHero
        eyebrow="ADMIN / MONITORING"
        title="Platform Health"
        description="Snapshot des services, métriques plateforme et profondeur de queue. Refresh automatique 10s."
      />
      <MonitoringDashboard
        initialHealth={initialHealth}
        initialMetrics={initialMetrics}
        initialQueue={initialQueue}
      />
    </div>
  )
}
