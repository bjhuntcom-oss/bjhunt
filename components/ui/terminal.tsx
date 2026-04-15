// components/ui/terminal.tsx
"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface TerminalLine {
  type: "prompt" | "output" | "success" | "error" | "warning" | "comment";
  content: string;
  delay?: number; // ms avant d'afficher cette ligne
}

interface TerminalProps {
  lines: TerminalLine[];
  className?: string;
  autoPlay?: boolean;
  showCursor?: boolean;
}

const lineColors: Record<TerminalLine["type"], string> = {
  prompt:  "text-white",
  output:  "text-[var(--text-muted)]",
  success: "text-[var(--success)]",
  error:   "text-[var(--danger)]",
  warning: "text-[var(--warning)]",
  comment: "text-[var(--text-subtle)]",
};

export function Terminal({ lines, className, autoPlay = true, showCursor = true }: TerminalProps) {
  const [visibleCount, setVisibleCount] = useState(autoPlay ? 0 : lines.length);

  useEffect(() => {
    if (!autoPlay) return;
    let total = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    lines.forEach((line, i) => {
      total += line.delay ?? 400;
      const t = setTimeout(() => setVisibleCount(i + 1), total);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
  }, [autoPlay, lines]);

  return (
    <div
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border)] p-4 font-mono text-[11px] leading-relaxed",
        className
      )}
    >
      {/* Barre dots */}
      <div className="flex items-center gap-1.5 mb-4">
        <div className="w-2.5 h-2.5 bg-[var(--border-strong)]" />
        <div className="w-2.5 h-2.5 bg-[var(--border-strong)]" />
        <div className="w-2.5 h-2.5 bg-[var(--border-strong)]" />
        <span className="ml-2 text-[9px] text-[var(--text-subtle)] tracking-widest uppercase">
          bjhunt terminal
        </span>
      </div>

      {/* Lignes */}
      <div className="space-y-1">
        {lines.slice(0, visibleCount).map((line, i) => (
          <div key={i} className={cn("flex gap-2", lineColors[line.type])}>
            {line.type === "prompt" && (
              <span className="text-[var(--text-muted)] select-none">$</span>
            )}
            {line.type === "success" && (
              <span className="select-none">✓</span>
            )}
            {line.type === "error" && (
              <span className="select-none">✗</span>
            )}
            {line.type === "warning" && (
              <span className="select-none">!</span>
            )}
            <span>{line.content}</span>
          </div>
        ))}

        {/* Curseur clignotant */}
        {showCursor && visibleCount >= lines.length && (
          <div className="flex gap-2 text-[var(--text-muted)]">
            <span>$</span>
            <span className="terminal-cursor" />
          </div>
        )}
      </div>
    </div>
  );
}
