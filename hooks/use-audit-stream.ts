/**
 * Audit / engagement stream hook.
 *
 * Per docs/architecture/06-FRONTEND.md §Streaming Hook + 02-STREAMING.md
 * §SSE Event Types. Subscribes to a SP3 stream (POST /prepare → GET /stream/:runId)
 * and exposes typed reactive state for the chat / audit-detail UI.
 *
 * Event types consumed (from langgraph-sse-transform output):
 *   token, tool_call, tool_result, thinking, subagent_start, subagent_end,
 *   objective, graph_update, error, done
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { browserBackendFetch } from '@/lib/backend-client'

export type StreamStatus = 'idle' | 'preparing' | 'streaming' | 'complete' | 'error'

export interface ToolCall {
  id: string
  name: string
  args: unknown
  status: 'running' | 'completed' | 'error'
  result?: string
}

export interface SubAgent {
  id: string
  name: string
  description?: string
  startedAt: number
  endedAt?: number
  error?: string | null
}

export interface KnowledgeGraph {
  nodes: Array<{ id: string; kind: string; label?: string; props?: Record<string, unknown> }>
  edges: Array<{ id: string; src: string; dst: string; kind: string }>
  stats: Record<string, number>
}

export interface AuditStreamState {
  status: StreamStatus
  /** Concatenated assistant text (deltas applied in order). */
  message: string
  /** Whether the agent is currently emitting hidden reasoning. */
  thinkingActive: boolean
  thinkingContent: string
  toolCalls: ToolCall[]
  subAgents: SubAgent[]
  objective: unknown | null
  graph: KnowledgeGraph | null
  /** Active agent identifier (decepticon, recon, exploit, …). */
  activeAgent: string | null
  /** Total tokens reported by the `done` event. */
  tokensIn: number
  tokensOut: number
  /** Last error message if status === 'error'. */
  error: string | null
}

const initial: AuditStreamState = {
  status: 'idle',
  message: '',
  thinkingActive: false,
  thinkingContent: '',
  toolCalls: [],
  subAgents: [],
  objective: null,
  graph: null,
  activeAgent: null,
  tokensIn: 0,
  tokensOut: 0,
  error: null,
}

export interface PrepareResponse {
  streamUrl: string
  ticket: string
  conversationId: string
  runId: string
}

export interface UseAuditStreamOptions {
  /** Engagement ID to bind the stream to. */
  engagementId: string
  /** Optional existing conversation ID (continues the conversation). */
  conversationId?: string
  /** Optional explicit agent graph (defaults to the engagement's agent). */
  agentGraph?: string
}

/**
 * Reactive SP3 stream hook.
 *
 * `send(message)` triggers POST /api/chat/prepare, then opens the SSE stream.
 * `cancel()` aborts the in-flight fetch.
 * Calling `send` again while a stream is active aborts the previous one
 * and starts a new one (ChatGPT-style).
 */
export function useAuditStream(options: UseAuditStreamOptions) {
  const { engagementId, conversationId, agentGraph } = options
  const [state, setState] = useState<AuditStreamState>(initial)
  const abortRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const send = useCallback(
    async (message: string) => {
      cancel()
      const myRequestId = ++requestIdRef.current
      const abort = new AbortController()
      abortRef.current = abort

      setState({ ...initial, status: 'preparing' })

      // Phase 1 — Prepare
      let prepared: PrepareResponse
      try {
        const res = await browserBackendFetch('/api/chat/prepare', {
          method: 'POST',
          body: JSON.stringify({
            message,
            engagementId,
            conversationId,
            agentGraph,
          }),
          signal: abort.signal,
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error?.message || `prepare failed (${res.status})`)
        }
        prepared = (await res.json()) as PrepareResponse
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return
        if ((err as Error).name === 'AbortError') return
        setState((s) => ({ ...s, status: 'error', error: (err as Error).message }))
        return
      }

      // Phase 2 — Stream (DIRECT, bypasses Vercel proxy)
      setState((s) => ({ ...s, status: 'streaming' }))

      try {
        const url = `${prepared.streamUrl}?ticket=${encodeURIComponent(
          prepared.ticket,
        )}&_t=${Date.now()}`
        const res = await fetch(url, { signal: abort.signal })
        if (!res.ok || !res.body) {
          throw new Error(`stream failed (${res.status})`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          if (myRequestId !== requestIdRef.current) {
            try {
              reader.releaseLock()
            } catch {}
            return
          }

          buffer += decoder.decode(value, { stream: true })
          const normalised = buffer.replace(/\r\n/g, '\n')
          const blocks = normalised.split('\n\n')
          buffer = blocks.pop() ?? ''

          for (const block of blocks) {
            if (!block.trim()) continue
            applyBlock(block, setState)
          }
        }
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return
        if ((err as Error).name === 'AbortError') return
        setState((s) => ({ ...s, status: 'error', error: (err as Error).message }))
      }
    },
    [engagementId, conversationId, agentGraph, cancel],
  )

  // Cleanup on unmount
  useEffect(() => () => cancel(), [cancel])

  return { ...state, send, cancel }
}

// ── Internal: SSE block parser → reducer ─────────────────────────────────

function applyBlock(block: string, setState: (fn: (s: AuditStreamState) => AuditStreamState) => void) {
  let event = ''
  const dataLines: string[] = []
  for (const line of block.split('\n')) {
    if (line.startsWith('event: ')) event = line.slice(7).trim()
    else if (line.startsWith('data: ')) dataLines.push(line.slice(6))
  }
  const raw = dataLines.join('\n').trim()
  if (!raw) return
  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    return
  }

  setState((s) => reduce(s, event, data))
}

function reduce(s: AuditStreamState, event: string, data: any): AuditStreamState {
  switch (event) {
    case 'token':
      return {
        ...s,
        message: s.message + (data.token ?? ''),
        activeAgent: data.agent ?? s.activeAgent,
      }

    case 'thinking':
      return {
        ...s,
        thinkingActive: Boolean(data.active),
        thinkingContent: data.content ?? s.thinkingContent,
      }

    case 'tool_call':
      if (s.toolCalls.some((t) => t.id === data.id)) return s
      return {
        ...s,
        toolCalls: [
          ...s.toolCalls,
          { id: data.id, name: data.name, args: data.args, status: 'running' },
        ],
      }

    case 'tool_result':
      return {
        ...s,
        toolCalls: s.toolCalls.map((t) =>
          t.id === data.id
            ? { ...t, status: data.status === 'error' ? 'error' : 'completed', result: data.result }
            : t,
        ),
      }

    case 'subagent_start':
      return {
        ...s,
        subAgents: [
          ...s.subAgents,
          {
            id: data.id,
            name: data.name,
            description: data.description,
            startedAt: Date.now(),
          },
        ],
        activeAgent: data.name ?? s.activeAgent,
      }

    case 'subagent_end':
      return {
        ...s,
        subAgents: s.subAgents.map((sa) =>
          sa.id === data.id ? { ...sa, endedAt: Date.now(), error: data.error ?? null } : sa,
        ),
      }

    case 'objective':
      return { ...s, objective: data }

    case 'graph_update':
      return {
        ...s,
        graph: {
          nodes: data.nodes ?? [],
          edges: data.edges ?? [],
          stats: data.stats ?? {},
        },
      }

    case 'error':
      return { ...s, status: 'error', error: data.message ?? 'Stream error' }

    case 'done':
      return {
        ...s,
        status: 'complete',
        tokensIn: data.tokensIn ?? s.tokensIn,
        tokensOut: data.tokensOut ?? s.tokensOut,
      }

    default:
      return s
  }
}
