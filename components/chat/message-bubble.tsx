"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { Copy, Check, Play } from "lucide-react";
import { MessageActions } from "./message-actions";
import { AgentTransition } from "@/components/ui/agent-transition";
import { cn } from "@/lib/utils";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  provider?: string;
  /** Upstream agent id ("recon", "exploit", ...) — drives the AgentTransition pill. */
  agent?: string;
  files?: UploadedFile[];
  sources?: WebSource[];
  isStreaming?: boolean;
  emptyResponse?: boolean;
  createdAt: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  url?: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

/**
 * Custom sanitize schema that preserves syntax highlighting classes.
 * defaultSchema already allows `language-*` on `code` elements.
 * We add `hljs-*` on `span` elements so rehype-highlight's output survives sanitization.
 */
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className", /^hljs-/],
    ],
  },
};

// Provider → tri-state mapping (refonte 2026 §1).
// Bodies always render in `--bjhunt-text` (white). Only the small leading dot
// next to the author label gets a state colour. We collapse all providers to
// neutral by default and reserve emerald for the in-house BJHUNT engine —
// removing the bespoke #d4a574 / #74a4d4 / #a474d4 hex from the chat surface.
const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "var(--bjhunt-text-muted)",
  openai:    "var(--bjhunt-text-muted)",
  mistral:   "var(--bjhunt-text-muted)",
  ollama:    "var(--state-success)",
  bjhunt:    "var(--state-success)",
}

function providerColor(provider?: string): string {
  if (!provider) return "var(--bjhunt-border)"
  return PROVIDER_COLORS[provider.toLowerCase()] ?? "var(--bjhunt-border)"
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return "à l'instant"
  const m = Math.floor(s / 60)
  if (m < 60) return `il y a ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `il y a ${h}h`
  return new Date(isoString).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
}

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
  onFeedback?: (type: "up" | "down") => void;
  onFork?: () => void;
  onRetry?: () => void;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="relative group/code my-3 rounded-[var(--bjhunt-radius)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border)] border-b-0">
        <span className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
          {language || "code"}
        </span>
        <div className="flex items-center gap-2">
          {["bash", "sh", "python", "py"].includes(language) && (
            <button className="flex items-center gap-1 font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--state-success)] hover:text-[var(--bjhunt-text)] transition-colors">
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          <button
            onClick={handleCopy}
            className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors flex items-center gap-1"
          >
            {copied ? <><Check className="w-3 h-3 text-[var(--state-success)]" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
      </div>
      <pre className="p-4 overflow-x-auto bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border)] border-t-0">
        <code className={`language-${language} text-[12px] font-mono leading-relaxed`}>
          {code}
        </code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message, onRegenerate, onEdit, onFeedback, onFork, onRetry }: MessageBubbleProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);

  // Sync edit value when message content changes externally
  useEffect(() => {
    setEditValue(message.content);
  }, [message.content]);

  const isUser = message.role === "user";
  const isThinking = !isUser && !!message.isStreaming && message.content === ""
  const isEmpty = !isUser && !message.isStreaming && message.emptyResponse && !message.content;

  function commitEdit() {
    onEdit?.(editValue);
    setEditing(false);
  }

  return (
    <div className={cn("group flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      {/* Role label — user name or agent pill */}
      {isUser ? (
        <div className="font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
          Vous
        </div>
      ) : message.agent ? (
        <AgentTransition agentId={message.agent} variant="pill" />
      ) : (
        <div className="flex items-center gap-1.5 font-mono font-semibold text-[10px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: providerColor(message.provider) }} />
          <span>BJHUNT AI</span>
        </div>
      )}

      {/* Fichiers uploadés */}
      {message.files && message.files.length > 0 && (
        <div className="flex flex-wrap gap-2 max-w-[70%]">
          {message.files.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] font-sans text-[12px] text-[var(--bjhunt-text)]">
              {f.type.startsWith("image/") && f.url ? (
                <img src={f.url} alt={f.name} className="max-h-32 max-w-xs object-contain" />
              ) : (
                <span>{f.name}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contenu */}
      <div
        className={cn(
          "max-w-[95%] md:max-w-[75%] px-4 py-3 font-sans text-[14px] leading-relaxed relative overflow-hidden transition-colors rounded-[var(--bjhunt-radius-md)] border text-[var(--bjhunt-text)]",
          isUser
            ? "bg-[var(--bjhunt-bg-surface)] border-[var(--bjhunt-border-strong)]"
            : "bg-[var(--bjhunt-bg-surface)] border-[var(--bjhunt-border)]"
        )}
      >
        {isThinking ? (
          <div className="flex items-center gap-1 py-1">
            <span className="w-1.5 h-1.5 bg-[var(--bjhunt-text-muted)] rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-[var(--bjhunt-text-muted)] rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-[var(--bjhunt-text-muted)] rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[var(--state-warning)] rounded-full flex-shrink-0" />
              <span className="font-sans text-[13px] text-[var(--state-warning)]">
                Le moteur IA est temporairement indisponible.
              </span>
            </div>
            <p className="font-sans text-[12px] text-[var(--bjhunt-text-muted)] leading-relaxed">
              La connexion au backend a abouti mais aucune reponse n&apos;a ete generee. Cela peut arriver si le moteur LangGraph n&apos;est pas encore demarre.
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
                Reessayer
              </button>
            )}
          </div>
        ) : editing ? (
          <div>
            <textarea
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="w-full bg-transparent text-[var(--bjhunt-text)] outline-none resize-none font-sans text-[13px]"
            />
            <div className="flex gap-2 mt-2 justify-end">
              <button onClick={() => setEditing(false)} className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors">Annuler</button>
              <button onClick={commitEdit} className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] bg-[var(--bjhunt-bg-surface)] border border-[var(--state-success)] text-[var(--state-success)] rounded-[var(--bjhunt-radius)] px-3 py-1 hover:bg-[var(--state-success-tint)] transition-colors">Envoyer</button>
            </div>
          </div>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="chat-prose">
            <ReactMarkdown
              rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
              components={{
                code({ className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  const lang = match?.[1] ?? "";
                  const isBlock = String(children).includes("\n");
                  if (isBlock) {
                    return <CodeBlock code={String(children).replace(/\n$/, "")} language={lang} />;
                  }
                  return <code className="bg-[var(--bjhunt-bg)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-xs)] px-1.5 py-0.5 text-[12px] font-mono" {...props}>{children}</code>;
                },
                a({ href, children, ...props }) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="text-[var(--state-success)] underline underline-offset-2 hover:opacity-80"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && message.content !== "" && <span className="terminal-cursor ml-1" />}
          </div>
        )}

        {/* Inline action bar — assistant messages only, not while streaming, not for empty */}
        {message.role === "assistant" && !message.isStreaming && !isEmpty && (
          <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[var(--bjhunt-border)]">
            {/* Copy */}
            <button
              onClick={() => navigator.clipboard.writeText(message.content)}
              className="p-1.5 rounded-[var(--bjhunt-radius-sm)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
              title="Copier le texte"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>

            {/* TTS */}
            <button
              onClick={() => {
                window.speechSynthesis.cancel();
                const utt = new SpeechSynthesisUtterance(message.content.replace(/[#*`[\]()]/g, "").slice(0, 2000));
                utt.lang = "fr-FR";
                window.speechSynthesis.speak(utt);
              }}
              className="p-1.5 rounded-[var(--bjhunt-radius-sm)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
              title="Lire à voix haute"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"/>
              </svg>
            </button>

            {/* Fork (if prop provided) */}
            {onFork && (
              <button
                onClick={onFork}
                className="p-1.5 rounded-[var(--bjhunt-radius-sm)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                title="Forker la conversation ici"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="6" y1="3" x2="6" y2="15"/>
                  <circle cx="18" cy="6" r="3"/>
                  <circle cx="6" cy="18" r="3"/>
                  <path d="M18 9a9 9 0 01-9 9"/>
                </svg>
              </button>
            )}

            {/* Regenerate (if prop provided) */}
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1.5 rounded-[var(--bjhunt-radius-sm)] hover:bg-white/[0.04] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                title="Régénérer cette réponse"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                </svg>
              </button>
            )}

            {/* Token estimate — hide for empty responses */}
            {!isEmpty && (
              <span className="ml-auto font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">
                ~{Math.ceil(message.content.length / 4)} tok
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sources web */}
      {message.sources && message.sources.length > 0 && (
        <div className="max-w-[95%] md:max-w-[75%] flex flex-wrap gap-2">
          {message.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2 py-1 bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius-sm)] font-sans text-[12px] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] hover:border-[var(--bjhunt-border-strong)] transition-colors"
            >
              <span className="font-mono text-[var(--state-success)]">[{i + 1}]</span>
              <span className="max-w-[120px] truncate">{s.title}</span>
            </a>
          ))}
        </div>
      )}

      {/* Footer: timestamp + fork + actions */}
      <div className="flex items-center gap-2">
        <span className="font-mono tabular-nums text-[11px] text-[var(--bjhunt-text-muted)]">{relativeTime(message.createdAt)}</span>
        {!isUser && onFork && (
          <button
            onClick={onFork}
            className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors opacity-60 hover:opacity-100"
            title="Créer une branche depuis ce message"
          >
            ⎇ Fork
          </button>
        )}
        <MessageActions
          role={message.role as "user" | "assistant"}
          content={message.content}
          onRegenerate={onRegenerate}
          onEdit={() => setEditing(true)}
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}
