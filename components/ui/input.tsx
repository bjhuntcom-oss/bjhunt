/**
 * Input — refonte 2026 §7.
 * Min height 40 desktop / 44 mobile. Focus border state-success. Error state-critical.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error = false, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={error || undefined}
        className={cn(
          "flex h-11 md:h-10 w-full px-3 py-2",
          "rounded-[var(--bjhunt-radius)]",
          "bg-[var(--bjhunt-bg-surface)]",
          "border border-[var(--bjhunt-border)]",
          "text-[14px] text-[var(--bjhunt-text)] placeholder:text-[var(--bjhunt-text-muted)]",
          "transition-colors",
          "file:border-0 file:bg-transparent file:text-[14px] file:font-medium",
          "focus-visible:outline-none focus-visible:border-[var(--state-success)] focus-visible:ring-2 focus-visible:ring-[var(--state-success-tint)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-[var(--state-critical)] focus-visible:border-[var(--state-critical)] focus-visible:ring-[var(--state-critical-tint)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
