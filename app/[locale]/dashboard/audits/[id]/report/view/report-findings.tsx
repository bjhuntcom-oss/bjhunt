/**
 * ReportFindings — client component that renders the findings list grouped by
 * severity (desc). Each group is collapsible; each finding renders via
 * FindingCard with the engagement's remediation summary linked in-page.
 */
'use client'

import { useState, type CSSProperties } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { FindingCard } from '@/components/ui/finding-card'
import { type Severity } from '@/components/ui/severity-badge'
import type { AgentId } from '@/lib/agent-labels'

interface Finding {
  id: string
  severity: string
  category: string
  title: string
  description: string | null
  cve: string | null
  cvssScore: number | null
  mitreTechnique?: string | null
  agent?: string | null
  remediation: string | null
  createdAt: string
  verified?: boolean
}

interface Props {
  findings: Finding[]
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function clampSeverity(s: string): Severity {
  return (SEVERITY_ORDER as string[]).includes(s) ? (s as Severity) : 'info'
}

export function ReportFindings({ findings }: Props) {
  const [expanded, setExpanded] = useState<Record<Severity, boolean>>({
    critical: true,
    high: true,
    medium: true,
    low: false,
    info: false,
  })
  const [activeId, setActiveId] = useState<string | null>(null)

  const grouped = SEVERITY_ORDER.map((sev) => ({
    severity: sev,
    items: findings.filter((f) => clampSeverity(f.severity) === sev),
  }))

  if (findings.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--bjhunt-space-8)',
          border: '1px dashed var(--bjhunt-border-strong)',
          textAlign: 'center',
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 'var(--bjhunt-text-xs)',
          color: 'var(--bjhunt-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.22em',
        }}
      >
        No findings recorded for this engagement
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bjhunt-space-8)' }}>
      {grouped.map(({ severity, items }) => {
        if (items.length === 0) return null
        const isOpen = expanded[severity]
        return (
          <section key={severity}>
            <button
              type="button"
              onClick={() => setExpanded((e) => ({ ...e, [severity]: !e[severity] }))}
              aria-expanded={isOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                padding: '10px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--bjhunt-border)',
                cursor: 'pointer',
                marginBottom: 'var(--bjhunt-space-4)',
                textAlign: 'left',
              }}
              className="bjhunt-report-group-toggle"
            >
              {isOpen ? (
                <ChevronDown style={{ width: 14, height: 14, color: 'var(--bjhunt-text-subtle)' }} />
              ) : (
                <ChevronRight style={{ width: 14, height: 14, color: 'var(--bjhunt-text-subtle)' }} />
              )}
              <span
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 'var(--bjhunt-text-xs)',
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: `var(--bjhunt-severity-${severity})`,
                  fontWeight: 600,
                }}
              >
                {severity}
              </span>
              <span
                style={{
                  fontFamily: 'var(--bjhunt-font-mono)',
                  fontSize: 'var(--bjhunt-text-xs)',
                  color: 'var(--bjhunt-text-subtle)',
                  letterSpacing: '0.18em',
                }}
              >
                · {items.length} {items.length === 1 ? 'finding' : 'findings'}
              </span>
            </button>

            {isOpen && (
              <div style={groupGrid}>
                {items.map((f) => (
                  <div key={f.id}>
                    <FindingCard
                      severity={clampSeverity(f.severity)}
                      title={f.title}
                      cve={f.cve}
                      cvss={f.cvssScore ?? undefined}
                      mitre={f.mitreTechnique ?? null}
                      agent={(f.agent ?? null) as AgentId | null}
                      verified={f.verified}
                      description={f.description ?? ''}
                      onClick={() => setActiveId((id) => (id === f.id ? null : f.id))}
                      justArrived={activeId === f.id}
                    />
                    {activeId === f.id && f.remediation && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: 'var(--bjhunt-space-4)',
                          background: 'var(--bjhunt-bg-tertiary)',
                          border: '1px solid var(--bjhunt-border)',
                          borderLeft: `4px solid var(--bjhunt-severity-${clampSeverity(f.severity)})`,
                          color: 'var(--bjhunt-text-muted)',
                          fontSize: 'var(--bjhunt-text-sm)',
                          lineHeight: 1.6,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            marginBottom: 6,
                            fontFamily: 'var(--bjhunt-font-mono)',
                            fontSize: 'var(--bjhunt-text-xs)',
                            color: 'var(--bjhunt-text-subtle)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                          }}
                        >
                          Remediation
                        </p>
                        <p style={{ margin: 0 }}>{f.remediation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}

const groupGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))',
  gap: 'var(--bjhunt-space-4)',
}
