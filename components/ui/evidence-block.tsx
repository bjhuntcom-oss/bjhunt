/**
 * EvidenceBlock — monospace code/payload/ioc viewer with accent rail by kind.
 *
 * Kind drives the left-rail accent color (CSS var consumers can override).
 * Body scrolls vertically at max-height; header keeps title, meta, and actions
 * (copy + collapse) pinned. Supports line-highlight + diff markers.
 */
'use client'

import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EvidenceKind =
  | 'request'
  | 'response'
  | 'payload'
  | 'code'
  | 'terminal'
  | 'diff'
  | 'ioc'
  | 'screenshot'

export interface EvidenceLine {
  /** Plain text for the line. Syntax highlighting is opt-in via pre-tokenised `content`. */
  text?: string
  /** Pre-rendered ReactNode for syntax-highlighted content. If set, overrides `text`. */
  content?: ReactNode
  /** Optional diff marker — renders +/- guttered lines. */
  diff?: 'add' | 'remove' | 'context'
  /** Highlight ring on this line (e.g. the injected payload). */
  highlight?: boolean
}

export interface EvidenceBlockProps {
  kind: EvidenceKind
  title: string
  /** Language label / method+path / binary name — shown in header meta. */
  subtitle?: string
  /** Extra key/value pairs rendered right-aligned in header. */
  meta?: Array<{ label: string; value: ReactNode }>
  lines?: EvidenceLine[]
  /** Cryptographic digest of the raw evidence shown in footer. */
  hash?: string
  /** Start line number (default 1). */
  startLine?: number
  /** Collapsed by default. */
  defaultCollapsed?: boolean
  /** Raw string used when the copy button is clicked. Falls back to joined `lines[].text`. */
  copyText?: string
  className?: string
}

export function EvidenceBlock({
  kind,
  title,
  subtitle,
  meta,
  lines = [],
  hash,
  startLine = 1,
  defaultCollapsed = false,
  copyText,
  className,
}: EvidenceBlockProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const [copied, setCopied] = useState(false)

  const accent = KIND_ACCENT[kind]
  const accentStyle = {
    ['--bjhunt-ev-accent' as string]: accent.color,
    ['--bjhunt-ev-accent-rgb' as string]: accent.rgb,
  } as CSSProperties

  const plain = useMemo(() => {
    if (copyText) return copyText
    return lines.map((l) => l.text ?? '').join('\n')
  }, [lines, copyText])

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(plain)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* noop — browser refused */
    }
  }

  return (
    <div
      style={{
        ...accentStyle,
        position: 'relative',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.003))',
        border: '1px solid var(--bjhunt-border)',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
      className={cn('bjhunt-evidence-block', className)}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 1,
          background: 'var(--bjhunt-ev-accent)',
          opacity: 0.6,
        }}
      />
      {/* header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '14px 20px',
          borderBottom: collapsed ? 'none' : '1px solid var(--bjhunt-border)',
          background: 'rgba(0,0,0,0.25)',
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 10,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--bjhunt-text-muted)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--bjhunt-ev-accent)',
            fontWeight: 500,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              background: 'var(--bjhunt-ev-accent)',
              boxShadow: '0 0 8px rgba(var(--bjhunt-ev-accent-rgb),0.6)',
            }}
          />
          {kind}
        </span>
        <span
          style={{
            color: 'var(--bjhunt-text)',
            fontWeight: 400,
            letterSpacing: '0.05em',
            textTransform: 'none',
            fontFamily: 'var(--bjhunt-font-sans)',
            fontSize: 13,
            flex: 1,
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </span>
        {subtitle && (
          <span style={{ color: 'var(--bjhunt-text-muted)' }}>{subtitle}</span>
        )}
        {meta && meta.length > 0 && (
          <span
            style={{
              display: 'flex',
              gap: 18,
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {meta.map((m) => (
              <span key={m.label} style={{ display: 'inline-flex', gap: 6 }}>
                <span style={{ color: 'var(--bjhunt-text-disabled)' }}>
                  {m.label}
                </span>
                <span style={{ color: 'var(--bjhunt-text-muted)' }}>
                  {m.value}
                </span>
              </span>
            ))}
          </span>
        )}
        <span style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          <Act onClick={doCopy} active={copied} label={copied ? 'Copied' : 'Copy'}>
            {copied ? (
              <Check style={{ width: 11, height: 11 }} />
            ) : (
              <Copy style={{ width: 11, height: 11 }} />
            )}
          </Act>
          <Act
            onClick={() => setCollapsed((c) => !c)}
            label={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (
              <ChevronDown style={{ width: 11, height: 11 }} />
            ) : (
              <ChevronUp style={{ width: 11, height: 11 }} />
            )}
          </Act>
        </span>
      </div>

      {!collapsed && (
        <>
          <div
            style={{
              position: 'relative',
              overflow: 'auto',
              maxHeight: 420,
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 12,
              lineHeight: 1.65,
              color: '#EEFFFF',
            }}
          >
            <pre style={{ display: 'flex', margin: 0, minHeight: '100%' }}>
              <div
                aria-hidden
                style={{
                  flexShrink: 0,
                  padding: '16px 16px 16px 20px',
                  color: 'var(--bjhunt-text-disabled)',
                  userSelect: 'none',
                  textAlign: 'right',
                  borderRight: '1px solid var(--bjhunt-border)',
                  background: 'rgba(0,0,0,0.25)',
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                }}
              >
                {lines.map((l, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'block',
                      paddingRight: 4,
                      color: l.highlight ? 'var(--bjhunt-ev-accent)' : undefined,
                      fontWeight: l.highlight ? 500 : 300,
                    }}
                  >
                    {l.diff === 'add' ? '+' : l.diff === 'remove' ? '-' : startLine + i}
                  </span>
                ))}
              </div>
              <code
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  whiteSpace: 'pre',
                  minWidth: 0,
                }}
              >
                {lines.map((l, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'block',
                      minHeight: '1.65em',
                      background: l.highlight
                        ? 'rgba(var(--bjhunt-ev-accent-rgb),0.08)'
                        : l.diff === 'add'
                        ? 'rgba(48,209,88,0.08)'
                        : l.diff === 'remove'
                        ? 'rgba(255,69,58,0.08)'
                        : undefined,
                      boxShadow: l.highlight
                        ? 'inset 2px 0 0 var(--bjhunt-ev-accent)'
                        : undefined,
                      margin: l.highlight || l.diff ? '0 -20px' : undefined,
                      padding: l.highlight || l.diff ? '0 20px' : undefined,
                    }}
                  >
                    {l.content ?? l.text ?? '\u00A0'}
                  </span>
                ))}
              </code>
            </pre>
          </div>
          {hash && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 20px',
                borderTop: '1px solid var(--bjhunt-border)',
                background: 'rgba(0,0,0,0.2)',
                fontFamily: 'var(--bjhunt-font-mono)',
                fontSize: 9,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'var(--bjhunt-text-disabled)',
              }}
            >
              <span>sha-256</span>
              <span
                style={{
                  color: 'var(--bjhunt-text-muted)',
                  fontWeight: 400,
                  marginLeft: 10,
                }}
              >
                {hash}
              </span>
              <span style={{ flex: 1 }} />
              <span>{lines.length} lines</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Act({
  onClick,
  children,
  label,
  active,
}: {
  onClick: () => void
  children: ReactNode
  label: string
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        appearance: 'none',
        background: 'transparent',
        border: '1px solid transparent',
        color: active ? 'var(--state-success)' : 'var(--bjhunt-text-muted)',
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 9,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        padding: '4px 10px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'color var(--bjhunt-duration-fast), background var(--bjhunt-duration-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = active
          ? 'var(--state-success)'
          : 'var(--bjhunt-text)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = active
          ? 'var(--state-success)'
          : 'var(--bjhunt-text-muted)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

/** Kind→state mapping (refonte 2026 only allows tri-state colors). */
const KIND_ACCENT: Record<EvidenceKind, { color: string; rgb: string }> = {
  request:    { color: 'var(--bjhunt-text-muted)', rgb: '139,148,158' },
  response:   { color: 'var(--bjhunt-text-muted)', rgb: '139,148,158' },
  payload:    { color: 'var(--state-critical)',    rgb: '251,86,91' },
  code:       { color: 'var(--bjhunt-text)',       rgb: '242,242,242' },
  terminal:   { color: 'var(--state-success)',     rgb: '0,217,146' },
  diff:       { color: 'var(--bjhunt-text-muted)', rgb: '139,148,158' },
  ioc:        { color: 'var(--state-warning)',     rgb: '255,186,0' },
  screenshot: { color: 'var(--bjhunt-text-muted)', rgb: '139,148,158' },
}
