// components/ui/badge.tsx
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em]",
  {
    variants: {
      variant: {
        default:   "border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-muted)]",
        success:   "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
        danger:    "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
        warning:   "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        // Compat sévérités existantes
        critical:  "border-[var(--danger)]/30 bg-[var(--danger)]/10 text-[var(--danger)]",
        high:      "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        medium:    "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)]",
        low:       "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
        info:      "border-[var(--border-strong)] bg-[var(--bg-card)] text-[var(--text-muted)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
