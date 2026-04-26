/**
 * ProgressBarPhases — horizontal multi-phase progress for the 5-stage Vuln
 * Research Pipeline (Scanner → Detector → Verifier → Patcher → Exploiter) or
 * any ordered sequence of named phases.
 *
 * Each phase advances through pending → active → complete. The active phase
 * animates a shimmer stripe; complete phases glow at the accent color; errored
 * phases render in critical-severity red with a static fill.
 */
'use client'

import { type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type PhaseState = 'pending' | 'active' | 'complete' | 'error'

export interface Phase {
  id: string
  label: string
  /** Substate label — e.g. "12 / 47" or "0.8s". */
  detail?: ReactNode
  state: PhaseState
  /** 0..1 — rendered as a partial fill on active phase. Default 0 for pending, 1 for complete. */
  progress?: number
}

export interface ProgressBarPhasesProps {
  phases: Phase[]
  /** Accent color for complete/active phases. Default = primary text (white). */
  accent?: string
  /** Show the step number 01/02/… above each label. */
  numbered?: boolean
  className?: string
}

const KEYFRAMES = `
@keyframes bjhunt-phase-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`

export function ProgressBarPhases({
  phases,
  accent = 'var(--bjhunt-text)',
  numbered = true,
  className,
}: ProgressBarPhasesProps) {
  return (
    <div
      className={cn('bjhunt-progress-phases', className)}
      style={
        {
          ['--bjhunt-phase-accent' as string]: accent,
          display: 'grid',
          gridTemplateColumns: `repeat(${phases.length}, 1fr)`,
          gap: 2,
          fontFamily: 'var(--bjhunt-font-sans)',
        } as CSSProperties
      }
    >
      <style>{KEYFRAMES}</style>
      {phases.map((p, i) => (
        <PhaseCell key={p.id} phase={p} index={i} numbered={numbered} />
      ))}
    </div>
  )
}

function PhaseCell({
  phase,
  index,
  numbered,
}: {
  phase: Phase
  index: number
  numbered: boolean
}) {
  const isActive = phase.state === 'active'
  const isComplete = phase.state === 'complete'
  const isError = phase.state === 'error'
  const progress =
    phase.progress != null
      ? phase.progress
      : isComplete
      ? 1
      : isActive
      ? 0.5
      : 0

  const color = isError
    ? 'var(--state-critical)'
    : isActive || isComplete
    ? 'var(--bjhunt-phase-accent)'
    : 'var(--bjhunt-text-disabled)'

  return (
    <div
      aria-label={`${phase.label} ${phase.state}`}
      role="progressbar"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid var(--bjhunt-border)',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
        minHeight: 78,
      }}
    >
      {/* top accent rail */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          height: 2,
          width: `${progress * 100}%`,
          background: color,
          boxShadow: isActive ? `0 0 12px ${color}` : undefined,
          transition: 'width var(--bjhunt-duration-base) var(--bjhunt-ease-out, ease)',
        }}
      />
      {isActive && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: 2,
            width: '30%',
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
            animation: 'bjhunt-phase-shimmer 1.6s ease-in-out infinite',
          }}
        />
      )}

      <span
        style={{
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 9,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'var(--bjhunt-text-disabled)',
          display: 'inline-flex',
          gap: 10,
          alignItems: 'center',
        }}
      >
        {numbered && (
          <span>{String(index + 1).padStart(2, '0')}</span>
        )}
        <StateDot state={phase.state} />
        <span
          style={{
            color:
              isActive || isComplete || isError
                ? 'var(--bjhunt-text-muted)'
                : 'var(--bjhunt-text-disabled)',
          }}
        >
          {phase.state}
        </span>
      </span>

      <span
        style={{
          fontSize: 15,
          fontWeight: 400,
          letterSpacing: '-0.01em',
          color:
            isActive || isComplete
              ? 'var(--bjhunt-text)'
              : isError
              ? 'var(--state-critical)'
              : 'var(--bjhunt-text-muted)',
        }}
      >
        {phase.label}
      </span>

      {phase.detail != null && (
        <span
          style={{
            fontFamily: 'var(--bjhunt-font-mono)',
            fontSize: 10,
            color: 'var(--bjhunt-text-muted)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.08em',
          }}
        >
          {phase.detail}
        </span>
      )}
    </div>
  )
}

function StateDot({ state }: { state: PhaseState }) {
  const color =
    state === 'error'
      ? 'var(--state-critical)'
      : state === 'complete'
      ? 'var(--state-success)'
      : state === 'active'
      ? 'var(--bjhunt-phase-accent)'
      : 'var(--bjhunt-text-disabled)'
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        background: color,
        boxShadow:
          state === 'active'
            ? `0 0 8px ${color}`
            : state === 'complete'
            ? `0 0 4px ${color}`
            : undefined,
        display: 'inline-block',
      }}
    />
  )
}
