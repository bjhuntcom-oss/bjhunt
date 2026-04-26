// components/ui/section-label.tsx
import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-4 h-px bg-[var(--bjhunt-border-strong)]" />
      <span className="font-mono text-[12px] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.18em] font-semibold">
        {children}
      </span>
    </div>
  );
}
