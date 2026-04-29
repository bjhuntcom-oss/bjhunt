'use client'

// SSE consumer for the /api/chat/stream/:runId endpoint of bjhunt-backend.
// Handles the 12 typed events documented in
// bjhunt-engine/bjhunt/STREAMING_EVENTS.md and surfaces them as React state.

import { useCallback, useEffect, useReducer, useRef } from 'react'

export type StreamEventType =
  | 'run.started'
  | 'agent.started'
  | 'agent.thinking'
  | 'agent.tool_call'
  | 'agent.tool_result'
  | 'agent.finding'
  | 'agent.progress'
  | 'agent.handoff'
  | 'evidence.captured'
  | 'dream.diary_entry'
  | 'agent.completed'
  | 'run.completed'
  | 'error.scope_violation'
  | 'error.runtime'

export interface StreamEvent {
  ulid: string
  type: StreamEventType | string
  data: any
  receivedAt: number
}

export interface AgentEntry {
  id: string
  type: string
  color?: string
  startedAt: number
  thinkingTokens: string
  toolCalls: number
  finishedAt?: number
  status: 'running' | 'completed'
}

export interface FindingEntry {
  id: string
  agentType?: string
  title: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  cvss?: { score?: number; vector?: string; epss?: number; in_kev?: boolean }
  asset?: { type?: string; value?: string }
  category?: string
  complianceMappings?: Record<string, string[]>
  remediation?: string
  receivedAt: number
}

export interface DreamEntry {
  id: string
  title: string
  narrativeMd: string
  receivedAt: number
}

export interface EvidenceEntry {
  id: string
  type: string
  sha256: string
  bytes: number
  redactionsApplied: string[]
  receivedAt: number
}

interface State {
  events: StreamEvent[]
  agents: Map<string, AgentEntry>
  findings: FindingEntry[]
  dreamDiary: DreamEntry[]
  evidence: EvidenceEntry[]
  status: 'idle' | 'connecting' | 'open' | 'closed' | 'error'
  errorMessage?: string
  runStartedAt?: number
  runEndedAt?: number
  runOutcome?: string
  reportRefs?: Record<string, string>
  scopeViolations: Array<{ target: string; reason: string; ts: number }>
}

const init: State = {
  events: [],
  agents: new Map(),
  findings: [],
  dreamDiary: [],
  evidence: [],
  status: 'idle',
  scopeViolations: [],
}

type Action =
  | { kind: 'connecting' }
  | { kind: 'open' }
  | { kind: 'closed' }
  | { kind: 'error'; message: string }
  | { kind: 'event'; ev: StreamEvent }
  | { kind: 'reset' }

function reducer(s: State, a: Action): State {
  switch (a.kind) {
    case 'reset':      return { ...init, agents: new Map() }
    case 'connecting': return { ...s, status: 'connecting' }
    case 'open':       return { ...s, status: 'open' }
    case 'closed':     return { ...s, status: 'closed' }
    case 'error':      return { ...s, status: 'error', errorMessage: a.message }
    case 'event':      return applyEvent(s, a.ev)
  }
}

function applyEvent(s: State, ev: StreamEvent): State {
  const events = [...s.events, ev].slice(-2000)
  const agents = new Map(s.agents)
  let { findings, dreamDiary, evidence, scopeViolations,
        runStartedAt, runEndedAt, runOutcome, reportRefs } = s

  switch (ev.type) {
    case 'run.started':
      runStartedAt = ev.receivedAt
      break
    case 'agent.started': {
      const id = ev.data?.agent_id ?? ev.ulid
      agents.set(id, {
        id,
        type: ev.data?.agent_type ?? 'unknown',
        color: ev.data?.color,
        startedAt: ev.receivedAt,
        thinkingTokens: '',
        toolCalls: 0,
        status: 'running',
      })
      break
    }
    case 'agent.thinking': {
      const id = ev.data?.agent_id
      const a = id ? agents.get(id) : undefined
      if (a) agents.set(id, { ...a, thinkingTokens: (a.thinkingTokens + (ev.data?.delta ?? '')).slice(-4000) })
      break
    }
    case 'agent.tool_call': {
      const id = ev.data?.agent_id
      const a = id ? agents.get(id) : undefined
      if (a) agents.set(id, { ...a, toolCalls: a.toolCalls + 1 })
      break
    }
    case 'agent.finding':
      findings = [...findings, {
        id: ev.data?.finding_id ?? ev.ulid,
        agentType: ev.data?.agent_type,
        title: ev.data?.title ?? '(untitled)',
        severity: ev.data?.severity?.score ? bandFromCvss(ev.data.severity.cvss_v4_score)
                : ev.data?.severity ?? 'info',
        cvss: {
          score:   ev.data?.severity?.cvss_v4_score,
          vector:  ev.data?.severity?.cvss_v4_vector,
          epss:    ev.data?.severity?.epss,
          in_kev:  ev.data?.severity?.in_kev,
        },
        asset: ev.data?.asset,
        category: ev.data?.category,
        complianceMappings: ev.data?.compliance_mappings,
        remediation: ev.data?.remediation,
        receivedAt: ev.receivedAt,
      }]
      break
    case 'dream.diary_entry':
      dreamDiary = [...dreamDiary, {
        id: ev.data?.entry_id ?? ev.ulid,
        title: ev.data?.title ?? '(untitled)',
        narrativeMd: ev.data?.narrative_md ?? '',
        receivedAt: ev.receivedAt,
      }]
      break
    case 'evidence.captured':
      evidence = [...evidence, {
        id: ev.data?.evidence_id ?? ev.ulid,
        type: ev.data?.type ?? 'file',
        sha256: ev.data?.sha256 ?? '',
        bytes: ev.data?.size_bytes ?? 0,
        redactionsApplied: ev.data?.redactions_applied ?? [],
        receivedAt: ev.receivedAt,
      }]
      break
    case 'agent.completed': {
      const id = ev.data?.agent_id
      const a = id ? agents.get(id) : undefined
      if (a) agents.set(id, { ...a, status: 'completed', finishedAt: ev.receivedAt })
      break
    }
    case 'run.completed':
      runEndedAt = ev.receivedAt
      runOutcome = ev.data?.outcome ?? 'completed'
      reportRefs = ev.data?.report_refs
      break
    case 'error.scope_violation':
      scopeViolations = [...scopeViolations, {
        target: ev.data?.blocked_target ?? '?',
        reason: ev.data?.reason ?? '?',
        ts: ev.receivedAt,
      }]
      break
  }
  return {
    ...s, events, agents, findings, dreamDiary, evidence,
    runStartedAt, runEndedAt, runOutcome, reportRefs, scopeViolations,
  }
}

function bandFromCvss(score?: number): FindingEntry['severity'] {
  if (score === undefined) return 'info'
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  if (score >= 0.1) return 'low'
  return 'info'
}

export interface UseEngagementStreamArgs {
  /** Pre-issued JWT ticket from POST /api/chat/prepare */
  ticket: string
  runId: string
  /** Backend base URL — defaults to /api on the same origin */
  backendBaseUrl?: string
  enabled?: boolean
}

export function useEngagementStream({
  ticket, runId, backendBaseUrl, enabled = true,
}: UseEngagementStreamArgs) {
  const [state, dispatch] = useReducer(reducer, init)
  const esRef = useRef<EventSource | null>(null)

  const close = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    dispatch({ kind: 'closed' })
  }, [])

  useEffect(() => {
    if (!enabled || !ticket || !runId) return
    const base = backendBaseUrl ?? ''
    const url = `${base}/api/chat/stream/${encodeURIComponent(runId)}?ticket=${encodeURIComponent(ticket)}`

    dispatch({ kind: 'connecting' })
    const es = new EventSource(url, { withCredentials: false })
    esRef.current = es

    es.onopen = () => dispatch({ kind: 'open' })
    es.onerror = () => dispatch({ kind: 'error', message: 'EventSource error' })

    const handler = (type: string) => (raw: MessageEvent) => {
      let parsed: any = raw.data
      try { parsed = JSON.parse(raw.data) } catch { /* keep string */ }
      dispatch({
        kind: 'event',
        ev: {
          ulid: raw.lastEventId,
          type,
          data: parsed,
          receivedAt: Date.now(),
        },
      })
      if (type === 'run.completed') close()
    }
    const TYPED = [
      'run.started','agent.started','agent.thinking','agent.tool_call',
      'agent.tool_result','agent.finding','agent.progress','agent.handoff',
      'evidence.captured','dream.diary_entry','agent.completed','run.completed',
      'error.scope_violation','error.runtime',
    ]
    TYPED.forEach(t => es.addEventListener(t, handler(t) as EventListener))

    return () => { es.close(); esRef.current = null }
  }, [ticket, runId, backendBaseUrl, enabled, close])

  return { ...state, close, reset: () => dispatch({ kind: 'reset' }) }
}
