/**
 * AgentTransition — header/pill/mini for the 17-agent handoff.
 *
 * Reads the agent registry from @/lib/agent-labels — the label, role, color and
 * icon are owned there. This file only handles layout + the dissolve/blur
 * animation when the active agent id changes.
 *
 * Variants:
 *   - banner  full stream/audit header; 72px icon, name, role chip, description
 *   - pill    chat message header; compact pill with pulsing dot
 *   - mini    sidebar/status-bar indicator
 *
 * The transition animation runs automatically when the `agentId` prop changes —
 * no parent-driven choreography required.
 */
'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { agentMeta, hexToRgb, type AgentId } from '@/lib/agent-labels'
import { cn } from '@/lib/utils'

export type AgentTransitionVariant = 'banner' | 'pill' | 'mini'

export interface AgentTransitionProps {
  agentId: AgentId | string
  variant?: AgentTransitionVariant
  /** Override the subtitle role chip on the banner. */
  roleLabel?: string
  /** Override the description paragraph on the banner. */
  description?: string
  className?: string
}

const KEYFRAMES = `
@keyframes bjhunt-agent-exit {
  0%   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  100% { opacity: 0; transform: translateY(-6px) scale(0.98); filter: blur(6px); }
}
@keyframes bjhunt-agent-enter {
  0%   { opacity: 0; transform: translateY(8px) scale(0.96); filter: blur(8px); }
  60%  { opacity: 1; filter: blur(0); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes bjhunt-handoff-sweep {
  0%   { transform: translateX(-100%); opacity: 0; }
  20%, 80% { opacity: 1; }
  100% { transform: translateX(100%); opacity: 0; }
}
@keyframes bjhunt-pulse-ring {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.04); }
}
`

export function AgentTransition({
  agentId,
  variant = 'banner',
  roleLabel,
  description,
  className,
}: AgentTransitionProps) {
  const meta = agentMeta(agentId)
  const [current, setCurrent] = useState(meta)
  const [previous, setPrevious] = useState<typeof meta | null>(null)
  const prevIdRef = useRef<string>(meta.id)

  useEffect(() => {
    if (meta.id === prevIdRef.current) return
    setPrevious(agentMeta(prevIdRef.current))
    prevIdRef.current = meta.id
    // allow exit animation to play, then swap
    const t = setTimeout(() => {
      setCurrent(meta)
      const clr = setTimeout(() => setPrevious(null), 640)
      return () => clearTimeout(clr)
    }, 220)
    return () => clearTimeout(t)
  }, [meta])

  const rgb = hexToRgb(current.color)
  const accentVars = {
    ['--agent-color' as string]: current.color,
    ['--agent-rgb' as string]: rgb,
    ['--agent-border' as string]: `rgba(${rgb},0.22)`,
    ['--agent-soft' as string]: `rgba(${rgb},0.06)`,
  } as CSSProperties

  if (variant === 'pill') {
    return (
      <span style={accentVars} className={cn('bjhunt-agent-pill', className)}>
        <style>{KEYFRAMES}</style>
        <PillInner meta={current} />
      </span>
    )
  }
  if (variant === 'mini') {
    const Icon = current.icon
    return (
      <span
        style={{
          ...accentVars,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 4px 8px',
          border: '1px solid var(--agent-border)',
          background: 'rgba(255,255,255,0.02)',
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 9,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'var(--bjhunt-text-muted)',
        }}
        className={className}
      >
        <Icon style={{ width: 11, height: 11, color: 'var(--agent-color)' }} aria-hidden />
        <span>{current.label}</span>
      </span>
    )
  }

  // banner
  const Icon = current.icon
  const handingOff = previous != null
  return (
    <div
      style={{
        ...accentVars,
        position: 'relative',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.004))',
        border: '1px solid var(--bjhunt-border)',
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 40,
        overflow: 'hidden',
        isolation: 'isolate',
        minHeight: 140,
      } as CSSProperties}
      className={cn('bjhunt-agent-transition', className)}
    >
      <style>{KEYFRAMES}</style>
      {/* accent rail */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 28,
          bottom: 28,
          width: 1,
          background: 'var(--agent-color)',
          opacity: 0.5,
        }}
      />
      {/* sweep overlay */}
      {handingOff && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, transparent 0%, var(--agent-color) 50%, transparent 100%)',
            opacity: 0,
            pointerEvents: 'none',
            mixBlendMode: 'overlay',
            animation: 'bjhunt-handoff-sweep 640ms var(--bjhunt-ease-out, ease)',
          }}
        />
      )}
      <div
        style={{
          position: 'relative',
          width: 72,
          height: 72,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--agent-border)',
          color: 'var(--agent-color)',
          animation: 'bjhunt-agent-enter 640ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
        key={`icon-${current.id}`}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: -1,
            border: '1px solid var(--agent-color)',
            opacity: 0.3,
            animation: 'bjhunt-pulse-ring 2.4s var(--bjhunt-ease-out, ease) infinite',
          }}
        />
        <Icon style={{ width: 28, height: 28 }} />
      </div>

      <div
        key={`body-${current.id}`}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          animation: 'bjhunt-agent-enter 640ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--bjhunt-text-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {previous ? (
            <>
              <span
                style={{
                  color: 'var(--bjhunt-text-disabled)',
                  textDecoration: 'line-through',
                }}
              >
                {previous.label}
              </span>
              <span style={{ color: 'var(--bjhunt-text-disabled)' }}>→</span>
            </>
          ) : (
            <span>NOW ACTIVE</span>
          )}
          <span>{current.role}</span>
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--bjhunt-text)',
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
          }}
        >
          {current.label}
          <span
            style={{
              fontFamily: 'var(--bjhunt-font-mono)',
              fontSize: 10,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: 'var(--agent-color)',
              padding: '3px 10px',
              border: '1px solid var(--agent-border)',
              background: 'var(--agent-soft)',
            }}
          >
            {roleLabel ?? current.role}
          </span>
        </div>
        <p
          style={{
            color: 'var(--bjhunt-text-muted)',
            fontSize: 13,
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 620,
            fontWeight: 400,
          }}
        >
          {description ?? current.description}
        </p>
      </div>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 10,
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 10,
          color: 'var(--bjhunt-text-muted)',
          letterSpacing: '0.14em',
          flexShrink: 0,
        }}
      >
        <KV label="Agent ID" val={current.id} />
        <KV label="Color" val={current.color} />
        <KV
          label="Status"
          val={<span style={{ color: 'var(--agent-color)' }}>● ACTIVE</span>}
        />
      </div>
    </div>
  )
}

function KV({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', gap: 10 }}>
      <span
        style={{
          color: 'var(--bjhunt-text-disabled)',
          textTransform: 'uppercase',
          letterSpacing: '0.24em',
        }}
      >
        {label}
      </span>
      <span style={{ color: 'var(--bjhunt-text)', fontVariantNumeric: 'tabular-nums' }}>
        {val}
      </span>
    </span>
  )
}

function PillInner({ meta }: { meta: ReturnType<typeof agentMeta> }) {
  const Icon = meta.icon
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '6px 12px 6px 8px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.008))',
        border: '1px solid var(--agent-border)',
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 10,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 5,
          height: 5,
          background: 'var(--agent-color)',
          boxShadow: '0 0 10px var(--agent-color)',
          animation: 'bjhunt-pulse-ring 1.8s var(--bjhunt-ease-out, ease) infinite',
        }}
      />
      <Icon style={{ width: 14, height: 14, color: 'var(--agent-color)' }} aria-hidden />
      <span style={{ color: 'var(--bjhunt-text)', fontWeight: 400 }}>{meta.label}</span>
    </span>
  )
}
