'use client'

import { useState, useEffect, useTransition, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'

interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
}

interface HealthChecks {
  postgres?: boolean
  redis?: boolean
  searxng?: boolean
  storage?: boolean
  chat?: boolean
}

interface HealthData {
  ready: boolean
  checks: HealthChecks
}

export function MonitoringDashboard({
  initialQueue,
  initialHealth,
}: {
  initialQueue: QueueStats
  initialHealth: HealthData
}) {
  const [queue, setQueue] = useState(initialQueue)
  const [health, setHealth] = useState(initialHealth)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    startTransition(async () => {
      const [qRes, hRes] = await Promise.all([
        browserBackendFetch('/api/admin/queue-stats'),
        browserBackendFetch('/api/health/ready'),
      ])
      if (qRes.ok) setQueue(await qRes.json())
      if (hRes.ok) setHealth(await hRes.json())
      setLastRefresh(new Date())
    })
  }, [])

  useEffect(() => {
    const id = setInterval(refresh, 10000)
    return () => clearInterval(id)
  }, [refresh])

  const queueCards = [
    { label: 'En attente', value: queue.waiting,   color: 'var(--text-muted)' },
    { label: 'Actifs',     value: queue.active,     color: '#f59e0b' },
    { label: 'Terminés',   value: queue.completed,  color: 'var(--success)' },
    { label: 'Échoués',    value: queue.failed,     color: 'var(--danger)' },
  ]

  const serviceChecks: { label: string; key: keyof HealthChecks }[] = [
    { label: 'PostgreSQL', key: 'postgres' },
    { label: 'Redis',      key: 'redis' },
    { label: 'SearXNG',   key: 'searxng' },
    { label: 'Stockage',  key: 'storage' },
    { label: 'Gateway',   key: 'chat' },
  ]

  return (
    <div>
      {/* Queue stats */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em]">
            Queue des scans
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--border)]">
          {queueCards.map(({ label, value, color }) => (
            <div key={label} className="bg-[var(--bg-card)] p-6">
              <div className="text-3xl font-black font-mono" style={{ color }}>{value}</div>
              <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.15em] mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Service health */}
      <div className="border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <p className="text-[9px] font-mono text-[var(--text-muted)] uppercase tracking-[0.2em] mb-4">
          Santé des services
          <span
            className="ml-3 px-2 py-0.5 text-[8px]"
            style={{
              background: health.ready ? 'var(--success)' : 'var(--danger)',
              color: 'black',
            }}
          >
            {health.ready ? 'OPÉRATIONNEL' : 'DÉGRADÉ'}
          </span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {serviceChecks.map(({ label, key }) => {
            const ok = health.checks[key]
            return (
              <div key={key} className="flex items-center gap-2 py-2">
                <div
                  className="w-2 h-2 flex-shrink-0"
                  style={{
                    background:
                      ok === undefined
                        ? 'var(--text-subtle)'
                        : ok
                        ? 'var(--success)'
                        : 'var(--danger)',
                  }}
                />
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{label}</span>
                <span
                  className="ml-auto text-[8px] font-mono uppercase"
                  style={{
                    color:
                      ok === undefined
                        ? 'var(--text-subtle)'
                        : ok
                        ? 'var(--success)'
                        : 'var(--danger)',
                  }}
                >
                  {ok === undefined ? '—' : ok ? 'OK' : 'KO'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
