"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Body, Eyebrow } from "@/components/ui/typography";

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

const PLAN_LABELS: Record<string, string> = {
  pro: "PRO",
  enterprise: "ENTERPRISE",
};

// Refonte 2026 retired the indigo brand and gold accents. Plans now signal via
// the design-system text colour for PRO and the warning state token for the
// premium ENTERPRISE tier. No brand chroma — token only.
const PLAN_COLORS: Record<string, string> = {
  pro: "var(--bjhunt-text)",
  enterprise: "var(--state-warning)",
};

interface PlanGateProps {
  requiredPlan: "pro" | "enterprise";
  currentPlan: string;
  children: React.ReactNode;
  featureName: string;
}

export function PlanGate({ requiredPlan, currentPlan, children, featureName }: PlanGateProps) {
  const currentLevel = PLAN_HIERARCHY[currentPlan] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[requiredPlan] ?? 1;
  const isLocked = currentLevel < requiredLevel;

  if (!isLocked) {
    return <>{children}</>;
  }

  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan.toUpperCase();
  const planColor = PLAN_COLORS[requiredPlan] || "var(--bjhunt-text)";

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred content behind */}
      <div className="opacity-20 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-[360px] text-center px-6 py-8 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius-md)]">
          <div
            className="w-10 h-10 flex items-center justify-center border rounded-[var(--bjhunt-radius)]"
            style={{ borderColor: planColor }}
          >
            <Lock className="w-4 h-4" style={{ color: planColor }} />
          </div>

          <div>
            <Body className="text-[var(--bjhunt-text)] font-medium mb-1">
              {featureName}
            </Body>
            <Body className="text-[var(--bjhunt-text-muted)] leading-relaxed">
              Cette fonctionnalit&eacute; n&eacute;cessite le plan{" "}
              <span style={{ color: planColor }} className="font-semibold">
                {planLabel}
              </span>
            </Body>
          </div>

          <Link
            href="/pricing"
            className="flex items-center gap-2 px-5 h-9 font-mono font-semibold text-[12px] uppercase tracking-[0.18em] bg-[var(--bjhunt-bg-surface)] border border-[var(--state-success)] text-[var(--state-success)] rounded-[var(--bjhunt-radius)] hover:bg-[var(--state-success-tint)] transition-colors"
          >
            Upgrade
          </Link>

          <Eyebrow>Plan actuel : {currentPlan.toUpperCase()}</Eyebrow>
        </div>
      </div>
    </div>
  );
}
