// components/ui/status-dot.tsx
//
// BJHUNT 2026 — StatusDot atomic. Per docs/refonte-2026/DESIGN-SYSTEM-2026.md §7.
// 6px state-color circle + optional 13px label in body color. Replaces pill
// badges where the visual weight of a filled badge isn't justified.

import { cn } from "@/lib/utils";

type DotState = "success" | "warning" | "critical" | "neutral";

const STATE_COLORS: Record<DotState, string> = {
  success: "var(--state-success)",
  warning: "var(--state-warning)",
  critical: "var(--state-critical)",
  neutral: "var(--bjhunt-2026-text-muted)",
};

const STATE_TINTS: Record<DotState, string> = {
  success: "var(--state-success-tint)",
  warning: "var(--state-warning-tint)",
  critical: "var(--state-critical-tint)",
  neutral: "rgba(139,148,158,0.12)",
};

interface StatusDotProps {
  state: DotState;
  label?: string;
  pulse?: boolean;
  className?: string;
  /** mono UPPERCASE eyebrow style label (default: false → 13px sans body). */
  mono?: boolean;
}

export function StatusDot({ state, label, pulse = false, className, mono = false }: StatusDotProps) {
  const color = STATE_COLORS[state];
  const tint = STATE_TINTS[state];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="relative inline-flex h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      >
        {pulse && (
          <span
            className="motion-reduce:hidden absolute inset-0 -m-1 rounded-full"
            style={{
              background: tint,
              animation: "bjhunt-2026-dot-pulse 1.5s ease-in-out infinite",
            }}
          />
        )}
      </span>
      {label ? (
        mono ? (
          <span
            className="font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            {label}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "var(--bjhunt-2026-text)" }}>{label}</span>
        )
      ) : null}
    </span>
  );
}

// Local keyframes — keeps the component self-contained even if globals.css
// hasn't been updated yet by the foundation Wave A.
if (typeof document !== "undefined") {
  const id = "bjhunt-2026-dot-pulse-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
@keyframes bjhunt-2026-dot-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.6); opacity: 0; }
}`;
    document.head.appendChild(style);
  }
}
