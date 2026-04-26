/**
 * Label — refonte 2026 form primitive.
 * Caption-sized (13px / 1.4 / 400 sans). Sits above Input/Textarea.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "inline-block font-sans text-[13px] leading-[1.4] font-medium",
        "text-[var(--bjhunt-text)]",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";

export { Label };
