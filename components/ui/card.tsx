/**
 * Card — refonte 2026 §7.
 *
 * Variants:
 *   - default      — 1px hairline border, no hover
 *   - interactive  — hovers to border-strong (use for clickable cards)
 *   - selected     — 2px state-color border (requires `state` prop)
 *
 * Padding: compact (16) / regular (24) / loose (32) per spec §5.
 *
 * NO shadows on default state — border-weight is the depth system.
 */
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type CardVariant = "default" | "interactive" | "selected";
export type CardPadding = "compact" | "regular" | "loose";
export type CardState = "success" | "warning" | "critical";

const PADDING: Record<CardPadding, string> = {
  compact: "p-4",
  regular: "p-6",
  loose:   "p-8",
};

const STATE_BORDER: Record<CardState, string> = {
  success:  "border-2 border-[var(--state-success)]",
  warning:  "border-2 border-[var(--state-warning)]",
  critical: "border-2 border-[var(--state-critical)]",
};

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  state?: CardState;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "regular",
      state = "success",
      ...props
    },
    ref
  ) => {
    const base = cn(
      "rounded-[var(--bjhunt-radius-md)]",
      "bg-[var(--bjhunt-bg-surface)] text-[var(--bjhunt-text)]",
      "transition-colors",
      PADDING[padding]
    );

    let variantClass = "";
    if (variant === "selected") {
      variantClass = STATE_BORDER[state];
    } else if (variant === "interactive") {
      variantClass = cn(
        "border border-[var(--bjhunt-border)]",
        "hover:border-[var(--bjhunt-border-strong)]"
      );
    } else {
      variantClass = "border border-[var(--bjhunt-border)]";
    }

    return (
      <div ref={ref} className={cn(base, variantClass, className)} {...props} />
    );
  }
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5 mb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-sans font-semibold text-[20px] leading-[1.4] tracking-[-0.01em]",
        "text-[var(--bjhunt-text)]",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-[13px] leading-[1.4] text-[var(--bjhunt-text-secondary)]", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center mt-4 pt-4 border-t border-[var(--bjhunt-border)]",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
