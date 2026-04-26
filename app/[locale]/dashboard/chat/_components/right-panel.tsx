/**
 * RightPanel — refonte 2026 / B5.
 *
 * Inspector column. On <xl: slide-over from right with backdrop scrim.
 * On xl+: persistent right rail (width 360). Tab strip on top is mono
 * 11 UPPERCASE. Hosts OPPLAN, KG, Settings, or Prompts depending on
 * which icon was clicked in the topbar.
 */
"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OpplanPanel,
  type Objective,
} from "@/components/chat/opplan-panel";
import {
  KnowledgeGraphPanel,
  type GraphNode,
  type GraphEdge,
  type GraphStats,
} from "@/components/chat/knowledge-graph-panel";
import {
  ModelSettingsPanel,
  type ModelSettings,
} from "@/components/chat/model-settings-panel";
import { PromptLibraryPanel } from "@/components/chat/prompt-library-panel";
import { VaccineMonitor } from "@/components/dashboard/vaccine-monitor";
import type { Engagement, RightPanelTab } from "./types";

interface Props {
  tab: RightPanelTab;
  onClose: () => void;

  // OPPLAN
  objectives: Objective[];
  activeEngagement: Engagement | null;

  // Knowledge graph
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  graphStats: GraphStats;

  // Model settings
  modelSettings: ModelSettings;
  onModelSettingsChange: (s: ModelSettings) => void;

  // Prompt library
  onSelectPrompt: (content: string) => void;
}

const TAB_LABEL: Record<NonNullable<RightPanelTab>, string> = {
  opplan: "OPPLAN",
  graph: "Graph",
  settings: "Settings",
  prompts: "Prompts",
};

export function RightPanel({
  tab,
  onClose,
  objectives,
  activeEngagement,
  graphNodes,
  graphEdges,
  graphStats,
  modelSettings,
  onModelSettingsChange,
  onSelectPrompt,
}: Props) {
  // Escape closes the panel
  useEffect(() => {
    if (!tab) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [tab, onClose]);

  if (!tab) return null;

  return (
    <>
      {/* Backdrop on <xl */}
      <div
        className="fixed inset-0 bg-[var(--bjhunt-bg-overlay)] z-40 xl:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[360px] flex flex-col min-h-0",
          "xl:relative xl:inset-auto xl:z-auto",
          "bg-[var(--bjhunt-bg)] border-l border-[var(--bjhunt-border)]",
        )}
      >
        {/* Tab strip — mono 11 uppercase */}
        <div className="flex items-center justify-between border-b border-[var(--bjhunt-border)]">
          <div className="flex items-center gap-1 px-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text)] py-3">
              {TAB_LABEL[tab]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="inline-flex h-9 w-9 mr-1 items-center justify-center rounded-[var(--bjhunt-radius)] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {tab === "opplan" && (
            <div className="flex flex-col">
              <OpplanPanel objectives={objectives} />
              {activeEngagement &&
                (activeEngagement.status === "running" || objectives.length > 0) && (
                  <VaccineMonitor engagementId={activeEngagement.id} compact />
                )}
            </div>
          )}

          {tab === "graph" && (
            <KnowledgeGraphPanel
              nodes={graphNodes}
              edges={graphEdges}
              stats={graphStats}
            />
          )}

          {tab === "settings" && (
            <ModelSettingsPanel
              settings={modelSettings}
              onChange={onModelSettingsChange}
              onClose={onClose}
            />
          )}

          {tab === "prompts" && (
            <PromptLibraryPanel
              onSelect={(content) => {
                onSelectPrompt(content);
                onClose();
              }}
              onClose={onClose}
            />
          )}
        </div>
      </aside>
    </>
  );
}
