"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { ChevronDown, Cpu, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
}

interface ModelSelectorProps {
  models: AIModel[];
  selected: string;
  onChange: (modelId: string) => void;
}

export function ModelSelector({ models, selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const current = models.find((m) => m.id === selected);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setSearch("");
    }
  }, [open]);

  // Filter and group models by provider
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.provider.toLowerCase().includes(q)
        )
      : models;

    const map = new Map<string, AIModel[]>();
    for (const m of filtered) {
      const group = map.get(m.provider) ?? [];
      group.push(m);
      map.set(m.provider, group);
    }
    return map;
  }, [models, search]);

  function selectModel(id: string) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 h-8 px-3 border border-[var(--border)] bg-[var(--bg-card)] text-[10px] text-white hover:border-[var(--border-strong)] transition-colors rounded-lg"
      >
        <Cpu className="w-3 h-3 text-[var(--text-muted)]" />
        <span>{current?.name ?? "Sélectionner un modèle"}</span>
        <ChevronDown className={cn("w-3 h-3 text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--bg-card)] border border-[var(--border)] z-50 shadow-xl rounded-xl overflow-hidden">
            {/* Search input */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-input)]">
              <Search className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un modèle..."
                className="flex-1 bg-transparent text-[11px] text-white placeholder:text-[var(--text-muted)] outline-none"
                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
              />
            </div>

            {/* Provider groups */}
            <div className="max-h-72 overflow-y-auto">
              {grouped.size === 0 ? (
                <div className="px-4 py-6 text-center text-[10px] text-[var(--text-muted)]">
                  Aucun modèle trouvé
                </div>
              ) : (
                Array.from(grouped.entries()).map(([provider, providerModels]) => (
                  <div key={provider}>
                    {/* Provider label */}
                    <div className="px-3 pt-2.5 pb-1">
                      <span className="text-[8px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        {provider}
                      </span>
                    </div>

                    {providerModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => selectModel(model.id)}
                        className={cn(
                          "w-full text-left px-4 py-2 flex items-center gap-2 hover:bg-[var(--bg-input)] transition-colors",
                          model.id === selected && "bg-[var(--bg-input)] border-l-2 border-white"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] text-white truncate">{model.name}</div>
                          {model.contextLength && (
                            <div className="text-[9px] text-[var(--text-muted)] mt-0.5">
                              {(model.contextLength / 1000).toFixed(0)}k ctx
                            </div>
                          )}
                        </div>
                        {model.contextLength && (
                          <span className="text-[8px] font-mono text-[var(--text-subtle)] bg-[var(--bg)] border border-[var(--border)] px-1.5 py-0.5 rounded flex-shrink-0">
                            {model.contextLength >= 1000
                              ? `${(model.contextLength / 1000).toFixed(0)}k`
                              : model.contextLength}
                          </span>
                        )}
                        {model.id === selected && (
                          <span className="text-[var(--success)] text-[10px] flex-shrink-0">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
