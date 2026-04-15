/// <reference lib="dom" />
"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Send, Globe, Settings2, BookOpen, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { SlashCommandsMenu } from "./slash-commands";
import { FileUploadZone, type PendingFile } from "./file-upload-zone";
import { VoiceRecorder } from "./voice-recorder";

interface ChatInputProps {
  onSubmit: (content: string, files: PendingFile[]) => void;
  onStop: () => void;
  onOpenSettings: () => void;
  onOpenPromptLibrary: () => void;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  placeholder?: string;
  initialValue?: string;
  onConsumeInitialValue?: () => void;
}

export function ChatInput({
  onSubmit,
  onStop,
  onOpenSettings,
  onOpenPromptLibrary,
  webSearch,
  onToggleWebSearch,
  disabled,
  isStreaming,
  placeholder,
  initialValue,
  onConsumeInitialValue,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [showSlash, setShowSlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setValue(v);
    setShowSlash(v.startsWith("/") && !v.includes(" "));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowSlash(false);
    }
  }

  function handleSubmit() {
    if (!value.trim() || disabled) return;
    onSubmit(value.trim(), files);
    setValue("");
    setFiles([]);
    setShowSlash(false);
  }

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg)] px-4 py-3">
      <FileUploadZone
        files={files}
        onAdd={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
        onRemove={(id) => setFiles((prev) => prev.filter((f) => f.id !== id))}
      >
        <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-input)] px-3 py-2">
          {/* Slash commands */}
          {showSlash && (
            <SlashCommandsMenu
              query={value}
              onSelect={(cmd) => {
                setValue(cmd);
                setShowSlash(false);
                textareaRef.current?.focus();
              }}
            />
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled && !isStreaming}
            placeholder={placeholder ?? "Message… (/ pour les commandes)"}
            rows={1}
            className={cn(
              "w-full bg-transparent text-[13px] text-white placeholder:text-[var(--text-muted)]",
              "resize-none outline-none leading-relaxed py-2",
              "min-h-[40px] overflow-y-auto"
            )}
          />

          {/* Toolbar row */}
          <div className="flex items-center justify-between mt-1">
            {/* Left: tool icons */}
            <div className="flex items-center gap-0.5">
              {/* File attach */}
              <label
                className="p-2 text-[var(--text-muted)] hover:text-white transition-colors cursor-pointer"
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
                  "p-2 transition-colors",
                  webSearch
                    ? "text-[var(--success)]"
                    : "text-[var(--text-muted)] hover:text-white"
                )}
              >
                <Globe className="w-4 h-4" />
              </button>

              {/* Prompt library */}
              <button
                type="button"
                onClick={onOpenPromptLibrary}
                title="Bibliothèque de prompts (Ctrl+/)"
                className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <BookOpen className="w-4 h-4" />
              </button>

              {/* Model settings */}
              <button
                type="button"
                onClick={onOpenSettings}
                title="Paramètres du modèle (Ctrl+M)"
                className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </div>

            {/* Right: send / stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="h-8 px-3 flex items-center gap-1.5 bg-[var(--danger)]/20 border border-[var(--danger)]/40 text-[var(--danger)] hover:bg-[var(--danger)]/30 transition-colors text-[10px] uppercase tracking-wider rounded-xl"
                  title="Arrêter la génération"
                >
                  <Square className="w-3 h-3 fill-current" />
                  Stop
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim() || disabled}
                  className="h-8 w-8 flex items-center justify-center bg-white text-black hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 rounded-xl"
                  title="Envoyer (Enter)"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Hints */}
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-[8px] text-[var(--text-subtle)]">
              {webSearch && (
                <span className="flex items-center gap-1 text-[var(--success)]">
                  <Globe className="w-2.5 h-2.5" />
                  Recherche web active
                </span>
              )}
            </div>
            <span className="text-[8px] text-[var(--text-subtle)]">
              Enter · Shift+Enter newline · Ctrl+K nouvelle conv
            </span>
          </div>
        </div>
      </FileUploadZone>
    </div>
  );
}
