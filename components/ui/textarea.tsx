/**
 * Textarea — refonte 2026 §7.
 * Same border + focus + error rules as Input. Min height 44 mobile / 40 desktop
 * applied to the first row; `rows` prop or className can grow further.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error = false, ...props }, ref) => {
    return (
      <textarea
        aria-invalid={error || undefined}
        className={cn(
          "flex min-h-[44px] md:min-h-[40px] w-full px-3 py-2",
          "rounded-[var(--bjhunt-radius)]",
          "bg-[var(--bjhunt-bg-surface)]",
          "border border-[var(--bjhunt-border)]",
          "text-[14px] text-[var(--bjhunt-text)] placeholder:text-[var(--bjhunt-text-muted)]",
          "resize-none transition-colors",
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
Textarea.displayName = "Textarea";

export { Textarea };
