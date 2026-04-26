/**
 * StateText — inline text in a state color (refonte 2026).
 *
 * Used in tables for "Failed", "Running", "Critical" cells (state-color text,
 * never pill backgrounds — per spec §7 Table).
 */
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StateTextState = "success" | "warning" | "critical" | "neutral";

interface StateTextProps {
  state: StateTextState;
  children: ReactNode;
  className?: string;
}

const COLOR: Record<StateTextState, string> = {
  success:  "var(--state-success)",
  warning:  "var(--state-warning)",
  critical: "var(--state-critical)",
  neutral:  "var(--bjhunt-text-muted)",
};

export function StateText({ state, children, className }: StateTextProps) {
  return (
    <span className={cn("inline", className)} style={{ color: COLOR[state] }}>
      {children}
    </span>
  );
}
