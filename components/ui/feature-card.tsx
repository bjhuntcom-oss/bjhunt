// components/ui/feature-card.tsx
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface FeatureCardProps {
  title: string;
  description: string;
  illustration?: ReactNode;
  tag?: string;
  className?: string;
}

export function FeatureCard({ title, description, illustration, tag, className }: FeatureCardProps) {
  return (
    <div className={cn("bg-[var(--bg-card)] border border-[var(--border)] flex flex-col", className)}>
      {/* Zone illustration */}
      {illustration && (
        <div className="relative border-b border-[var(--border)] overflow-hidden bg-[var(--bg)] flex items-center justify-center"
          style={{ minHeight: 200 }}>
          <div className="bg-grid absolute inset-0" />
          <div className="relative z-10">
            {illustration}
          </div>
        </div>
      )}
      {/* Contenu */}
      <div className="p-6 flex flex-col gap-2">
        {tag && (
          <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em]">
            {tag}
          </span>
        )}
        <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
