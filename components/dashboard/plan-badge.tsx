"use client";

interface PlanBadgeProps {
  requiredPlan: "pro" | "enterprise";
}

const PLAN_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  pro: {
    color: "#4a9eff",
    bg: "rgba(74,158,255,0.08)",
    border: "rgba(74,158,255,0.3)",
    label: "PRO",
  },
  enterprise: {
    color: "#FFD700",
    bg: "rgba(255,215,0,0.08)",
    border: "rgba(255,215,0,0.3)",
    label: "ENTERPRISE",
  },
};

export function PlanBadge({ requiredPlan }: PlanBadgeProps) {
  const style = PLAN_STYLES[requiredPlan] || PLAN_STYLES.pro;

  return (
    <span
      className="inline-flex items-center px-1 py-0.5 text-[7px] font-mono font-bold uppercase tracking-[0.12em] leading-none flex-shrink-0"
      style={{
        color: style.color,
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
      }}
    >
      {style.label}
    </span>
  );
}
