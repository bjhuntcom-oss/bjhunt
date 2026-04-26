/**
 * StatusDot — 6px state-color circle (refonte 2026 §7).
 *
 * Replaces pill badges across the app. When `pulse` is set, the dot animates
 * a 1.5s ease-in-out infinite glow per spec §10. When `label` is provided,
 * a 13px caption renders next to the dot.
 */
import { cn } from "@/lib/utils";

export type StatusDotState = "success" | "warning" | "critical" | "neutral";
/** Alias used by callsites that imported the legacy name. */
export type DotState = StatusDotState;

interface StatusDotProps {
  state: StatusDotState;
  label?: string;
  pulse?: boolean;
  /** Alias for `pulse` — kept for callsite ergonomics. */
  live?: boolean;
  /** Compact mode — drops the outer ring, smaller dot. */
  compact?: boolean;
  /** When true, renders the label in mono UPPERCASE +0.18em (eyebrow style). */
  mono?: boolean;
  className?: string;
}

const STATE_VAR: Record<StatusDotState, string> = {
  success:  "var(--state-success)",
  warning:  "var(--state-warning)",
  critical: "var(--state-critical)",
  neutral:  "var(--bjhunt-text-muted)",
};

const STATE_TINT: Record<StatusDotState, string> = {
  success:  "var(--state-success-tint)",
  warning:  "var(--state-warning-tint)",
  critical: "var(--state-critical-tint)",
  neutral:  "transparent",
};

export function StatusDot({ state, label, pulse, live, compact, mono, className }: StatusDotProps) {
  const animate = pulse ?? live;
  const color = STATE_VAR[state];
  const ringColor = STATE_TINT[state];
  const dotSize = compact ? 5 : 6;

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "relative inline-block rounded-full",
          animate && "bjhunt-pulse-live"
        )}
        style={{
          width: dotSize,
          height: dotSize,
          backgroundColor: color,
          boxShadow: compact ? undefined : `0 0 0 2px ${ringColor}`,
        }}
      />
      {label && (
        <span
          className={cn(
            mono
              ? "font-mono font-semibold text-[11px] uppercase tracking-[0.18em]"
              : "font-sans text-[13px] leading-[1.4]"
          )}
          style={{ color: "var(--bjhunt-text)" }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
