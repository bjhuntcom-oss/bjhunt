'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'

// Mirrors backend/src/routes/admin/monitoring.ts shape (commit a654818).
interface ServiceProbe {
  status: 'connected' | 'disconnected'
  latencyMs: number
  error?: string
}

interface HealthData {
  status: 'healthy' | 'degraded'
  services: Record<string, ServiceProbe>
  timestamp: string
}

interface MetricsData {
  users: { total: number; active_30d: number }
  engagements: { total: number; running: number; this_month: number }
  findings: { total: number; critical: number; high: number }
  timestamp: string
}

interface QueueData {
  status: 'ok' | 'not_implemented'
  message?: string
  // when wired (W4):
  pending?: number
  active?: number
  completed?: number
  failed?: number
  delayed?: number
}

export function MonitoringDashboard({
  initialHealth,
  initialMetrics,
  initialQueue,
}: {
  initialHealth: HealthData
  initialMetrics: MetricsData
  initialQueue: QueueData
}) {
  const [health, setHealth] = useState(initialHealth)
  const [metrics, setMetrics] = useState(initialMetrics)
  const [queue, setQueue] = useState(initialQueue)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  // Pulls the new /api/admin/monitoring/{health,metrics,queue} endpoints
  // (commit a654818 — DOC-08 audit P1 wiring). Falls back gracefully if a
  // probe is missing in the response.
  const refresh = useCallback(() => {
    startTransition(async () => {
      const [hRes, mRes, qRes] = await Promise.all([
        browserBackendFetch('/api/admin/monitoring/health'),
        browserBackendFetch('/api/admin/monitoring/metrics'),
        browserBackendFetch('/api/admin/monitoring/queue'),
      ])
      if (hRes.ok) setHealth(await hRes.json())
      if (mRes.ok) setMetrics(await mRes.json())
      if (qRes.ok) setQueue(await qRes.json())
      setLastRefresh(new Date())
    })
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  const queueCards =
    queue.status === 'not_implemented'
      ? null
      : [
          { label: 'Pending', value: queue.pending ?? 0, color: 'var(--text-muted)' },
          { label: 'Active', value: queue.active ?? 0, color: '#f59e0b' },
          { label: 'Completed', value: queue.completed ?? 0, color: 'var(--success)' },
          { label: 'Failed', value: queue.failed ?? 0, color: 'var(--danger)' },
        ]

  const serviceOrder: Array<{ key: string; label: string }> = [
    { key: 'postgres', label: 'PostgreSQL' },
    { key: 'redis', label: 'Redis' },
    { key: 'langgraph', label: 'LangGraph' },
    { key: 'neo4j', label: 'Neo4j' },
    { key: 'litellm', label: 'LiteLLM' },
  ]

  return (
    <div className="space-y-8">
      {/* Header / refresh */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">
          Monitoring — backend, queue, services
        </p>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-[var(--text-subtle)]">
            Mis à jour : {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
          <button
            onClick={refresh}
            disabled={isPending}
            className="text-[9px] font-mono text-[var(--text-muted)] hover:text-white disabled:opacity-50 transition-colors"
          >
            {isPending ? '...' : '↻ Rafraîchir'}
          </button>
        </div>
      </div>

      {/* Platform metrics */}
      <div>
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
          Plateforme (snapshot)
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-[var(--border)]">
          {[
            { label: 'Users (total)', value: metrics.users.total },
            { label: 'Active 30j', value: metrics.users.active_30d },
            { label: 'Engagements (total)', value: metrics.engagements.total },
            { label: 'En cours', value: metrics.engagements.running },
            { label: 'Findings critical', value: metrics.findings.critical, color: 'var(--bjhunt-severity-critical, #DC2626)' },
            { label: 'Findings high', value: metrics.findings.high, color: 'var(--bjhunt-severity-high, #F97316)' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-card)] p-6">
              <div className="text-3xl font-black font-mono" style={{ color: color ?? 'var(--text-muted)' }}>
                {value}
              </div>
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue (BullMQ wiring lands W4) */}
      <div>
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-3">
          Queue des scans
        </p>
        {queueCards ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)]">
            {queueCards.map(({ label, value, color }) => (
              <div key={label} className="bg-[var(--bg-card)] p-6">
                <div className="text-3xl font-black font-mono" style={{ color }}>
                  {value}
                </div>
                <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1">
                  {label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="text-[10px] font-mono text-[var(--text-muted)]">
              ⏳ {queue.message ?? 'Queue introspection not yet wired (W4 deliverable).'}
            </div>
            <div className="text-[9px] font-mono text-[var(--text-subtle)] mt-2">
              Engagements run synchronously through the LangGraph stream until
              BullMQ workers ship.
            </div>
          </div>
        )}
      </div>

      {/* Service health */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
          Santé des services
          <span
            className="ml-3 px-2 py-0.5 text-[8px]"
            style={{
              background: health.status === 'healthy' ? 'var(--success)' : 'var(--danger)',
              color: 'black',
            }}
          >
            {health.status === 'healthy' ? 'OPÉRATIONNEL' : 'DÉGRADÉ'}
          </span>
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {serviceOrder.map(({ key, label }) => {
            const probe = health.services?.[key]
            const ok = probe?.status === 'connected'
            return (
              <div key={key} className="flex items-center gap-3 py-2">
                <div
                  className="w-2 h-2 flex-shrink-0"
                  style={{
                    background: !probe ? 'var(--text-subtle)' : ok ? 'var(--success)' : 'var(--danger)',
                  }}
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{label}</span>
                {probe && (
                  <span className="text-[9px] font-mono text-[var(--text-subtle)]">
                    {probe.latencyMs}ms
                  </span>
                )}
                <span
                  className="ml-auto text-[8px] font-mono uppercase"
                  style={{
                    color: !probe ? 'var(--text-subtle)' : ok ? 'var(--success)' : 'var(--danger)',
                  }}
                  title={probe?.error}
                >
                  {!probe ? '—' : ok ? 'OK' : 'KO'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
