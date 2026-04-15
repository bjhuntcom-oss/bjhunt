"use client";

import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Edit3, Check } from "lucide-react";
import { useState } from "react";

interface MessageActionsProps {
  role: "user" | "assistant";
  content: string;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onFeedback?: (type: "up" | "down") => void;
}

export function MessageActions({ role, content, onRegenerate, onEdit, onFeedback }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleFeedback(type: "up" | "down") {
    setFeedback(type);
    onFeedback?.(type);
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handleCopy}
        className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
        title="Copier"
      >
        {copied ? <Check className="w-3 h-3 text-[var(--success)]" /> : <Copy className="w-3 h-3" />}
      </button>

      {role === "assistant" && (
        <>
          <button
            onClick={onRegenerate}
            className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Régénérer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleFeedback("up")}
            className={`p-1 transition-colors ${feedback === "up" ? "text-[var(--success)]" : "text-[var(--text-muted)] hover:text-white"}`}
            title="Bon"
          >
            <ThumbsUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleFeedback("down")}
            className={`p-1 transition-colors ${feedback === "down" ? "text-[var(--danger)]" : "text-[var(--text-muted)] hover:text-white"}`}
            title="Mauvais"
          >
            <ThumbsDown className="w-3 h-3" />
          </button>
        </>
      )}

      {role === "user" && (
        <button
          onClick={onEdit}
          className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
          title="Éditer"
        >
          <Edit3 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
