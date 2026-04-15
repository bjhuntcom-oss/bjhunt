// components/ui/textarea.tsx
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2",
          "text-sm text-white placeholder:text-[var(--text-muted)] resize-none",
          "transition-colors focus-visible:outline-none focus-visible:border-white/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
