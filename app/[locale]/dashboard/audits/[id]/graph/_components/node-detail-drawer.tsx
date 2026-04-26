/**
 * NodeDetailDrawer — properties + connections for a selected graph node.
 *
 * Render-only — no canvas interaction. Connection rows clickable to navigate
 * across the graph.
 */
'use client'

import { useMemo } from 'react'
import { Network } from 'lucide-react'
import { Eyebrow } from '@/components/ui/typography'
import {
  type GraphNodeData,
  type GraphEdgeData,
  EDGE_TYPE_LABELS,
  nodeIcon,
  nodeStateColor,
} from './graph-types'

export function NodeDetailDrawer({
  node,
  edges,
  nodes,
  onSelectNode,
}: {
  node: GraphNodeData | null
  edges: GraphEdgeData[]
  nodes: GraphNodeData[]
  onSelectNode: (id: string) => void
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNodeData>()
    for (const n of nodes) m.set(n.id, n)
    return m
  }, [nodes])

  if (!node) {
    return (
      <div className="h-full flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <Network size={20} className="text-[var(--bjhunt-text-muted)] mx-auto mb-3" aria-hidden />
          <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
            Select a node to view details
          </span>
        </div>
      </div>
    )
  }

  const Icon = nodeIcon(node.type)
  const color = nodeStateColor(node)
  const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id)
  const displayProps = Object.entries(node.properties).filter(
    ([k]) => !['id', 'nodeType'].includes(k),
  )

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-4 border-b border-[var(--bjhunt-border)]">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={16} style={{ color }} aria-hidden />
          <Eyebrow>{node.type}</Eyebrow>
        </div>
        <h3
          className="font-mono break-all"
          style={{
            fontSize: 16,
            color: 'var(--bjhunt-text)',
            margin: 0,
            fontWeight: 500,
          }}
        >
          {node.label}
        </h3>
      </div>

      {/* Properties */}
      <div className="px-4 py-4 border-b border-[var(--bjhunt-border)]">
        <Eyebrow className="block mb-3">Properties</Eyebrow>
        {displayProps.length === 0 ? (
          <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
            No properties
          </span>
        ) : (
          <dl className="space-y-1.5">
            {displayProps.map(([k, v]) => (
              <div key={k} className="flex items-start gap-3 text-[12px] font-mono">
                <dt className="text-[var(--bjhunt-text-muted)] min-w-[100px] flex-shrink-0">
                  {k}
                </dt>
                <dd className="text-[var(--bjhunt-text)] break-all">
                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Connections */}
      <div className="px-4 py-4 flex-1 overflow-y-auto">
        <Eyebrow className="block mb-3">Connections ({connectedEdges.length})</Eyebrow>
        {connectedEdges.length === 0 ? (
          <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)]">
            No connections
          </span>
        ) : (
          <ul className="space-y-1">
            {connectedEdges.map((edge) => {
              const isOutgoing = edge.source === node.id
              const connectedId = isOutgoing ? edge.target : edge.source
              const connectedNode = nodeMap.get(connectedId)
              const ConnIcon = nodeIcon(connectedNode?.type ?? '')
              const connColor = connectedNode
                ? nodeStateColor(connectedNode)
                : 'var(--bjhunt-text-muted)'

              return (
                <li key={edge.id}>
                  <button
                    onClick={() => onSelectNode(connectedId)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors rounded-[6px]"
                  >
                    <span
                      aria-hidden
                      className="text-[12px] font-mono text-[var(--bjhunt-text-muted)] flex-shrink-0 w-4"
                    >
                      {isOutgoing ? '→' : '←'}
                    </span>
                    <span className="inline-flex items-center px-2 h-6 text-[10px] font-mono uppercase tracking-[0.18em] border border-[var(--bjhunt-border)] text-[var(--bjhunt-text-muted)] rounded-[4px] flex-shrink-0">
                      {EDGE_TYPE_LABELS[edge.type] ?? edge.type}
                    </span>
                    <ConnIcon size={12} className="flex-shrink-0" style={{ color: connColor }} aria-hidden />
                    <span className="text-[12px] font-mono text-[var(--bjhunt-text)] truncate">
                      {connectedNode?.label ?? connectedId}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
