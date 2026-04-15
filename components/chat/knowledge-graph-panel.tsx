"use client";

import { useState } from "react";
import { Network, ChevronDown, ChevronRight, AlertTriangle, Server, Globe, Key, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GraphNode {
  id: string;
  label: string;
  type: "host" | "service" | "vulnerability" | "credential" | "domain" | "network" | "finding";
  severity?: "critical" | "high" | "medium" | "low" | "info";
  properties?: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  criticalFindings: number;
  highFindings: number;
}

interface KnowledgeGraphPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
  className?: string;
}

const NODE_ICONS: Record<string, typeof Server> = {
  host: Server,
  service: Database,
  vulnerability: AlertTriangle,
  credential: Key,
  domain: Globe,
  network: Network,
  finding: AlertTriangle,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
  info: "var(--severity-info)",
};

export function KnowledgeGraphPanel({ nodes, edges, stats, className }: KnowledgeGraphPanelProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "nodes" | "edges">("overview");
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  // Group nodes by type
  const nodesByType = new Map<string, GraphNode[]>();
  for (const node of nodes) {
    if (!nodesByType.has(node.type)) nodesByType.set(node.type, []);
    nodesByType.get(node.type)!.push(node);
  }

  return (
    <div className={cn("border border-[var(--border)] bg-[var(--bg-input)]", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Network className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
            Attack Graph
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px]">
          <span className="text-[var(--text-subtle)]">{stats.nodeCount}N</span>
          <span className="text-[var(--text-subtle)]">{stats.edgeCount}E</span>
          {stats.criticalFindings > 0 && (
            <span className="text-[var(--danger)] bg-[var(--danger-dim)] px-1">
              {stats.criticalFindings} crit
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-[var(--border)]">
        {(["overview", "nodes", "edges"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-1.5 text-[9px] uppercase tracking-wider transition-colors",
              activeTab === tab
                ? "text-white border-b border-white"
                : "text-[var(--text-subtle)] hover:text-[var(--text-muted)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[350px] overflow-y-auto">
        {activeTab === "overview" && (
          <div className="p-3 space-y-3">
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-px bg-[var(--border)]">
              <div className="bg-[var(--bg)] p-2">
                <div className="text-[16px] font-mono text-white">{stats.nodeCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">Nodes</div>
              </div>
              <div className="bg-[var(--bg)] p-2">
                <div className="text-[16px] font-mono text-white">{stats.edgeCount}</div>
                <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">Edges</div>
              </div>
              <div className="bg-[var(--bg)] p-2">
                <div className="text-[16px] font-mono text-[var(--danger)]">{stats.criticalFindings}</div>
                <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">Critical</div>
              </div>
              <div className="bg-[var(--bg)] p-2">
                <div className="text-[16px] font-mono text-[var(--warning)]">{stats.highFindings}</div>
                <div className="text-[8px] uppercase tracking-wider text-[var(--text-subtle)]">High</div>
              </div>
            </div>

            {/* Node type breakdown */}
            <div className="space-y-1">
              {[...nodesByType.entries()].map(([type, typeNodes]) => {
                const Icon = NODE_ICONS[type] || Network;
                return (
                  <div key={type} className="flex items-center justify-between px-2 py-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="text-[10px] text-[var(--text-muted)] capitalize">{type}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-subtle)]">{typeNodes.length}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "nodes" && (
          <div className="divide-y divide-[var(--border)]/30">
            {nodes.map((node) => {
              const Icon = NODE_ICONS[node.type] || Network;
              const isExpanded = expandedNode === node.id;
              return (
                <div key={node.id}>
                  <button
                    onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--bg-card)] transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                    ) : (
                      <ChevronRight className="w-2.5 h-2.5 text-[var(--text-subtle)]" />
                    )}
                    <Icon className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[10px] text-[var(--text-muted)] truncate">{node.label}</span>
                    {node.severity && (
                      <span
                        className="ml-auto text-[8px] uppercase px-1"
                        style={{
                          color: SEVERITY_COLORS[node.severity],
                          backgroundColor: `${SEVERITY_COLORS[node.severity]}15`,
                        }}
                      >
                        {node.severity}
                      </span>
                    )}
                  </button>
                  {isExpanded && node.properties && (
                    <div className="pl-8 pr-3 pb-2 space-y-0.5">
                      {Object.entries(node.properties).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2 text-[9px]">
                          <span className="text-[var(--text-subtle)] min-w-[60px]">{k}:</span>
                          <span className="text-[var(--text-muted)] font-mono truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "edges" && (
          <div className="divide-y divide-[var(--border)]/30">
            {edges.map((edge, i) => {
              const srcNode = nodes.find((n) => n.id === edge.source);
              const tgtNode = nodes.find((n) => n.id === edge.target);
              return (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-[10px]">
                  <span className="text-[var(--text-muted)] truncate max-w-[100px]">
                    {srcNode?.label || edge.source}
                  </span>
                  <span className="text-[var(--text-subtle)] text-[9px] font-mono shrink-0">
                    —[{edge.relationship}]→
                  </span>
                  <span className="text-[var(--text-muted)] truncate max-w-[100px]">
                    {tgtNode?.label || edge.target}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
