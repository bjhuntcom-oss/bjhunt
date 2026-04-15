// components/chat/chat-topbar.tsx
"use client"

import Link from "next/link"
import { X, Settings2, BookOpen } from "lucide-react"
import { ModelSelector, type AIModel } from "./model-selector"

interface ChatTopbarProps {
  locale: string
  title: string
  models: AIModel[]
  selectedModel: string
  onModelChange: (id: string) => void
  tokenCount: number
  contextLength: number
  onToggleSettings: () => void
  onTogglePromptLibrary: () => void
  onExport?: () => void
}

function tokenColor(count: number, max: number): string {
  const pct = count / max
  if (pct > 0.8) return "var(--danger)"
  if (pct > 0.5) return "var(--warning)"
  return "var(--success)"
}

function formatTokens(n: number): string {
  if (n >= 1000) return `~${(n / 1000).toFixed(1)}k`
  return `~${n}`
}

export function ChatTopbar({
  locale,
  title,
  models,
  selectedModel,
  onModelChange,
  tokenCount,
  contextLength,
  onToggleSettings,
  onTogglePromptLibrary,
  onExport,
}: ChatTopbarProps) {
  const color = tokenColor(tokenCount, contextLength)

  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 h-12 flex-shrink-0 gap-3 bg-[var(--bg-input)]">
      {/* Left: title */}
      <div className="flex-1 min-w-0">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)] leading-none">Session active</p>
        <h2 className="text-[12px] font-medium tracking-tight text-white truncate mt-0.5">{title}</h2>
      </div>

      {/* Center: model selector */}
      <div className="flex-shrink-0">
        <ModelSelector models={models} selected={selectedModel} onChange={onModelChange} />
      </div>

      {/* Right: token counter + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className="text-[9px] font-mono tabular-nums"
          style={{ color }}
          title={`${tokenCount} tokens estimés sur ${contextLength}`}
        >
          {formatTokens(tokenCount)} tokens
        </span>

        {onExport && (
          <button
            onClick={onExport}
            title="Exporter (Markdown)"
            className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors rounded-lg"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        )}

        <button
          onClick={onTogglePromptLibrary}
          className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
          title="Bibliothèque de prompts (Ctrl+/)"
        >
          <BookOpen className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleSettings}
          className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
          title="Paramètres du modèle (Ctrl+M)"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>

        <Link
          href={`/${locale}/dashboard`}
          className="p-1.5 text-[var(--text-muted)] hover:text-white transition-colors"
          title="Retour au dashboard"
        >
          <X className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
