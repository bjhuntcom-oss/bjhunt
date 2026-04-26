/**
 * Shared types + constants for the knowledge graph view.
 *
 * Splitting these out keeps the page module ≤300 LOC per refonte 2026 §13.
 */
import { Server, Database, AlertTriangle, Key, FileText, Network } from 'lucide-react'

export interface GraphNodeData {
  id: string
  type: string
  label: string
  properties: Record<string, unknown>
}

export interface GraphEdgeData {
  id: string
  source: string
  target: string
  type: string
}

export interface GraphStatsData {
  nodeCount: number
  edgeCount: number
  criticalFindings: number
  highFindings: number
}

export interface GraphChain {
  id: string
  severity: string
  nodes: string[]
}

export interface RichChain {
  id: string
  severity: string
  riskScore: number
  nodes: Array<{
    id: string
    label: string
    type: string
    severity: string
  }>
}

export interface GraphResponse {
  nodes: GraphNodeData[]
  edges: GraphEdgeData[]
  stats: GraphStatsData
  chains: GraphChain[]
}

export interface EngagementSummary {
  id: string
  name: string
  status: string
  target: string
}

// State-colored node typing (refonte 2026 — we no longer use chromatic
// per-node-type colors, only the 3-state system). Type still classifies icons.
export const NODE_ICONS: Record<string, typeof Server> = {
  host: Server,
  service: Database,
  vulnerability: AlertTriangle,
  credential: Key,
  finding: FileText,
}

export function nodeIcon(type: string): typeof Server {
  return NODE_ICONS[type] ?? Network
}

export function nodeStateColor(node: GraphNodeData): string {
  const sev = (node.properties?.severity as string | undefined) ?? ''
  if (node.type === 'finding' || node.type === 'vulnerability') {
    if (sev === 'critical' || sev === 'high') return 'var(--state-critical)'
    if (sev === 'medium') return 'var(--state-warning)'
    if (sev === 'low') return 'var(--state-success)'
    return 'var(--state-critical)'
  }
  if (node.type === 'credential') return 'var(--state-warning)'
  if (node.type === 'host' || node.type === 'service') return 'var(--bjhunt-text)'
  return 'var(--bjhunt-text-muted)'
}

export function severityState(severity: string): 'success' | 'warning' | 'critical' | 'neutral' {
  if (severity === 'critical' || severity === 'high') return 'critical'
  if (severity === 'medium') return 'warning'
  if (severity === 'low') return 'success'
  return 'neutral'
}

export const EDGE_TYPE_LABELS: Record<string, string> = {
  AFFECTS: 'AFFECTS',
  ESCALATES_TO: 'ESCALATES TO',
  LEADS_TO: 'LEADS TO',
  VALIDATES: 'VALIDATES',
  HAS_SERVICE: 'HAS SERVICE',
  EXPOSES: 'EXPOSES',
}

export const NODE_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'host', label: 'Host' },
  { value: 'service', label: 'Service' },
  { value: 'vulnerability', label: 'Vulnerability' },
  { value: 'credential', label: 'Credential' },
  { value: 'finding', label: 'Finding' },
] as const

export const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'info', label: 'Info' },
] as const

export const SUPPORTED_FORMATS = [
  { ext: 'nmap XML', desc: 'Nmap scan output' },
  { ext: 'nuclei JSONL', desc: 'Nuclei scan results' },
  { ext: 'SARIF', desc: 'Static analysis results' },
  { ext: 'BloodHound JSON', desc: 'AD attack paths' },
  { ext: 'testssl JSON', desc: 'TLS/SSL scan results' },
] as const
