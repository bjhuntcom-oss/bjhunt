"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Network,
  Server,
  Database,
  AlertTriangle,
  Key,
  FileText,
  Loader2,
  ChevronRight,
  ArrowRight,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { browserBackendFetch } from "@/lib/backend-client";

// ── Types ────────────────────────────────────────────────────────────────

interface GraphNodeData {
  id: string;
  type: string;
  label: string;
  properties: Record<string, any>;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface GraphStatsData {
  nodeCount: number;
  edgeCount: number;
  criticalFindings: number;
  highFindings: number;
}

interface GraphChain {
  id: string;
  severity: string;
  nodes: string[];
}

interface GraphResponse {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  stats: GraphStatsData;
  chains: GraphChain[];
}

interface EngagementSummary {
  id: string;
  name: string;
  status: string;
  target: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const NODE_TYPE_COLORS: Record<string, string> = {
  host: "#60a5fa",
  service: "#a4d474",
  vulnerability: "#ff4444",
  credential: "#ff9900",
  finding: "#ff4444",
};

const NODE_TYPE_BG: Record<string, string> = {
  host: "rgba(96,165,250,0.08)",
  service: "rgba(164,212,116,0.08)",
  vulnerability: "rgba(255,68,68,0.08)",
  credential: "rgba(255,153,0,0.08)",
  finding: "rgba(255,68,68,0.08)",
};

const NODE_ICONS: Record<string, typeof Server> = {
  host: Server,
  service: Database,
  vulnerability: AlertTriangle,
  credential: Key,
  finding: FileText,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff9900",
  medium: "#ff9900",
  low: "#00cc8a",
  info: "#555555",
};

const EDGE_TYPE_LABELS: Record<string, string> = {
  AFFECTS: "AFFECTS",
  ESCALATES_TO: "ESCALATES TO",
  LEADS_TO: "LEADS TO",
  VALIDATES: "VALIDATES",
  HAS_SERVICE: "HAS SERVICE",
  EXPOSES: "EXPOSES",
};

const NODE_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "host", label: "Host" },
  { value: "service", label: "Service" },
  { value: "vulnerability", label: "Vulnerability" },
  { value: "credential", label: "Credential" },
  { value: "finding", label: "Finding" },
];

const SEVERITY_OPTIONS = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "info", label: "Info" },
];

// ── Node list item ──────────────────────────────────────────────────────

function NodeListItem({
  node,
  isSelected,
  onSelect,
  edgeCount,
}: {
  node: GraphNodeData;
  isSelected: boolean;
  onSelect: () => void;
  edgeCount: number;
}) {
  const Icon = NODE_ICONS[node.type] || Network;
  const color = NODE_TYPE_COLORS[node.type] || "var(--text-muted)";
  const severity = node.properties?.severity as string | undefined;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-l-2",
        isSelected
          ? "bg-[var(--bg-card)] border-l-white"
          : "border-l-transparent hover:bg-[var(--bg-card)] hover:border-l-[var(--border)]"
      )}
    >
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-mono text-white truncate">
          {node.label}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="text-[8px] font-mono uppercase tracking-wider px-1 py-px"
            style={{ color, backgroundColor: `${color}15` }}
          >
            {node.type}
          </span>
          {severity && (
            <span
              className="text-[8px] font-mono uppercase tracking-wider px-1 py-px"
              style={{
                color: SEVERITY_COLORS[severity] || "var(--text-subtle)",
                backgroundColor: `${SEVERITY_COLORS[severity] || "#555"}15`,
              }}
            >
              {severity}
            </span>
          )}
          <span className="text-[8px] font-mono text-[var(--text-subtle)] ml-auto">
            {edgeCount} conn
          </span>
        </div>
      </div>
      <ChevronRight className="w-2.5 h-2.5 text-[var(--text-subtle)] flex-shrink-0" />
    </button>
  );
}

// ── Node detail panel ───────────────────────────────────────────────────

function NodeDetailPanel({
  node,
  edges,
  nodes,
  onSelectNode,
}: {
  node: GraphNodeData;
  edges: GraphEdgeData[];
  nodes: GraphNodeData[];
  onSelectNode: (id: string) => void;
}) {
  const Icon = NODE_ICONS[node.type] || Network;
  const color = NODE_TYPE_COLORS[node.type] || "var(--text-muted)";

  // Find all edges connected to this node
  const connectedEdges = edges.filter(
    (e) => e.source === node.id || e.target === node.id
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNodeData>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  // Properties to display (filter out internal ones)
  const displayProps = Object.entries(node.properties).filter(
    ([k]) => !["id", "nodeType"].includes(k)
  );

  return (
    <div className="h-full flex flex-col">
      {/* Node header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span
            className="text-[8px] font-mono uppercase tracking-[0.15em] px-1.5 py-0.5"
            style={{ color, backgroundColor: `${color}15` }}
          >
            {node.type}
          </span>
        </div>
        <h3 className="text-[13px] font-mono font-bold text-white break-all">
          {node.label}
        </h3>
      </div>

      {/* Properties */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] mb-2">
          Properties
        </div>
        {displayProps.length === 0 ? (
          <div className="text-[10px] font-mono text-[var(--text-subtle)]">
            No properties
          </div>
        ) : (
          <div className="space-y-1">
            {displayProps.map(([k, v]) => (
              <div key={k} className="flex items-start gap-2 text-[9px] font-mono">
                <span className="text-[var(--text-subtle)] min-w-[80px] flex-shrink-0">
                  {k}:
                </span>
                <span className="text-[var(--text-muted)] break-all">
                  {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connections */}
      <div className="px-4 py-3 flex-1 overflow-y-auto">
        <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] mb-2">
          Connections ({connectedEdges.length})
        </div>
        {connectedEdges.length === 0 ? (
          <div className="text-[10px] font-mono text-[var(--text-subtle)]">
            No connections
          </div>
        ) : (
          <div className="space-y-1">
            {connectedEdges.map((edge) => {
              const isOutgoing = edge.source === node.id;
              const connectedId = isOutgoing ? edge.target : edge.source;
              const connectedNode = nodeMap.get(connectedId);
              const ConnIcon = NODE_ICONS[connectedNode?.type || ""] || Network;
              const connColor =
                NODE_TYPE_COLORS[connectedNode?.type || ""] || "var(--text-muted)";

              return (
                <button
                  key={edge.id}
                  onClick={() => onSelectNode(connectedId)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[var(--bg-card)] transition-colors group"
                >
                  {/* Direction arrow */}
                  <span className="text-[9px] font-mono text-[var(--text-subtle)] flex-shrink-0 w-[14px]">
                    {isOutgoing ? "\u2192" : "\u2190"}
                  </span>

                  {/* Edge type */}
                  <span className="text-[8px] font-mono uppercase tracking-wider text-[var(--text-subtle)] px-1 py-px border border-[var(--border)] flex-shrink-0">
                    {EDGE_TYPE_LABELS[edge.type] || edge.type}
                  </span>

                  {/* Connected node */}
                  <ConnIcon
                    className="w-2.5 h-2.5 flex-shrink-0"
                    style={{ color: connColor }}
                  />
                  <span className="text-[10px] font-mono text-[var(--text-muted)] truncate group-hover:text-white transition-colors">
                    {connectedNode?.label || connectedId}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Attack chain row ────────────────────────────────────────────────────

function AttackChainRow({
  chain,
  nodes,
  onSelectNode,
}: {
  chain: GraphChain;
  nodes: GraphNodeData[];
  onSelectNode: (id: string) => void;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, GraphNodeData>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const severityColor = SEVERITY_COLORS[chain.severity] || "#555555";

  return (
    <div className="border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2.5">
      {/* Chain severity + ID */}
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-[8px] font-mono uppercase tracking-wider px-1.5 py-0.5"
          style={{ color: severityColor, backgroundColor: `${severityColor}15` }}
        >
          {chain.severity}
        </span>
        <span className="text-[8px] font-mono text-[var(--text-subtle)]">
          Chain {chain.id}
        </span>
      </div>

      {/* Chain flow */}
      <div className="flex items-center gap-1 flex-wrap">
        {chain.nodes.map((nodeId, i) => {
          const n = nodeMap.get(nodeId);
          const Icon = NODE_ICONS[n?.type || ""] || Network;
          const color = NODE_TYPE_COLORS[n?.type || ""] || "var(--text-muted)";

          return (
            <div key={`${nodeId}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <ArrowRight
                  className="w-3 h-3 text-[var(--text-subtle)] flex-shrink-0"
                />
              )}
              <button
                onClick={() => onSelectNode(nodeId)}
                className="flex items-center gap-1 px-2 py-1 border border-[var(--border)] hover:border-white hover:bg-[var(--bg-input)] transition-colors group"
                style={{ borderColor: `${color}40` }}
              >
                <Icon
                  className="w-2.5 h-2.5 flex-shrink-0"
                  style={{ color }}
                />
                <span className="text-[9px] font-mono text-[var(--text-muted)] group-hover:text-white transition-colors truncate max-w-[120px]">
                  {n?.label || nodeId}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────

export default function KnowledgeGraphPage() {
  const params = useParams();
  const locale = params.locale as string;
  const id = params.id as string;

  const [graphData, setGraphData] = useState<GraphResponse | null>(null);
  const [engagement, setEngagement] = useState<EngagementSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [graphRes, engRes] = await Promise.all([
          browserBackendFetch(`/api/engagements/${id}/graph`),
          browserBackendFetch(`/api/engagements/${id}`),
        ]);

        if (cancelled) return;

        if (!graphRes.ok) {
          setError("Failed to load knowledge graph data");
          setLoading(false);
          return;
        }

        const gData = await graphRes.json();
        setGraphData(gData);

        if (engRes.ok) {
          const engData = await engRes.json();
          setEngagement(engData.engagement ?? null);
        }
      } catch {
        if (!cancelled) setError("Network error loading knowledge graph");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Filter nodes
  const filteredNodes = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((n) => {
      if (typeFilter !== "all" && n.type !== typeFilter) return false;
      if (severityFilter !== "all") {
        const sev = n.properties?.severity;
        if (!sev || sev !== severityFilter) return false;
      }
      return true;
    });
  }, [graphData, typeFilter, severityFilter]);

  // Group filtered nodes by type
  const nodesByType = useMemo(() => {
    const groups = new Map<string, GraphNodeData[]>();
    for (const n of filteredNodes) {
      if (!groups.has(n.type)) groups.set(n.type, []);
      groups.get(n.type)!.push(n);
    }
    return groups;
  }, [filteredNodes]);

  // Edge counts per node
  const edgeCounts = useMemo(() => {
    if (!graphData) return new Map<string, number>();
    const counts = new Map<string, number>();
    for (const e of graphData.edges) {
      counts.set(e.source, (counts.get(e.source) || 0) + 1);
      counts.set(e.target, (counts.get(e.target) || 0) + 1);
    }
    return counts;
  }, [graphData]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !graphData) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData]);

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
  }, []);

  const stats = graphData?.stats;
  const chains = graphData?.chains ?? [];
  const isEmpty =
    !graphData || (graphData.nodes.length === 0 && graphData.edges.length === 0);

  return (
    <div className="p-6 md:p-8 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <Link
          href={`/${locale}/dashboard/audits/${id}`}
          className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-muted)] hover:text-white transition-colors mb-4"
        >
          <ChevronLeft size={12} />
          Back to audit
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Network className="w-5 h-5 text-[var(--text-muted)]" />
            <div>
              <h1 className="text-xl font-black tracking-tight">
                KNOWLEDGE GRAPH
                {engagement ? (
                  <span className="text-[var(--text-muted)] font-normal">
                    {" "}
                    &mdash; {engagement.name}
                  </span>
                ) : null}
              </h1>
              <p className="text-[10px] font-mono text-[var(--text-subtle)] mt-0.5">
                Attack chain explorer &mdash; nodes, edges, and paths
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && !isEmpty && (
        <div className="flex-shrink-0 mb-4">
          <div className="grid grid-cols-4 gap-px bg-[var(--border)]">
            <div className="bg-[var(--bg)] px-3 py-2">
              <div className="text-[14px] font-mono text-white">
                {stats.nodeCount}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">
                Nodes
              </div>
            </div>
            <div className="bg-[var(--bg)] px-3 py-2">
              <div className="text-[14px] font-mono text-white">
                {stats.edgeCount}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">
                Edges
              </div>
            </div>
            <div className="bg-[var(--bg)] px-3 py-2">
              <div
                className="text-[14px] font-mono"
                style={{ color: stats.criticalFindings > 0 ? "#ff4444" : "var(--text-muted)" }}
              >
                {stats.criticalFindings}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">
                Critical
              </div>
            </div>
            <div className="bg-[var(--bg)] px-3 py-2">
              <div
                className="text-[14px] font-mono"
                style={{ color: stats.highFindings > 0 ? "#ff9900" : "var(--text-muted)" }}
              >
                {stats.highFindings}
              </div>
              <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">
                High
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter controls */}
      {!isEmpty && (
        <div className="flex-shrink-0 mb-4 flex items-center gap-3">
          <Filter className="w-3 h-3 text-[var(--text-subtle)]" />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setSelectedNodeId(null);
            }}
            className="text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] px-2 py-1 appearance-none cursor-pointer focus:outline-none focus:border-white"
          >
            {NODE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setSelectedNodeId(null);
            }}
            className="text-[10px] font-mono bg-[var(--bg-input)] border border-[var(--border)] text-[var(--text-muted)] px-2 py-1 appearance-none cursor-pointer focus:outline-none focus:border-white"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="text-[9px] font-mono text-[var(--text-subtle)] ml-auto">
            {filteredNodes.length} node{filteredNodes.length !== 1 ? "s" : ""}{" "}
            shown
          </span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] mx-auto mb-2" />
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && isEmpty && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center border border-[var(--border)] px-8 py-8">
            <Network className="w-5 h-5 text-[var(--text-subtle)] mx-auto mb-2" />
            <p className="text-[11px] font-mono text-[var(--text-muted)]">
              No graph data yet.
            </p>
            <p className="text-[9px] font-mono text-[var(--text-subtle)] mt-1">
              Run a scan to populate the knowledge graph.
            </p>
          </div>
        </div>
      )}

      {/* Main graph explorer */}
      {!loading && !error && !isEmpty && graphData && (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          {/* Two-panel explorer */}
          <div className="flex-1 flex gap-px bg-[var(--border)] min-h-0 border border-[var(--border)]">
            {/* Left panel: nodes list (40%) */}
            <div className="w-[40%] bg-[var(--bg)] flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-[var(--border)] flex-shrink-0">
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)]">
                  Nodes
                </span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {[...nodesByType.entries()].map(([type, typeNodes]) => {
                  const color = NODE_TYPE_COLORS[type] || "var(--text-muted)";
                  return (
                    <div key={type}>
                      {/* Type group header */}
                      <div
                        className="px-3 py-1.5 sticky top-0 z-10 border-b border-[var(--border)]"
                        style={{ backgroundColor: NODE_TYPE_BG[type] || "var(--bg)" }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-1.5 flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className="text-[8px] font-mono uppercase tracking-[0.15em] font-bold"
                            style={{ color }}
                          >
                            {type}
                          </span>
                          <span className="text-[8px] font-mono text-[var(--text-subtle)] ml-auto">
                            {typeNodes.length}
                          </span>
                        </div>
                      </div>
                      {/* Nodes in group */}
                      {typeNodes.map((node) => (
                        <NodeListItem
                          key={node.id}
                          node={node}
                          isSelected={selectedNodeId === node.id}
                          onSelect={() => handleSelectNode(node.id)}
                          edgeCount={edgeCounts.get(node.id) || 0}
                        />
                      ))}
                    </div>
                  );
                })}
                {filteredNodes.length === 0 && (
                  <div className="px-3 py-6 text-center text-[10px] font-mono text-[var(--text-subtle)]">
                    No nodes match the current filters.
                  </div>
                )}
              </div>
            </div>

            {/* Right panel: node detail (60%) */}
            <div className="w-[60%] bg-[var(--bg)] flex flex-col min-h-0">
              {selectedNode ? (
                <NodeDetailPanel
                  node={selectedNode}
                  edges={graphData.edges}
                  nodes={graphData.nodes}
                  onSelectNode={handleSelectNode}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Network className="w-5 h-5 text-[var(--text-subtle)] mx-auto mb-2" />
                    <p className="text-[10px] font-mono text-[var(--text-subtle)]">
                      Select a node to view details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attack chains section */}
          {chains.length > 0 && (
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 bg-[var(--danger)]" />
                <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[var(--text-subtle)] font-bold">
                  Attack Chains
                </span>
                <span className="text-[8px] font-mono text-[var(--text-subtle)]">
                  ({chains.length})
                </span>
              </div>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
    </div>
  );
}
