/**
 * BJHUNT V2.1 — labs/audit POC page
 *
 * Phase 1.10 minimal UI to consume an SSE engagement stream live.
 * Operator pastes (1) a backend base URL, (2) a runId, (3) a 5-min JWT ticket
 * obtained from /api/chat/prepare, and the page surfaces:
 *   - the active agents (color-coded)
 *   - the live thinking buffer of each agent
 *   - the findings as they confirm
 *   - the dream diary entries as they post
 *   - the evidence ledger
 *   - the connection status banner
 *
 * This page is unlinked from the public marketing nav — it is reachable by
 * direct URL only and is intended for internal smoke tests until the real
 * dashboard ships in app.bjhunt.com.
 */
'use client'

import { useState, useMemo } from 'react'
import { useEngagementStream } from '@/hooks/use-engagement-stream'

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 ring-red-300',
  high:     'bg-orange-100 text-orange-800 ring-orange-300',
  medium:   'bg-yellow-100 text-yellow-800 ring-yellow-300',
  low:      'bg-slate-100 text-slate-700 ring-slate-300',
  info:     'bg-slate-100 text-slate-600 ring-slate-200',
}

export default function AuditLabsPage() {
  const [backendBaseUrl, setBackendBaseUrl] = useState('http://localhost:8080')
  const [runId, setRunId] = useState('')
  const [ticket, setTicket] = useState('')
  const [connected, setConnected] = useState(false)

  const stream = useEngagementStream({
    ticket,
    runId,
    backendBaseUrl,
    enabled: connected,
  })

  const agentList = useMemo(() => Array.from(stream.agents.values())
    .sort((a, b) => a.startedAt - b.startedAt), [stream.agents])

  const sortedFindings = useMemo(() => [...stream.findings].sort((a, b) => {
    const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0 } as const
    return (order[b.severity] ?? 0) - (order[a.severity] ?? 0)
  }), [stream.findings])

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">BJHUNT V2.1 — Audit Labs (POC)</h1>
        <p className="mt-2 text-sm text-slate-600">
          Smoke test page for the engagement SSE stream. Not production UI.
        </p>
      </header>

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Backend base URL"
            value={backendBaseUrl}
            onChange={setBackendBaseUrl}
            placeholder="http://localhost:8080" />
          <Field label="Run ID (uuid)"
            value={runId}
            onChange={setRunId}
            placeholder="00000000-..." />
          <Field label="JWT ticket"
            value={ticket}
            onChange={setTicket}
            placeholder="eyJhbGciOi..." />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setConnected(true)}
            disabled={connected || !ticket || !runId}
            className="rounded bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:bg-slate-300">
            Connect
          </button>
          <button
            onClick={() => { stream.close(); setConnected(false); stream.reset() }}
            disabled={!connected}
            className="rounded border border-slate-300 px-4 py-1.5 text-sm text-slate-700 disabled:opacity-50">
            Disconnect
          </button>
          <span className="text-xs text-slate-500">Status: <StatusBadge status={stream.status} /></span>
        </div>
        {stream.errorMessage ? (
          <p className="mt-2 text-xs text-red-600">{stream.errorMessage}</p>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title={`Agents (${agentList.length})`}>
          {agentList.length === 0 ? (
            <Empty>Aucun agent actif.</Empty>
          ) : (
            <ul className="space-y-2">
              {agentList.map(a => (
                <li key={a.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-slate-700">{a.type}</span>
                    <span className={`text-[10px] ${a.status === 'running' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    tools: {a.toolCalls} · {a.finishedAt
                      ? `done in ${Math.round((a.finishedAt - a.startedAt) / 1000)}s`
                      : `running for ${Math.round((Date.now() - a.startedAt) / 1000)}s`}
                  </div>
                  {a.thinkingTokens ? (
                    <pre className="mt-1 max-h-24 overflow-auto rounded bg-slate-50 p-1 font-mono text-[10px] text-slate-600">
                      {a.thinkingTokens}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Findings (${stream.findings.length})`}>
          {sortedFindings.length === 0 ? (
            <Empty>Aucun finding pour l'instant.</Empty>
          ) : (
            <ul className="space-y-2">
              {sortedFindings.map(f => (
                <li key={f.id} className="rounded border border-slate-200 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-slate-900">{f.title}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ring-1 ${SEVERITY_STYLES[f.severity] ?? SEVERITY_STYLES.info}`}>
                      {f.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    {f.cvss?.score !== undefined ? `CVSS ${f.cvss.score}` : null}
                    {f.cvss?.epss !== undefined ? ` · EPSS ${f.cvss.epss}` : null}
                    {f.cvss?.in_kev ? ' · KEV' : null}
                    {f.asset?.value ? ` · ${f.asset.value}` : null}
                  </div>
                  {f.complianceMappings ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {Object.entries(f.complianceMappings).flatMap(([fw, ctrls]) =>
                        ctrls.map(c => (
                          <span key={`${fw}-${c}`} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] text-slate-600">
                            {fw}:{c}
                          </span>
                        ))
                      )}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Dream Diary (${stream.dreamDiary.length})`}>
          {stream.dreamDiary.length === 0 ? (
            <Empty>L'agent dream-keeper n'a pas encore écrit.</Empty>
          ) : (
            <ul className="space-y-3">
              {stream.dreamDiary.map(e => (
                <li key={e.id}>
                  <h4 className="text-sm font-medium text-slate-900">{e.title}</h4>
                  <p className="text-[11px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {e.narrativeMd}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title={`Evidence ledger (${stream.evidence.length})`}>
          {stream.evidence.length === 0 ? (
            <Empty>Aucune preuve capturée.</Empty>
          ) : (
            <ul className="max-h-64 overflow-auto space-y-1">
              {stream.evidence.map(e => (
                <li key={e.id} className="font-mono text-[10px] text-slate-600">
                  <span className="text-slate-500">{e.type}</span> · {e.bytes}B · {e.sha256.slice(0, 12)}…
                  {e.redactionsApplied.length > 0 && (
                    <span className="text-amber-600"> · redactions: {e.redactionsApplied.join(',')}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={`Scope violations (${stream.scopeViolations.length})`}>
          {stream.scopeViolations.length === 0 ? (
            <Empty>scope-guard hook n'a rien bloqué.</Empty>
          ) : (
            <ul className="space-y-1">
              {stream.scopeViolations.map((v, i) => (
                <li key={i} className="rounded bg-red-50 p-2 text-[11px] text-red-800 ring-1 ring-red-200">
                  <strong>{v.target}</strong> — {v.reason}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {stream.runOutcome ? (
        <section className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
          <strong>Run terminé</strong> — outcome <code>{stream.runOutcome}</code>
          {stream.reportRefs ? (
            <ul className="mt-1 space-y-0.5">
              {Object.entries(stream.reportRefs).map(([fw, ref]) => (
                <li key={fw} className="font-mono text-[11px] text-slate-700">
                  {fw}: {ref}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function Field({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
    </label>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs italic text-slate-400">{children}</p>
}

function StatusBadge({ status }: { status: string }) {
  const cls = {
    idle:        'bg-slate-100 text-slate-700',
    connecting:  'bg-yellow-100 text-yellow-800',
    open:        'bg-emerald-100 text-emerald-800',
    closed:      'bg-slate-200 text-slate-700',
    error:       'bg-red-100 text-red-800',
  }[status] ?? 'bg-slate-100 text-slate-700'
  return <span className={`rounded px-1.5 py-0.5 font-medium ${cls}`}>{status}</span>
}
