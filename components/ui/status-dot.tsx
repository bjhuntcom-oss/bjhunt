/**
 * StatusDot — 6px state-color circle (refonte 2026 §7).
 *
 * Replaces pill badges across the app. When `pulse` is set, the dot animates
 * a 1.5s ease-in-out infinite glow per spec §10. When `label` is provided,
 * a 13px caption renders next to the dot.
 */
import { cn } from "@/lib/utils";

export type StatusDotState = "success" | "warning" | "critical" | "neutral";

interface StatusDotProps {
  state: StatusDotState;
  label?: string;
  pulse?: boolean;
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

export function StatusDot({ state, label, pulse, className }: StatusDotProps) {
  const color = STATE_VAR[state];
  const ringColor = STATE_TINT[state];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className={cn(
          "relative inline-block rounded-full",
          pulse && "bjhunt-pulse-live"
        )}
        style={{
          width: 6,
          height: 6,
          backgroundColor: color,
          boxShadow: `0 0 0 2px ${ringColor}`,
        }}
      />
      {label && (
        <span
          className="font-sans text-[13px] leading-[1.4]"
          style={{ color: "var(--bjhunt-text)" }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
