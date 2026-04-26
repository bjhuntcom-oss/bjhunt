"use client";

interface PlanBadgeProps {
  requiredPlan: "pro" | "enterprise";
}

// Refonte 2026: retired indigo brand (#4a9eff) and gold (#FFD700) hex.
// PRO uses neutral text token (no brand accent); ENTERPRISE uses the
// state-warning amber to signal premium tier — both consume CSS vars only.
const PLAN_STYLES: Record<string, { color: string; border: string; label: string }> = {
  pro: {
    color:  "var(--bjhunt-text)",
    border: "var(--bjhunt-border-strong)",
    label:  "PRO",
  },
  enterprise: {
    color:  "var(--state-warning)",
    border: "var(--state-warning)",
    label:  "ENTERPRISE",
  },
};

export function PlanBadge({ requiredPlan }: PlanBadgeProps) {
  const style = PLAN_STYLES[requiredPlan] || PLAN_STYLES.pro;

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 font-mono font-semibold text-[10px] uppercase tracking-[0.18em] leading-none flex-shrink-0 rounded-[var(--bjhunt-radius-xs)] border"
      style={{
        color: style.color,
        borderColor: style.border,
      }}
    >
      {style.label}
    </span>
  );
}
