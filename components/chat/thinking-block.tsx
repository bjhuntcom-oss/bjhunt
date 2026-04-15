"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Brain, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  content: string;
  isActive?: boolean;
  duration?: number;
}

export function ThinkingBlock({ content, isActive = false, duration }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 border border-[var(--border)]/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-card)] transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-[var(--text-subtle)] shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-[var(--text-subtle)] shrink-0" />
        )}

        {isActive ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-muted)] shrink-0" />
        ) : (
          <Brain className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
        )}

        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--text-muted)]">
          {isActive ? "Thinking..." : "Reasoning"}
        </span>

        {duration !== undefined && (
          <span className="ml-auto text-[9px] text-[var(--text-subtle)]">
            {(duration / 1000).toFixed(1)}s
          </span>
        )}
      </button>

      {expanded && content && (
        <div className="border-t border-[var(--border)]/30 px-3 py-2 max-h-[300px] overflow-y-auto">
          <p className="text-[11px] text-[var(--text-subtle)] leading-relaxed whitespace-pre-wrap font-mono">
            {content}
          </p>
        </div>
      )}
    </div>
  );
}
