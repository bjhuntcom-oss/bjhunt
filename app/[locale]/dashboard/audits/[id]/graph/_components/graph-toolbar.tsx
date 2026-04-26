/**
 * GraphToolbar — filter / tab strip for the knowledge graph view.
 *
 * Ghost-button strip with mono labels per refonte 2026 §7. State-colored
 * notification dot for attack-chain count.
 */
'use client'

import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Eyebrow } from '@/components/ui/typography'
import {
  NODE_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
} from './graph-types'

export type GraphTab = 'explorer' | 'chains'

export function GraphTabs({
  activeTab,
  onChange,
  chainsBadge,
}: {
  activeTab: GraphTab
  onChange: (tab: GraphTab) => void
  chainsBadge: number
}) {
  return (
    <div className="flex items-center gap-0">
      <TabButton active={activeTab === 'explorer'} onClick={() => onChange('explorer')}>
        Explorer
      </TabButton>
      <TabButton
        active={activeTab === 'chains'}
        onClick={() => onChange('chains')}
        badge={chainsBadge > 0 ? chainsBadge : undefined}
      >
        Attack chains
      </TabButton>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  badge,
  children,
}: {
  active: boolean
  onClick: () => void
  badge?: number
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'h-9 px-4 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] border transition-colors',
        active
          ? 'text-[var(--bjhunt-text)] border-[var(--bjhunt-border-strong)] bg-[var(--bjhunt-bg-secondary)]'
          : 'text-[var(--bjhunt-text-muted)] border-[var(--bjhunt-border)] hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)]',
        '[&:not(:first-child)]:border-l-0',
      )}
    >
      {children}
      {badge != null && (
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-mono tabular-nums"
          style={{
            background: 'var(--state-critical)',
            color: '#000',
            borderRadius: 9999,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export function GraphFilterBar({
  typeFilter,
  severityFilter,
  onTypeFilter,
  onSeverityFilter,
  shownCount,
}: {
  typeFilter: string
  severityFilter: string
  onTypeFilter: (v: string) => void
  onSeverityFilter: (v: string) => void
  shownCount: number
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Filter size={14} className="text-[var(--bjhunt-text-muted)]" aria-hidden />
      <FilterSelect
        label="Type"
        value={typeFilter}
        options={NODE_TYPE_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={onTypeFilter}
      />
      <FilterSelect
        label="Severity"
        value={severityFilter}
        options={SEVERITY_OPTIONS as unknown as { value: string; label: string }[]}
        onChange={onSeverityFilter}
      />
      <span className="text-[12px] font-mono text-[var(--bjhunt-text-muted)] ml-auto tabular-nums">
        {shownCount} node{shownCount !== 1 ? 's' : ''} shown
      </span>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 h-9 px-3 border border-[var(--bjhunt-border)] hover:border-[var(--bjhunt-border-strong)] rounded-[6px] transition-colors">
      <Eyebrow>{label}</Eyebrow>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-[12px] font-mono text-[var(--bjhunt-text)] outline-none cursor-pointer appearance-none"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function GraphStats({
  stats,
}: {
  stats: {
    nodeCount: number
    edgeCount: number
    criticalFindings: number
    highFindings: number
  }
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[var(--bjhunt-border)] border border-[var(--bjhunt-border)]">
      <StatCell value={stats.nodeCount} label="Nodes" />
      <StatCell value={stats.edgeCount} label="Edges" />
      <StatCell
        value={stats.criticalFindings}
        label="Critical"
        color={stats.criticalFindings > 0 ? 'var(--state-critical)' : undefined}
      />
      <StatCell
        value={stats.highFindings}
        label="High"
        color={stats.highFindings > 0 ? 'var(--state-warning)' : undefined}
      />
    </div>
  )
}

function StatCell({
  value,
  label,
  color,
}: {
  value: number
  label: string
  color?: string
}) {
  return (
    <div className="bg-[var(--bjhunt-bg)] px-4 py-3">
      <div
        className="font-mono text-[18px] tabular-nums"
        style={{ color: color ?? 'var(--bjhunt-text)' }}
      >
        {value}
      </div>
      <Eyebrow>{label}</Eyebrow>
    </div>
  )
}
