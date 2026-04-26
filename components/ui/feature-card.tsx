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
    <div
      className={cn(
        "bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] flex flex-col",
        "rounded-[var(--bjhunt-radius-md)] overflow-hidden",
        className
      )}
    >
      {illustration && (
        <div
          className="relative border-b border-[var(--bjhunt-border)] overflow-hidden bg-[var(--bjhunt-bg)] flex items-center justify-center"
          style={{ minHeight: 200 }}
        >
          <div className="relative z-10">{illustration}</div>
        </div>
      )}
      <div className="p-6 flex flex-col gap-2">
        {tag && (
          <span className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.18em] font-semibold">
            {tag}
          </span>
        )}
        <h3 className="text-[20px] leading-[1.4] tracking-[-0.01em] font-semibold text-[var(--bjhunt-text)]">
          {title}
        </h3>
        <p className="text-[13px] text-[var(--bjhunt-text-secondary)] leading-[1.5]">
          {description}
        </p>
      </div>
    </div>
  );
}
