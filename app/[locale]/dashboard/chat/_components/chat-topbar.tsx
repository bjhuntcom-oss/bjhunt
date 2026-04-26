/**
 * ChatTopbar — refonte 2026 / B5.
 *
 * Hairline bottom border, height 56. Eyebrow mono "Agent / NAME" left,
 * 3 ghost icon buttons on the right (KG, OPPLAN, Settings), single
 * hamburger to toggle sidebar on <lg.
 */
"use client";

import { Menu, Network, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/ui/status-dot";
import { AGENTS } from "@/components/chat/agent-selector";
import { AdminModelSelector } from "../admin-model-selector";
import type { RightPanelTab } from "./types";

interface Props {
  selectedAgent: string;
  isStreaming: boolean;
  activeAgent: string | null;
  tokenCount: number;
  streamSpeed: number;
  rightPanel: RightPanelTab;
  onToggleSidebar: () => void;
  onTogglePanel: (tab: NonNullable<RightPanelTab>) => void;
}

export function ChatTopbar({
  selectedAgent,
  isStreaming,
  activeAgent,
  tokenCount,
  streamSpeed,
  rightPanel,
  onToggleSidebar,
  onTogglePanel,
}: Props) {
  const agentDef = AGENTS.find((a) => a.id === selectedAgent);
  const agentName = agentDef?.name || "BJHUNT";

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 px-4 md:px-6",
        "h-14 shrink-0 border-b border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg)]",
      )}
    >
      {/* Left: hamburger + eyebrow */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle conversation sidebar"
          className={cn(
            "lg:hidden inline-flex h-9 w-9 items-center justify-center",
            "rounded-[var(--bjhunt-radius)] text-[var(--bjhunt-text-muted)]",
            "hover:text-[var(--bjhunt-text)] hover:bg-white/[0.04]",
          )}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-baseline gap-2 min-w-0" title={agentDef?.description}>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
            Agent
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-disabled)]">
            /
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text)] truncate">
            {agentName}
          </span>
        </div>
        {/* Admin-only model override (no-op for non-admins) */}
        <div className="hidden md:block">
          <AdminModelSelector />
        </div>
      </div>

      {/* Right: live indicator + panel toggles + AI badge */}
      <div className="flex items-center gap-2 md:gap-3">
        {tokenCount > 0 && (
          <span className="hidden sm:inline font-mono text-[11px] tabular-nums text-[var(--bjhunt-text-muted)]">
            ~{tokenCount} tok
          </span>
        )}

        {isStreaming ? (
          <StatusDot
            state="success"
            pulse
            label={
              streamSpeed > 0
                ? `RUNNING · ${streamSpeed} tok/s${activeAgent ? ` · ${activeAgent}` : ""}`
                : "RUNNING"
            }
          />
        ) : (
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
            Ready
          </span>
        )}

        <div className="flex items-center gap-1">
          <PanelToggleIcon
            label="Knowledge graph"
            icon={<Network className="w-4 h-4" />}
            active={rightPanel === "graph"}
            onClick={() => onTogglePanel("graph")}
          />
          <PanelToggleIcon
            label="OPPLAN"
            icon={<MapIcon className="w-4 h-4" />}
            active={rightPanel === "opplan"}
            onClick={() => onTogglePanel("opplan")}
          />
          <PanelToggleIcon
            label="Model settings"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            active={rightPanel === "settings"}
            onClick={() => onTogglePanel("settings")}
          />
        </div>

        <span
          role="note"
          aria-label="Outputs in this chat are AI-generated. See /legal/ai-policy for the acceptable use policy."
          title="AI-generated content — outputs may be inaccurate. See /legal/ai-policy for the acceptable use policy."
          className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-sm)] font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]"
        >
          <span aria-hidden>◇</span>
          AI-generated
        </span>
      </div>
    </header>
  );
}

interface PanelToggleProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

function PanelToggleIcon({ label, icon, active, onClick }: PanelToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      data-active={active || undefined}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center",
        "rounded-[var(--bjhunt-radius)] text-[var(--bjhunt-text-muted)]",
        "hover:text-[var(--bjhunt-text)] hover:bg-white/[0.04]",
        "data-[active]:text-[var(--bjhunt-text)] data-[active]:bg-white/[0.04]",
      )}
    >
      {icon}
    </button>
  );
}
