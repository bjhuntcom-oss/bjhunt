// components/ui/section-label.tsx
import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="w-4 h-px bg-[var(--border-strong)]" />
      <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.25em] font-medium">
        {children}
      </span>
    </div>
  );
}
