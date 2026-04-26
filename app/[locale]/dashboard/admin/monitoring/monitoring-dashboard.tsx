'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'
import { RefreshCcw } from 'lucide-react'
import { KpiCard, StatusDot, Eyebrow } from '../_components/admin-primitives'
import type { AdminState } from '../_components/admin-primitives'

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
  const [latencyHistory, setLatencyHistory] = useState<
    Record<string, number[]>
  >({})
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [hRes, mRes, qRes] = await Promise.all([
        browserBackendFetch('/api/admin/monitoring/health'),
        browserBackendFetch('/api/admin/monitoring/metrics'),
        browserBackendFetch('/api/admin/monitoring/queue'),
      ])
      if (hRes.ok) {
        const h = (await hRes.json()) as HealthData
        setHealth(h)
        setLatencyHistory((prev) => {
          const next = { ...prev }
          for (const [key, probe] of Object.entries(h.services ?? {})) {
            const series = (next[key] ?? []).slice(-19)
            series.push(probe.latencyMs ?? 0)
            next[key] = series
          }
          return next
        })
      }
      if (mRes.ok) setMetrics(await mRes.json())
      if (qRes.ok) setQueue(await qRes.json())
      setLastRefresh(new Date())
    })
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  const serviceOrder: Array<{ key: string; label: string }> = [
    { key: 'postgres', label: 'PostgreSQL' },
    { key: 'redis', label: 'Redis' },
    { key: 'langgraph', label: 'LangGraph' },
    { key: 'neo4j', label: 'Neo4j' },
    { key: 'litellm', label: 'LiteLLM' },
  ]

  const avgLatency = (() => {
    const probes = Object.values(health.services ?? {})
    if (probes.length === 0) return 0
    return Math.round(
      probes.reduce((acc, p) => acc + (p.latencyMs ?? 0), 0) / probes.length,
    )
  })()
  const queueDepth =
    (queue.pending ?? 0) + (queue.active ?? 0) + (queue.delayed ?? 0)

  return (
    <div className="space-y-10">
      {/* Refresh bar */}
      <div className="flex items-center justify-between">
        <Eyebrow withDot state={health.status === 'healthy' ? 'success' : 'critical'}>
          {health.status === 'healthy' ? 'OPERATIONAL' : 'DEGRADED'}
        </Eyebrow>
        <div className="flex items-center gap-3">
          <span
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--bjhunt-text-subtle)' }}
          >
            {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
          <button
            onClick={refresh}
            disabled={isPending}
            title="Refresh"
            className="inline-flex items-center justify-center w-9 h-9 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors disabled:opacity-50"
          >
            <RefreshCcw
              className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Bento metric grid */}
      <div>
        <Eyebrow className="mb-3">Bento Metrics</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <BentoCard
            eyebrow="Users (30d)"
            value={metrics.users.active_30d}
            unit="active"
            series={[]}
          />
          <BentoCard
            eyebrow="Engagements"
            value={metrics.engagements.running}
            unit="running"
            state={metrics.engagements.running > 0 ? 'success' : 'neutral'}
          />
          <BentoCard
            eyebrow="Avg Latency"
            value={avgLatency}
            unit="ms"
            state={
              avgLatency > 500
                ? 'critical'
                : avgLatency > 200
                  ? 'warning'
                  : 'success'
            }
            series={
              latencyHistory[Object.keys(latencyHistory)[0] ?? ''] ?? []
            }
          />
          <BentoCard
            eyebrow="Queue Depth"
            value={queue.status === 'not_implemented' ? '—' : queueDepth}
            unit="jobs"
            state={
              queue.status === 'not_implemented'
                ? 'neutral'
                : queueDepth > 5
                  ? 'warning'
                  : 'success'
            }
          />
        </div>
      </div>

      {/* Platform snapshot */}
      <div>
        <Eyebrow className="mb-3">Platform Snapshot</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <KpiCard eyebrow="Users Total" value={metrics.users.total} />
          <KpiCard
            eyebrow="Engagements Total"
            value={metrics.engagements.total}
          />
          <KpiCard
            eyebrow="This Month"
            value={metrics.engagements.this_month}
          />
          <KpiCard
            eyebrow="Findings Critical"
            value={metrics.findings.critical}
            state="critical"
          />
          <KpiCard
            eyebrow="Findings High"
            value={metrics.findings.high}
            state="warning"
          />
          <KpiCard
            eyebrow="Findings Total"
            value={metrics.findings.total}
          />
        </div>
      </div>

      {/* Queue */}
      {queue.status !== 'not_implemented' && (
        <div>
          <Eyebrow className="mb-3">Scan Queue</Eyebrow>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <KpiCard eyebrow="Pending" value={queue.pending ?? 0} />
            <KpiCard
              eyebrow="Active"
              value={queue.active ?? 0}
              state="warning"
            />
            <KpiCard
              eyebrow="Completed"
              value={queue.completed ?? 0}
              state="success"
            />
            <KpiCard
              eyebrow="Failed"
              value={queue.failed ?? 0}
              state="critical"
            />
          </div>
        </div>
      )}
      {queue.status === 'not_implemented' && (
        <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5">
          <Eyebrow>Scan Queue</Eyebrow>
          <p
            className="mt-3 font-mono"
            style={{ fontSize: 13, color: 'var(--bjhunt-text-muted)' }}
          >
            {queue.message ?? 'BullMQ wiring pending (W4).'} Engagements run
            synchronously through the LangGraph stream until queue workers ship.
          </p>
        </div>
      )}

      {/* Service health table */}
      <div>
        <Eyebrow className="mb-3">Service Health</Eyebrow>
        <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b border-[var(--bjhunt-border)]"
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--bjhunt-text-muted)',
                }}
              >
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden md:table-cell px-4 py-3">Latency</th>
                <th className="hidden lg:table-cell px-4 py-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {serviceOrder.map(({ key, label }) => {
                const probe = health.services?.[key]
                const ok = probe?.status === 'connected'
                const series = latencyHistory[key] ?? []
                const state: AdminState = !probe
                  ? 'neutral'
                  : ok
                    ? 'success'
                    : 'critical'
                return (
                  <tr
                    key={key}
                    className="border-b border-[var(--bjhunt-border)] last:border-b-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <td
                      className="px-4 py-3 align-middle"
                      style={{
                        fontSize: 14,
                        color: 'var(--bjhunt-text)',
                      }}
                    >
                      {label}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-2">
                        <StatusDot state={state} pulse={ok} />
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 13,
                            color: !probe
                              ? 'var(--bjhunt-text-subtle)'
                              : ok
                                ? 'var(--bjhunt-status-success)'
                                : 'var(--bjhunt-status-danger)',
                          }}
                        >
                          {!probe ? '—' : ok ? 'OK' : 'KO'}
                        </span>
                      </div>
                    </td>
                    <td
                      className="hidden md:table-cell px-4 py-3 font-mono align-middle"
                      style={{
                        fontSize: 13,
                        color: 'var(--bjhunt-text-muted)',
                      }}
                      title={probe?.error}
                    >
                      {probe ? `${probe.latencyMs}ms` : '—'}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3 align-middle">
                      <Sparkline values={series} state={state} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BentoCard({
  eyebrow,
  value,
  unit,
  state = 'neutral',
  series = [],
}: {
  eyebrow: string
  value: number | string
  unit: string
  state?: AdminState
  series?: number[]
}) {
  const STATE_COLOR: Record<AdminState, string> = {
    success: 'var(--bjhunt-status-success)',
    warning: 'var(--bjhunt-status-warning)',
    critical: 'var(--bjhunt-status-danger)',
    info: 'var(--bjhunt-status-info)',
    neutral: 'var(--bjhunt-text)',
  }
  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6 relative overflow-hidden">
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 'clamp(28px, 3vw, 36px)',
            fontWeight: 400,
            letterSpacing: '-0.025em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            color: STATE_COLOR[state],
          }}
        >
          {value}
        </span>
        <span
          className="font-mono"
          style={{
            fontSize: 12,
            color: 'var(--bjhunt-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {unit}
        </span>
      </div>
      {series.length > 1 && (
        <div className="mt-3">
          <Sparkline values={series} state={state} />
        </div>
      )}
    </div>
  )
}

function Sparkline({
  values,
  state = 'neutral',
}: {
  values: number[]
  state?: AdminState
}) {
  if (values.length < 2) {
    return (
      <span
        className="font-mono"
        style={{ fontSize: 12, color: 'var(--bjhunt-text-subtle)' }}
      >
        —
      </span>
    )
  }
  const STATE_COLOR: Record<AdminState, string> = {
    success: 'var(--bjhunt-status-success)',
    warning: 'var(--bjhunt-status-warning)',
    critical: 'var(--bjhunt-status-danger)',
    info: 'var(--bjhunt-status-info)',
    neutral: 'var(--bjhunt-text-muted)',
  }
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const w = 80
  const h = 22
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ overflow: 'visible' }}
    >
      <polyline
        fill="none"
        stroke={STATE_COLOR[state]}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  )
}
