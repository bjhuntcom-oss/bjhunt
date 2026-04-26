/**
 * StateText — inline text in a state color (refonte 2026).
 *
 * Used in tables for "Failed", "Running", "Critical" cells (state-color text,
 * never pill backgrounds — per spec §7 Table).
 */
import { type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type StateTextState =
  | "success"
  | "warning"
  | "critical"
  | "neutral"
  // severity aliases (collapse to tri-state per spec §1)
  | "severity-critical"
  | "severity-high"
  | "severity-medium"
  | "severity-low"
  | "severity-info";

interface StateTextProps {
  state: StateTextState;
  children: ReactNode;
  className?: string;
  /** Optional rendering element. Defaults to span. Also accepts size hints
   *  ("micro", "caption", "body") for callsites that conflate element and size. */
  as?: ElementType | "micro" | "caption" | "body";
}

const COLOR: Record<StateTextState, string> = {
  success:  "var(--state-success)",
  warning:  "var(--state-warning)",
  critical: "var(--state-critical)",
  neutral:  "var(--bjhunt-text-muted)",
  "severity-critical": "var(--state-critical)",
  "severity-high":     "var(--state-critical)",
  "severity-medium":   "var(--state-warning)",
  "severity-low":      "var(--state-success)",
  "severity-info":     "var(--bjhunt-text-muted)",
};

const SIZE: Record<string, string> = {
  micro:   "font-mono font-medium text-[11px] leading-[1.3]",
  caption: "font-sans font-normal text-[13px] leading-[1.4]",
  body:    "font-sans font-normal text-[14px] leading-[1.5]",
};

export function StateText({ state, children, className, as }: StateTextProps) {
  let Tag: ElementType = "span";
  let sizeClass = "";
  if (typeof as === "string" && as in SIZE) {
    sizeClass = SIZE[as];
  } else if (as) {
    Tag = as as ElementType;
  }
  return (
    <Tag className={cn("inline", sizeClass, className)} style={{ color: COLOR[state] }}>
      {children}
    </Tag>
  );
}
