// Atomic primitives shared across the admin section (refonte 2026 / B7).
// Kept colocated under app/[locale]/dashboard/admin/_components so they are
// invisible to Next routing.
import { cn } from '@/lib/utils'

type State = 'success' | 'warning' | 'critical' | 'neutral' | 'info'

const STATE_COLOR: Record<State, string> = {
  success: 'var(--bjhunt-status-success)',
  warning: 'var(--bjhunt-status-warning)',
  critical: 'var(--bjhunt-status-danger)',
  info: 'var(--bjhunt-status-info)',
  neutral: 'var(--bjhunt-text-subtle)',
}

const STATE_TINT: Record<State, string> = {
  success: 'rgba(16,185,129,0.18)',
  warning: 'rgba(245,158,11,0.18)',
  critical: 'rgba(239,68,68,0.18)',
  info: 'rgba(59,130,246,0.18)',
  neutral: 'rgba(255,255,255,0.06)',
}

export function StatusDot({
  state = 'neutral',
  pulse = false,
  className,
}: {
  state?: State
  pulse?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn('inline-block flex-shrink-0 rounded-full', className)}
      style={{
        width: 6,
        height: 6,
        background: STATE_COLOR[state],
        boxShadow: pulse ? `0 0 0 2px ${STATE_TINT[state]}` : undefined,
      }}
    />
  )
}

export function StateText({
  state = 'neutral',
  children,
  className,
  mono = false,
}: {
  state?: State
  children: React.ReactNode
  className?: string
  mono?: boolean
}) {
  return (
    <span
      className={cn(mono && 'font-mono', className)}
      style={{ color: STATE_COLOR[state] }}
    >
      {children}
    </span>
  )
}

export function Eyebrow({
  children,
  className,
  withDot = false,
  state = 'success',
}: {
  children: React.ReactNode
  className?: string
  withDot?: boolean
  state?: State
}) {
  return (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      style={{
        fontFamily: 'var(--bjhunt-font-mono)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: 'var(--bjhunt-text-muted)',
      }}
    >
      {withDot && <StatusDot state={state} />}
      <span>{children}</span>
    </div>
  )
}

export function AdminHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <header className="mb-10 md:mb-14">
      <Eyebrow withDot>{eyebrow}</Eyebrow>
      <h1
        className="mt-4"
        style={{
          fontFamily: 'var(--bjhunt-font-display, var(--bjhunt-font-sans))',
          fontWeight: 400,
          fontSize: 'clamp(28px, 3vw, 36px)',
          letterSpacing: '-0.025em',
          lineHeight: 1.11,
          color: 'var(--bjhunt-text)',
          margin: 0,
        }}
      >
        {title}
      </h1>
      {description && (
        <p
          className="mt-3 max-w-2xl"
          style={{
            fontFamily: 'var(--bjhunt-font-sans)',
            fontWeight: 400,
            fontSize: 14,
            lineHeight: 1.5,
            color: 'var(--bjhunt-text-muted)',
          }}
        >
          {description}
        </p>
      )}
    </header>
  )
}

export function KpiCard({
  eyebrow,
  value,
  state = 'neutral',
  mono = true,
}: {
  eyebrow: string
  value: number | string
  state?: State
  mono?: boolean
}) {
  return (
    <div className="border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-secondary)] p-5 md:p-6">
      <div
        style={{
          fontFamily: 'var(--bjhunt-font-mono)',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: 'var(--bjhunt-text-muted)',
        }}
      >
        {eyebrow}
      </div>
      <div
        className="mt-3"
        style={{
          fontFamily: mono
            ? 'var(--bjhunt-font-mono)'
            : 'var(--bjhunt-font-display, var(--bjhunt-font-sans))',
          fontWeight: 400,
          fontSize: 'clamp(28px, 3vw, 36px)',
          letterSpacing: '-0.025em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          color: STATE_COLOR[state],
        }}
      >
        {value}
      </div>
    </div>
  )
}

export type AdminState = State
