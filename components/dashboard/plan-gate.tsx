"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

const PLAN_LABELS: Record<string, string> = {
  pro: "PRO",
  enterprise: "ENTERPRISE",
};

const PLAN_COLORS: Record<string, string> = {
  pro: "#4a9eff",
  enterprise: "#FFD700",
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
  const planColor = PLAN_COLORS[requiredPlan] || "#4a9eff";

  return (
    <div className="relative min-h-[400px]">
      {/* Blurred content behind */}
      <div className="opacity-20 pointer-events-none select-none" aria-hidden="true">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 max-w-[360px] text-center px-6 py-8 border border-[var(--border)] bg-[var(--bg)]">
          <div
            className="w-10 h-10 flex items-center justify-center border"
            style={{ borderColor: planColor }}
          >
            <Lock className="w-4 h-4" style={{ color: planColor }} />
          </div>

          <div>
            <p className="text-[11px] font-mono text-white mb-1">
              {featureName}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-muted)] leading-relaxed">
              Cette fonctionnalit&eacute; n&eacute;cessite le plan{" "}
              <span style={{ color: planColor }} className="font-bold">
                {planLabel}
              </span>
            </p>
          </div>

          <Link
            href="/pricing"
            className="flex items-center gap-2 px-5 py-2 text-[9px] font-mono font-bold uppercase tracking-[0.15em] bg-white text-black hover:bg-white/90 transition-colors"
          >
            Upgrade
          </Link>

          <p className="text-[8px] font-mono text-[var(--text-subtle)]">
            Plan actuel : {currentPlan.toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  );
}
