/**
 * TerminalBlock — atomic, reusable terminal-style command output block.
 * Per docs/architecture/17-DESIGN-SYSTEM.md §Terminal Block.
 *
 * Renders a `<pre>` with mono font, scrollable max-height, header row
 * showing `agent · status · duration`. Used by ToolCallBlock in chat,
 * standalone in audit detail pages, and anywhere we display tool output.
 */

import { type CSSProperties, type ReactNode } from 'react'

export type TerminalStatus = 'running' | 'completed' | 'error'

const STATUS_LABEL: Record<TerminalStatus, string> = {
  running: 'RUNNING',
  completed: 'OK',
  error: 'FAILED',
}

const STATUS_COLOR: Record<TerminalStatus, string> = {
  running: 'var(--state-warning)',
  completed: 'var(--state-success)',
  error: 'var(--state-critical)',
}

export interface TerminalBlockProps {
  /** Source agent identifier (e.g. "recon", "exploit"). Pass through agent-labels for display. */
  agent?: string
  command?: string
  status: TerminalStatus
  /** Duration in milliseconds — formatted to seconds for display. */
  durationMs?: number
  output: string
  /** Cap rendered output. Default 400 lines. */
  maxLines?: number
  /** Custom max-height CSS (default 400px scrollable). */
  maxHeight?: number | string
  className?: string
  /** Slot rendered to the right of the header (typically a copy button). */
  headerRightSlot?: ReactNode
}

export function TerminalBlock({
  agent,
  command,
  status,
  durationMs,
  output,
  maxLines = 400,
  maxHeight = 400,
  className,
  headerRightSlot,
}: TerminalBlockProps) {
  const truncated = output.split('\n').slice(0, maxLines).join('\n')
  const wasTruncated = output.split('\n').length > maxLines

  const wrap: CSSProperties = {
    backgroundColor: 'var(--bjhunt-bg-surface)',
    border: '1px solid var(--bjhunt-border)',
    borderRadius: 'var(--bjhunt-radius-md)',
    fontFamily: 'var(--bjhunt-font-mono)',
    fontSize: 'var(--bjhunt-text-sm)',
    overflow: 'hidden',
  }

  const header: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 12px',
    borderBottom: '1px solid var(--bjhunt-border)',
    backgroundColor: 'var(--bjhunt-bg)',
    color: 'var(--bjhunt-text-muted)',
    fontSize: 'var(--bjhunt-text-xs)',
  }

  const body: CSSProperties = {
    padding: '12px',
    color: 'var(--state-success)',
    overflow: 'auto',
    maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
    whiteSpace: 'pre',
    margin: 0,
  }

  return (
    <div className={className} style={wrap}>
      <div style={header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {agent && <span style={{ color: 'var(--bjhunt-text)' }}>{agent}</span>}
          {command && (
            <>
              <span aria-hidden>·</span>
              <code style={{ color: 'var(--bjhunt-text)' }}>$ {command}</code>
            </>
          )}
          <span aria-hidden>·</span>
          <span style={{ color: STATUS_COLOR[status], fontWeight: 600 }}>
            {STATUS_LABEL[status]}
          </span>
          {typeof durationMs === 'number' && (
            <>
              <span aria-hidden>·</span>
              <span>{(durationMs / 1000).toFixed(2)}s</span>
            </>
          )}
        </div>
        {headerRightSlot}
      </div>
      <pre style={body}>
        {truncated || <span style={{ color: 'var(--bjhunt-text-muted)' }}>(no output)</span>}
        {wasTruncated && (
          <span style={{ color: 'var(--bjhunt-text-muted)', display: 'block', marginTop: 12 }}>
            … truncated at {maxLines} lines …
          </span>
        )}
      </pre>
    </div>
  )
}
