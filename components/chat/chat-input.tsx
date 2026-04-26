/// <reference lib="dom" />
"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, Globe, Settings2, BookOpen, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandsMenu, SLASH_COMMANDS, type SlashCommandContext } from "./slash-commands";
import { FileUploadZone, type PendingFile } from "./file-upload-zone";
import { VoiceRecorder } from "./voice-recorder";
import { AgentSelector } from "./agent-selector";

interface ChatInputProps {
  onSubmit: (content: string, files: PendingFile[]) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onOpenPromptLibrary: () => void;
  onSlashCommand?: (context: SlashCommandContext) => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  initialValue?: string;
  onConsumeInitialValue?: () => void;
  selectedAgent?: string;
  onSelectAgent?: (agentId: string) => void;
}

export function ChatInput({
  onSubmit,
  onStop,
  onOpenSettings,
  onOpenPromptLibrary,
  onSlashCommand,
  webSearch,
  onToggleWebSearch,
  disabled,
  isStreaming,
  placeholder,
  initialValue,
  onConsumeInitialValue,
  selectedAgent = "bjhunt",
  onSelectAgent,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [showSlash, setShowSlash] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Revoke object URLs when files are removed
  const prevFilesRef = useRef<PendingFile[]>([]);
  useEffect(() => {
    const prev = prevFilesRef.current;
    const current = files;
    for (const f of prev) {
      if (f.preview && !current.some((c) => c.id === f.id)) {
        URL.revokeObjectURL(f.preview);
      }
    }
    prevFilesRef.current = current;
  }, [files]);

  // Revoke all remaining URLs on unmount
  useEffect(() => {
    return () => {
      for (const f of prevFilesRef.current) {
        if (f.preview) URL.revokeObjectURL(f.preview);
      }
    };
  }, []);

  // Auto-resize textarea up to 40vh
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const maxH = Math.floor(window.innerHeight * 0.4);
    ta.style.height = Math.min(ta.scrollHeight, maxH) + "px";
  }, [value]);

  // Inject initialValue from prompt library
  useEffect(() => {
    if (initialValue) {
      setValue(initialValue);
      textareaRef.current?.focus();
      onConsumeInitialValue?.();
    }
  }, [initialValue, onConsumeInitialValue]);

  // Click-outside to dismiss slash menu
  useEffect(() => {
    if (!showSlash) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSlash(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSlash]);

  // Filtered slash commands for keyboard nav
  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.command.includes(value.toLowerCase())
  );

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    const isSlash = v.startsWith("/") && !v.includes(" ");
    setShowSlash(isSlash);
    if (isSlash) setSlashIndex(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Slash menu keyboard navigation
    if (showSlash && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
        e.preventDefault();
        handleSlashSelect(filteredCommands[slashIndex].command + " ");
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowSlash(false);
    }
  }

  function handleSlashSelect(cmd: string) {
    setValue(cmd);
    setShowSlash(false);
    setSlashIndex(0);
    textareaRef.current?.focus();
  }

  function handleSubmit() {
    if (!value.trim()) return;
    onSubmit(value.trim(), files);
    setValue("");
    setFiles([]);
    setShowSlash(false);
  }

  return (
    <div className="px-4 py-3" style={{ background: "transparent" }}>
      <FileUploadZone
        files={files}
        onAdd={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
        onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
      >
        <div
          ref={containerRef}
          className={cn(
            "relative px-3 py-2",
            "chatbox-glow transition-all duration-300"
          )}
        >
          {/* Slash commands */}
          {showSlash && filteredCommands.length > 0 && (
            <SlashCommandsMenu
              query={value}
              activeIndex={slashIndex}
              onSelect={handleSlashSelect}
              onHover={setSlashIndex}
            />
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? "Message… (/ pour les commandes)"}
            rows={1}
            className={cn(
              "w-full bg-transparent text-[13px] text-white placeholder:text-[var(--text-muted)]",
              "resize-none outline-none leading-relaxed py-2 font-mono",
              "min-h-[40px] overflow-y-auto"
            )}
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-between mt-1">
            {/* Left: tool icons */}
            <div className="flex items-center gap-0.5">
              {/* Agent selector */}
              {onSelectAgent && (
                <AgentSelector
                  selectedAgent={selectedAgent}
                  onSelect={onSelectAgent}
                />
              )}

              {/* File attach */}
              <label
                className="p-2 md:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-all duration-200 cursor-pointer"
                title="Joindre un fichier"
              >
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.md,.csv,image/*"
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? [])
                      .slice(0, 5)
                      .map(
                        (f) =>
                          ({
                            id: `${f.name}-${Date.now()}`,
                            file: f,
                            preview: f.type.startsWith("image/")
                              ? URL.createObjectURL(f)
                              : undefined,
                          }) as PendingFile
                      );
                    setFiles((prev) => [...prev, ...picked].slice(0, 5));
                    e.target.value = "";
                  }}
                />
                {/* Paperclip SVG */}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
              </label>

              {/* Voice */}
              <VoiceRecorder onTranscript={(t) => setValue((prev) => prev + t)} />

              {/* Web search */}
              <button
                type="button"
                onClick={onToggleWebSearch}
                title="Recherche web"
                className={cn(
                  "p-2 md:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all duration-200",
                  webSearch
                    ? "text-white bg-white/[0.10] ring-1 ring-white/20"
                    : "text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06]"
                )}
              >
                <Globe className="w-4 h-4" />
              </button>

              {/* Prompt library */}
              <button
                type="button"
                onClick={onOpenPromptLibrary}
                title="Bibliothèque de prompts (Ctrl+/)"
                className="p-2 md:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Model settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                title="Paramètres du modèle (Ctrl+M)"
                className="p-2 md:p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-white hover:bg-white/[0.06] transition-all duration-200"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right: stop (while streaming) + send (always, if text) */}
            <div className="flex items-center gap-2">
              {isStreaming && (
                <button
                  onClick={onStop}
                  className="h-8 px-3 flex items-center gap-1.5 bg-[var(--danger)]/20 border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/30 transition-colors text-[10px] uppercase tracking-wider"
                  title="Arrêter la génération"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!value.trim()}
                className="h-8 w-8 flex items-center justify-center text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                style={{
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                }}
                title={isStreaming ? "Remplacer la réponse en cours (Enter)" : "Envoyer (Enter)"}
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Hints */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-[8px] text-[var(--text-subtle)]">
              {webSearch && (
                <span className="flex items-center gap-1 text-white">
                  <Globe className="w-2.5 h-2.5" />
                  Recherche web active
                </span>
              )}
            </div>
            <span className="text-[8px] text-[var(--text-subtle)]">
              Enter · Shift+Enter newline · / commandes
            </span>
          </div>
        </div>
      </FileUploadZone>
    </div>
  );
}
