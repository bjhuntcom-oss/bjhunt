import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { serverBackendFetch } from '@/lib/backend-client'
import { MonitoringDashboard } from './monitoring-dashboard'

export default async function AdminMonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const cookieHeader = (await headers()).get('cookie') ?? ''
  if (!cookieHeader) redirect(`/${locale}/login`)

  const healthRes = await serverBackendFetch('/api/health/ready', {}, cookieHeader)

  const healthResult = healthRes.ok
    ? await healthRes.json()
    : { status: 'not ready', checks: {} }
  // Map real health check data to the format expected by MonitoringDashboard
  const checksObj = healthResult.checks ?? {}
  const queueStats = { waiting: 0, active: 0, completed: 0, failed: 0 }
  const healthData = {
    ready: healthResult.status === 'ready',
    checks: Object.fromEntries(
      Object.entries(checksObj).map(([name, info]: [string, any]) => [
        name,
        info?.status === 'connected',
      ])
    ),
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Monitoring</h1>
        <p className="text-[11px] text-[var(--text-muted)] font-mono mt-1">
          État de la queue et santé des services
        </p>
      </div>
      <MonitoringDashboard initialQueue={queueStats} initialHealth={healthData} />
    </div>
  )
}
