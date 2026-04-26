'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Network,
  AlertTriangle,
  Loader2,
  Shield,
  Smartphone,
} from 'lucide-react'
import { browserBackendFetch } from '@/lib/backend-client'
import { Eyebrow, H1, Body } from '@/components/ui/typography'
import { StatusDot } from '@/components/ui/status-dot'
import {
  GraphTabs,
  GraphFilterBar,
  GraphStats,
  type GraphTab,
} from './_components/graph-toolbar'
import {
  NodeListByType,
  AttackChainRow,
  RichChainRow,
} from './_components/graph-canvas'
import { NodeDetailDrawer } from './_components/node-detail-drawer'
import { ImportDataPanel } from './_components/graph-legend'
import {
  type GraphNodeData,
  type GraphResponse,
  type RichChain,
  type EngagementSummary,
} from './_components/graph-types'

export default function KnowledgeGraphPage() {
  const params = useParams()
  const locale = params.locale as string
  const id = params.id as string

  const [graphData, setGraphData] = useState<GraphResponse | null>(null)
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  const [activeTab, setActiveTab] = useState<GraphTab>('explorer')

  const [richChains, setRichChains] = useState<RichChain[]>([])
  const [chainsLoading, setChainsLoading] = useState(false)

  const [reloadKey, setReloadKey] = useState(0)

  const loadGraphData = useCallback(async () => {
    try {
      const [graphRes, engRes] = await Promise.all([
        browserBackendFetch(`/api/engagements/${id}/graph`),
        browserBackendFetch(`/api/engagements/${id}`),
      ])

      if (!graphRes.ok) {
        setError('Failed to load knowledge graph data')
        setLoading(false)
        return
      }

      const gData = await graphRes.json()
      setGraphData(gData)

      if (engRes.ok) {
        const engData = await engRes.json()
        setEngagement(engData.engagement ?? null)
      }
    } catch {
      setError('Network error loading knowledge graph')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadGraphData().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [loadGraphData, reloadKey])

  // Load rich chains when chains tab is active
  useEffect(() => {
    if (activeTab !== 'chains') return
    let cancelled = false
    setChainsLoading(true)

    browserBackendFetch(`/api/engagements/${id}/graph/chains`)
      .then(async (res) => {
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setRichChains(data.chains ?? [])
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setChainsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, activeTab, reloadKey])

  const handleImportComplete = useCallback(() => {
    setReloadKey((k) => k + 1)
  }, [])

  const handleGenerateOpplan = useCallback(() => {
    // Navigate to opplan page — chain data can be used to seed objectives
    window.location.href = `/${locale}/dashboard/audits/${id}/opplan`
  }, [locale, id])

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return []
    return graphData.nodes.filter((n) => {
      if (typeFilter !== 'all' && n.type !== typeFilter) return false
      if (severityFilter !== 'all') {
        const sev = n.properties?.severity
        if (!sev || sev !== severityFilter) return false
      }
      return true
    })
  }, [graphData, typeFilter, severityFilter])

  // Group filtered nodes by type
  const nodesByType = useMemo(() => {
    const groups = new Map<string, GraphNodeData[]>()
    for (const n of filteredNodes) {
      if (!groups.has(n.type)) groups.set(n.type, [])
      groups.get(n.type)!.push(n)
    }
    return groups
  }, [filteredNodes])

  // Edge counts per node
  const edgeCounts = useMemo(() => {
    if (!graphData) return new Map<string, number>()
    const counts = new Map<string, number>()
    for (const e of graphData.edges) {
      counts.set(e.source, (counts.get(e.source) || 0) + 1)
      counts.set(e.target, (counts.get(e.target) || 0) + 1)
    }
    return counts
  }, [graphData])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !graphData) return null
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null
  }, [selectedNodeId, graphData])

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId)
  }, [])

  const stats = graphData?.stats
  const chains = graphData?.chains ?? []
  const isEmpty =
    !graphData || (graphData.nodes.length === 0 && graphData.edges.length === 0)

  const isLive = engagement?.status === 'running'

  return (
    <div className="px-4 py-8 sm:px-6 md:p-10 max-w-[1440px] mx-auto h-full flex flex-col">
      {/* Mobile portrait warning — graph is md+ */}
      <div className="md:hidden border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-4 mb-6 rounded-[6px] portrait:flex landscape:hidden flex items-center gap-3">
        <Smartphone size={20} className="text-[var(--state-warning)]" aria-hidden />
        <div>
          <Body className="text-[13px]">Open in landscape</Body>
          <Body size="sm" muted>
            The knowledge graph view is built for ≥768px screens. Rotate your
            device or open on a tablet/desktop for the best experience.
          </Body>
        </div>
      </div>

      {/* Back link */}
      <Link
        href={`/${locale}/dashboard/audits/${id}`}
        className="inline-flex items-center gap-1 mb-6 text-[11px] font-mono uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors flex-shrink-0"
      >
        <ChevronLeft size={12} />
        Back to audit
      </Link>

      {/* Hero */}
      <header className="mb-8 flex-shrink-0">
        <div className="inline-flex items-center gap-2 mb-3">
          <Network size={14} className="text-[var(--bjhunt-text-muted)]" aria-hidden />
          <Eyebrow>Knowledge graph</Eyebrow>
          {engagement && (
            <>
              <span className="text-[var(--bjhunt-text-muted)]" aria-hidden>·</span>
              <StatusDot state={isLive ? 'warning' : 'neutral'} live={isLive} />
            </>
          )}
        </div>
        <H1>{engagement ? engagement.name : 'Attack chain explorer'}</H1>
        <Body muted className="mt-3 max-w-2xl">
          Nodes, edges, and attack paths discovered across the engagement.
          Import scan outputs to enrich the graph.
        </Body>
      </header>

      {/* Stats */}
      {stats && !isEmpty && (
        <div className="mb-6 flex-shrink-0">
          <GraphStats stats={stats} />
        </div>
      )}

      {/* Import panel */}
      <div className="mb-6 flex-shrink-0">
        <ImportDataPanel engagementId={id} onImportComplete={handleImportComplete} />
      </div>

      {/* Tabs */}
      {!loading && !error && (
        <div className="mb-6 flex-shrink-0">
          <GraphTabs
            activeTab={activeTab}
            onChange={setActiveTab}
            chainsBadge={richChains.length}
          />
        </div>
      )}

      {/* Filters — explorer tab only */}
      {!isEmpty && activeTab === 'explorer' && !loading && (
        <div className="mb-6 flex-shrink-0">
          <GraphFilterBar
            typeFilter={typeFilter}
            severityFilter={severityFilter}
            onTypeFilter={(v) => {
              setTypeFilter(v)
              setSelectedNodeId(null)
            }}
            onSeverityFilter={(v) => {
              setSeverityFilter(v)
              setSelectedNodeId(null)
            }}
            shownCount={filteredNodes.length}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-[var(--bjhunt-text-muted)]" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={20} className="text-[var(--state-critical)] mx-auto mb-2" aria-hidden />
            <Body muted>{error}</Body>
          </div>
        </div>
      )}

      {/* Explorer tab */}
      {!loading && !error && activeTab === 'explorer' && !isEmpty && graphData && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="hidden md:flex flex-1 gap-px bg-[var(--bjhunt-border)] min-h-0 border border-[var(--bjhunt-border)]">
            {/* Left: nodes list */}
            <div className="w-[40%] bg-[var(--bjhunt-bg)] flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-[var(--bjhunt-border)] flex-shrink-0">
                <Eyebrow>Nodes</Eyebrow>
              </div>
              <div className="flex-1 overflow-y-auto">
                <NodeListByType
                  nodesByType={nodesByType}
                  selectedNodeId={selectedNodeId}
                  onSelect={handleSelectNode}
                  edgeCounts={edgeCounts}
                />
              </div>
            </div>

            {/* Right: drawer */}
            <div className="w-[60%] bg-[var(--bjhunt-bg)] flex flex-col min-h-0">
              <NodeDetailDrawer
                node={selectedNode}
                edges={graphData.edges}
                nodes={graphData.nodes}
                onSelectNode={handleSelectNode}
              />
            </div>
          </div>

          {/* Mobile single column fallback (still visible at <md) */}
          <div className="md:hidden flex-1 border border-[var(--bjhunt-border)] overflow-y-auto">
            <NodeListByType
              nodesByType={nodesByType}
              selectedNodeId={selectedNodeId}
              onSelect={handleSelectNode}
              edgeCounts={edgeCounts}
            />
          </div>

          {/* Inline chains */}
          {chains.length > 0 && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-3 mb-3">
                <StatusDot state="critical" />
                <Eyebrow>Attack chains ({chains.length})</Eyebrow>
              </div>
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {chains.map((chain) => (
                  <AttackChainRow
                    key={chain.id}
                    chain={chain}
                    nodes={graphData.nodes}
                    onSelectNode={handleSelectNode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Explorer empty */}
      {!loading && !error && activeTab === 'explorer' && isEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center border border-[var(--bjhunt-border)] px-8 py-10 max-w-md rounded-[6px]">
            <Network size={20} className="text-[var(--bjhunt-text-muted)] mx-auto mb-3" aria-hidden />
            <Body className="text-[14px] mb-1">No graph data yet</Body>
            <Body size="sm" muted>
              Import scan data above or run a scan to populate the knowledge
              graph.
            </Body>
          </div>
        </div>
      )}

      {/* Chains tab */}
      {!loading && !error && activeTab === 'chains' && (
        <div className="flex-1 flex flex-col min-h-0">
          {chainsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-[var(--bjhunt-text-muted)]" />
            </div>
          ) : richChains.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center border border-[var(--bjhunt-border)] px-8 py-10 max-w-md rounded-[6px]">
                <Shield size={20} className="text-[var(--bjhunt-text-muted)] mx-auto mb-3" aria-hidden />
                <Body className="text-[14px] mb-1">No attack chains found</Body>
                <Body size="sm" muted>
                  Attack chains are built from critical and high severity findings.
                </Body>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="flex items-center gap-3">
                <StatusDot state="critical" />
                <Eyebrow>Attack chains — ranked by risk ({richChains.length})</Eyebrow>
              </div>
              {richChains.map((chain) => (
                <RichChainRow
                  key={chain.id}
                  chain={chain}
                  onGenerateOpplan={handleGenerateOpplan}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
