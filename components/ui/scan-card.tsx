// components/ui/scan-card.tsx
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type ScanStatus = "scanning" | "complete" | "queued" | "error";

interface ScanCardProps {
  target: string;
  status: ScanStatus;
  progress?: number; // 0-100
  result?: string;
  duration?: string;
  className?: string;
}

const statusConfig: Record<ScanStatus, { label: string; variant: "success" | "warning" | "default" | "danger"; dotColor: string }> = {
  scanning: { label: "En cours",   variant: "warning", dotColor: "bg-[var(--warning)]" },
  complete: { label: "Terminé",    variant: "success", dotColor: "bg-[var(--success)]" },
  queued:   { label: "En attente", variant: "default", dotColor: "bg-[var(--text-subtle)]" },
  error:    { label: "Erreur",     variant: "danger",  dotColor: "bg-[var(--danger)]" },
};

export function ScanCard({ target, status, progress = 0, result, duration, className }: ScanCardProps) {
  const config = statusConfig[status];

  return (
    <div className={cn("bg-[var(--bg-card)] border border-[var(--border)] p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-1.5 h-1.5", config.dotColor, status === "scanning" && "animate-[pulse-dot_2s_ease-in-out_infinite]")} />
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest font-mono">
            {target}
          </span>
        </div>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--border)] w-full mb-3 overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
        <span>{result ?? `${progress}%`}</span>
        {duration && <span className="font-mono">{duration}</span>}
      </div>
    </div>
  );
}
