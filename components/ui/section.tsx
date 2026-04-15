import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  noBorder?: boolean;
}

export function Section({ children, className, noBorder }: SectionProps) {
  return (
    <section
      className={cn(
        "py-24 lg:py-32",
        !noBorder && "border-t border-white/10",
        className
      )}
    >
      {children}
    </section>
  );
}
