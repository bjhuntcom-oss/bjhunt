/**
 * Button — refonte 2026 §7.
 *
 * Variants:
 *   - ghost  (default) — transparent bg, hairline border, hover lifts border
 *   - state  — colored text + 1px state border, hover fills with state tint
 *   - bare   — no border, just text (for inline actions)
 *
 * Sizes (responsive — desktop / mobile heights per spec §5):
 *   - sm — 32 desktop / 36 mobile
 *   - md — 36 desktop / 40 mobile
 *   - lg — 40 desktop / 44 mobile
 *
 * The `state` prop applies to both `state` variant (colors) and `ghost`
 * (focus ring color). All styling via Tailwind classes — never inline style.
 */
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { forwardRef } from "react";

export type ButtonVariant = "ghost" | "state" | "bare";
export type ButtonSize = "sm" | "md" | "lg";
export type ButtonState = "success" | "warning" | "critical";

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: "h-9 md:h-8 px-3 text-[12px]",
  md: "h-10 md:h-9 px-4 text-[13px]",
  lg: "h-11 md:h-10 px-5 text-[14px]",
};

const STATE_CLASS: Record<ButtonState, string> = {
  success:
    "text-[var(--state-success)] border-[var(--state-success)] hover:bg-[var(--state-success-tint)]",
  warning:
    "text-[var(--state-warning)] border-[var(--state-warning)] hover:bg-[var(--state-warning-tint)]",
  critical:
    "text-[var(--state-critical)] border-[var(--state-critical)] hover:bg-[var(--state-critical-tint)]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  state?: ButtonState;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "ghost",
      size = "md",
      state = "success",
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    const base = cn(
      "inline-flex items-center justify-center gap-2 font-medium font-sans",
      "rounded-[var(--bjhunt-radius)] transition-colors",
      "focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-[var(--state-success)] focus-visible:outline-offset-2",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
      SIZE_CLASS[size]
    );

    let variantClass = "";
    if (variant === "ghost") {
      variantClass = cn(
        "bg-transparent text-[var(--bjhunt-text)] border border-[var(--bjhunt-border)]",
        "hover:bg-white/[0.04] hover:border-[var(--bjhunt-border-strong)]"
      );
    } else if (variant === "state") {
      variantClass = cn(
        "bg-[var(--bjhunt-bg-surface)] border",
        STATE_CLASS[state]
      );
    } else {
      // bare
      variantClass = cn(
        "bg-transparent text-[var(--bjhunt-text)] border border-transparent",
        "hover:text-[var(--bjhunt-text-inverted)]"
      );
    }

    return (
      <Comp
        className={cn(base, variantClass, className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
