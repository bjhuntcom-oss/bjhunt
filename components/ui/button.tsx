// components/ui/button.tsx
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import { forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-40 tracking-wider uppercase text-[10px]",
  {
    variants: {
      variant: {
        primary:
          "bg-white text-black border border-white hover:bg-white/90 active:bg-white/80",
        secondary:
          "bg-transparent text-white border border-[var(--border-strong)] hover:border-white/30 hover:bg-white/[0.04]",
        ghost:
          "border border-transparent text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-white",
        danger:
          "bg-[var(--danger)] text-white border border-[var(--danger)] hover:bg-[var(--danger)]/90",
        success:
          "bg-transparent text-[var(--success)] border border-[var(--success)]/40 hover:bg-[var(--success)]/10",
      },
      size: {
        sm:   "h-7 px-3 text-[9px]",
        md:   "h-9 px-4 text-[10px]",
        lg:   "h-11 px-6 text-[11px]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
