/**
 * GraphCanvas — node list grouped by type + attack chain row.
 *
 * The "canvas" is text-mode for now (the original page never embedded
 * cytoscape/d3 — it rendered nodes via lists). Migrated to spec tokens with
 * state-colored nodes per refonte 2026 §4 (graph view).
 */
'use client'

import { useMemo } from 'react'
import { ChevronRight, ArrowRight, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/ui/typography'
import { StateText } from '@/components/ui/state-text'
import { StatusDot } from '@/components/ui/status-dot'
import {
  type GraphNodeData,
  type GraphChain,
  type RichChain,
  nodeIcon,
  nodeStateColor,
  severityState,
} from './graph-types'

export function NodeListItem({
  node,
  isSelected,
  onSelect,
  edgeCount,
}: {
  node: GraphNodeData
  isSelected: boolean
  onSelect: () => void
  edgeCount: number
}) {
  const Icon = nodeIcon(node.type)
  const color = nodeStateColor(node)
  const severity = node.properties?.severity as string | undefined

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-l-2 hover:bg-white/[0.02]',
        isSelected
          ? 'bg-[var(--bjhunt-bg-secondary)] border-l-[var(--state-success)]'
          : 'border-l-transparent',
      )}
    >
      <Icon size={16} className="flex-shrink-0" style={{ color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-mono text-[var(--bjhunt-text)] truncate">
          {node.label}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <Eyebrow>{node.type}</Eyebrow>
          {severity && (
            <StateText state={`severity-${severity}` as never} as="micro">
              {severity}
            </StateText>
          )}
          <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)] ml-auto tabular-nums">
            {edgeCount} conn
          </span>
        </div>
      </div>
      <ChevronRight size={12} className="text-[var(--bjhunt-text-muted)] flex-shrink-0" aria-hidden />
    </button>
  )
}

export function NodeListByType({
  nodesByType,
  selectedNodeId,
  onSelect,
  edgeCounts,
  emptyMessage,
}: {
  nodesByType: Map<string, GraphNodeData[]>
  selectedNodeId: string | null
  onSelect: (id: string) => void
  edgeCounts: Map<string, number>
  emptyMessage?: string
}) {
  const entries = [...nodesByType.entries()]
  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
          {emptyMessage ?? 'No nodes match the current filters.'}
        </span>
      </div>
    )
  }

  return (
    <>
      {entries.map(([type, typeNodes]) => (
        <div key={type}>
          <div className="px-4 py-2 sticky top-0 z-10 border-b border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg)]">
            <div className="flex items-center gap-2">
              <Eyebrow>{type}</Eyebrow>
              <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)] ml-auto tabular-nums">
                {typeNodes.length}
              </span>
            </div>
          </div>
          {typeNodes.map((node) => (
            <NodeListItem
              key={node.id}
              node={node}
              isSelected={selectedNodeId === node.id}
              onSelect={() => onSelect(node.id)}
              edgeCount={edgeCounts.get(node.id) ?? 0}
            />
          ))}
        </div>
      ))}
    </>
  )
}

export function AttackChainRow({
  chain,
  nodes,
  onSelectNode,
}: {
  chain: GraphChain
  nodes: GraphNodeData[]
  onSelectNode: (id: string) => void
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNodeData>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] px-4 py-3 rounded-[6px]">
      <div className="flex items-center gap-3 mb-3">
        <StatusDot state={severityState(chain.severity)} />
        <StateText state={`severity-${chain.severity}` as never}>
          {chain.severity}
        </StateText>
        <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)]">
          Chain {chain.id}
        </span>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {chain.nodes.map((nodeId, i) => {
          const n = nodeMap.get(nodeId)
          const Icon = nodeIcon(n?.type ?? '')
          const color = n ? nodeStateColor(n) : 'var(--bjhunt-text-muted)'

          return (
            <div key={`${nodeId}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <ArrowRight size={12} className="text-[var(--bjhunt-text-muted)] flex-shrink-0" />
              )}
              <button
                onClick={() => onSelectNode(nodeId)}
                className="inline-flex items-center gap-1.5 h-8 px-2 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors rounded-[6px]"
              >
                <Icon size={12} className="flex-shrink-0" style={{ color }} aria-hidden />
                <span className="text-[12px] font-mono text-[var(--bjhunt-text)] truncate max-w-[120px]">
                  {n?.label ?? nodeId}
                </span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function RichChainRow({
  chain,
  onGenerateOpplan,
}: {
  chain: RichChain
  onGenerateOpplan?: (chain: RichChain) => void
}) {
  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] px-4 py-4 rounded-[6px]">
      <div className="flex items-center gap-3 mb-3">
        <StatusDot state={severityState(chain.severity)} />
        <StateText state={`severity-${chain.severity}` as never}>
          {chain.severity}
        </StateText>
        <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)]">
          {chain.id}
        </span>
        <span className="text-[11px] font-mono text-[var(--bjhunt-text-muted)] ml-auto">
          Risk{' '}
          <span className="text-[var(--bjhunt-text)] tabular-nums">
            {chain.riskScore.toFixed(1)}
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1 flex-wrap mb-3">
        {chain.nodes.map((node, i) => {
          const Icon = nodeIcon(node.type)
          const color = nodeStateColor({
            id: node.id,
            type: node.type,
            label: node.label,
            properties: { severity: node.severity },
          })

          return (
            <div key={`${node.id}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <ArrowRight size={12} className="text-[var(--bjhunt-text-muted)] flex-shrink-0" />
              )}
              <div className="inline-flex items-center gap-1.5 h-9 px-3 border border-[var(--bjhunt-border)] rounded-[6px]">
                <Icon size={12} className="flex-shrink-0" style={{ color }} aria-hidden />
                <div className="min-w-0">
                  <span className="block text-[12px] font-mono text-[var(--bjhunt-text)] truncate max-w-[160px]">
                    {node.label}
                  </span>
                  <span className="block text-[10px] font-mono text-[var(--bjhunt-text-muted)] uppercase tracking-[0.18em]">
                    {node.type}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {onGenerateOpplan && (
        <button
          onClick={() => onGenerateOpplan(chain)}
          className="inline-flex items-center gap-1.5 h-9 px-4 text-[11px] font-mono uppercase tracking-[0.18em] border border-[var(--state-success)] text-[var(--state-success)] hover:bg-[var(--state-success-tint)] transition-colors rounded-[6px]"
        >
          <Target size={12} />
          Generate OPPLAN
        </button>
      )}
    </div>
  )
}
