"use client";

import { useState } from "react";
import { X, Download, Copy, Eye, Code2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Artifact {
  id: string;
  title: string;
  language: string;
  content: string;
  createdAt: string;
}

interface ArtifactPanelProps {
  artifacts: Artifact[];
  onClose: () => void;
}

export function ArtifactPanel({ artifacts, onClose }: ArtifactPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(artifacts[0]?.id ?? "");
  const [view, setView] = useState<"code" | "preview">("code");
  const [copied, setCopied] = useState(false);

  const selected = artifacts.find((a) => a.id === selectedId);

  async function handleCopy() {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!selected) return;
    const ext: Record<string, string> = {
      javascript: "js", typescript: "ts", python: "py",
      bash: "sh", html: "html", json: "json", markdown: "md",
    };
    const blob = new Blob([selected.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${ext[selected.language] ?? "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="w-80 flex flex-col border-l border-[var(--border)] bg-[var(--bg-input)] h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Artifacts ({artifacts.length})
        </span>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Artifact list */}
      {artifacts.length > 1 && (
        <div className="flex flex-col border-b border-[var(--border)] overflow-y-auto max-h-36">
          {artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={cn(
                "text-left px-4 py-2 border-b border-[var(--border)] text-[10px] transition-colors",
                selectedId === a.id
                  ? "text-white bg-[var(--bg-card)] border-l-2 border-l-white"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-card)]/50"
              )}
            >
              <div className="truncate">{a.title}</div>
              <div className="text-[8px] text-[var(--text-muted)] font-mono">{a.language}</div>
            </button>
          ))}
        </div>
      )}

      {/* Toolbar */}
      {selected && (
        <>
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setView("code")}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider transition-colors",
                  view === "code" ? "text-white bg-[var(--bg-card)]" : "text-[var(--text-muted)] hover:text-white"
                )}
              >
                <Code2 className="w-3 h-3" />
                Code
              </button>
              {["html", "svg"].includes(selected.language) && (
                <button
                  onClick={() => setView("preview")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 text-[9px] uppercase tracking-wider transition-colors",
                    view === "preview" ? "text-white bg-[var(--bg-card)]" : "text-[var(--text-muted)] hover:text-white"
                  )}
                >
                  <Eye className="w-3 h-3" />
                  Preview
                </button>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleCopy} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors" title="Copier">
                {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
              </button>
              <button onClick={handleDownload} className="p-1 text-[var(--text-muted)] hover:text-white transition-colors" title="Télécharger">
                <Download className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {view === "code" ? (
              <pre className="p-4 text-[10px] font-mono text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap break-all">
                {selected.content}
              </pre>
            ) : (
              <iframe
                srcDoc={selected.content}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-scripts"
                title="Preview"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
