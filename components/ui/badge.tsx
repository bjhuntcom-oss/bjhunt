/**
 * Badge — small chip aligned to refonte 2026 spec §7 + tri-state palette.
 *
 * Variants:
 *   - default              — neutral (border + bg-surface + muted text)
 *   - success/warning/critical — colored text + matching state tint
 *   - critical/high        — alias to `critical` (legacy)
 *   - medium               — alias to `warning`
 *   - low/info             — alias to `success` / `default`
 */
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";

const badgeVariants = cva(
  cn(
    "inline-flex items-center px-2 py-0.5 border",
    "text-[10px] font-semibold uppercase tracking-[0.18em] font-mono",
    "rounded-none"
  ),
  {
    variants: {
      variant: {
        default:
          "border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] text-[var(--bjhunt-text-muted)]",
        success:
          "border-[var(--state-success)] bg-[var(--state-success-tint)] text-[var(--state-success)]",
        warning:
          "border-[var(--state-warning)] bg-[var(--state-warning-tint)] text-[var(--state-warning)]",
        critical:
          "border-[var(--state-critical)] bg-[var(--state-critical-tint)] text-[var(--state-critical)]",
        // Legacy severity aliases
        high:
          "border-[var(--state-critical)] bg-[var(--state-critical-tint)] text-[var(--state-critical)]",
        medium:
          "border-[var(--state-warning)] bg-[var(--state-warning-tint)] text-[var(--state-warning)]",
        low:
          "border-[var(--state-success)] bg-[var(--state-success-tint)] text-[var(--state-success)]",
        info:
          "border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] text-[var(--bjhunt-text-muted)]",
        // Legacy "danger" alias
        danger:
          "border-[var(--state-critical)] bg-[var(--state-critical-tint)] text-[var(--state-critical)]",
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
