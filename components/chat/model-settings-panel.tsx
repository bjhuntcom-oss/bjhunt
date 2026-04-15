"use client";

import { X } from "lucide-react";

export interface ModelSettings {
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  streamResponse: boolean;
  webSearch: boolean;
}

interface ModelSettingsPanelProps {
  settings: ModelSettings;
  onChange: (settings: ModelSettings) => void;
  onClose: () => void;
}

function Slider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)]">{label}</label>
        <span className="text-[10px] font-mono text-white">{display ? display(value) : value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-0.5 bg-[var(--border)] appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white cursor-pointer"
      />
    </div>
  );
}

export function ModelSettingsPanel({ settings, onChange, onClose }: ModelSettingsPanelProps) {
  const set = <K extends keyof ModelSettings>(k: K, v: ModelSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <div className="w-72 border-l border-[var(--border)] bg-[var(--bg-input)] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Paramètres</span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
        {/* System Prompt */}
        <div>
          <label className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-muted)] block mb-2">
            System Prompt
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => set("systemPrompt", e.target.value)}
            rows={4}
            placeholder="Tu es un expert en cybersécurité..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] px-3 py-2 text-[11px] text-white placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Sliders */}
        <Slider
          label="Température"
          value={settings.temperature}
          min={0} max={2} step={0.05}
          onChange={(v) => set("temperature", v)}
          display={(v) => v.toFixed(2)}
        />
        <Slider
          label="Max Tokens"
          value={settings.maxTokens}
          min={256} max={8192} step={256}
          onChange={(v) => set("maxTokens", v)}
          display={(v) => v.toLocaleString()}
        />
        <Slider
          label="Top P"
          value={settings.topP}
          min={0} max={1} step={0.05}
          onChange={(v) => set("topP", v)}
          display={(v) => v.toFixed(2)}
        />

        {/* Toggles */}
        <div className="flex flex-col gap-3">
          {([
            { key: "streamResponse", label: "Stream la réponse" },
            { key: "webSearch", label: "Recherche web auto" },
          ] as const).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
              <button
                onClick={() => set(key, !settings[key])}
                className={`w-8 h-4 relative transition-colors ${settings[key] ? "bg-[var(--success)]" : "bg-[var(--border-strong)]"}`}
              >
                <span
                  className={`absolute top-0.5 w-3 h-3 bg-white transition-all ${settings[key] ? "left-[18px]" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
