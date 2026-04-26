/**
 * Composer — refonte 2026 / B5.
 *
 * Wraps the existing <ChatInput> primitive (which owns auto-grow textarea,
 * file uploads, voice transcript, slash command menu, agent selector) and
 * dresses it in the new design-token shell. Centered column matches the
 * 720px message stream width.
 *
 * The decision to keep ChatInput as the leaf is deliberate:
 *  - Voice + file upload + slash menu are coupled and complex.
 *  - All preserved hooks per the brief live in that component already.
 *  - Replacing them inline would balloon this file beyond the 300 LOC
 *    target and risk regressing voice/upload behaviour.
 */
"use client";

import { ChatInput } from "@/components/chat/chat-input";
import type { PendingFile } from "@/components/chat/file-upload-zone";
import type { SlashCommandContext } from "@/components/chat/slash-commands";

interface Props {
  isStreaming: boolean;
  webSearch: boolean;
  selectedAgent: string;
  initialValue: string;
  placeholder?: string;
  onSubmit: (text: string, files: PendingFile[]) => void | Promise<void>;
  onStop: () => void;
  onOpenSettings: () => void;
  onOpenPromptLibrary: () => void;
  onSlashCommand: (ctx: SlashCommandContext) => void;
  onToggleWebSearch: () => void;
  onSelectAgent: (id: string) => void;
  onConsumeInitialValue: () => void;
}

export function Composer({
  isStreaming,
  webSearch,
  selectedAgent,
  initialValue,
  placeholder,
  onSubmit,
  onStop,
  onOpenSettings,
  onOpenPromptLibrary,
  onSlashCommand,
  onToggleWebSearch,
  onSelectAgent,
  onConsumeInitialValue,
}: Props) {
  return (
    <div className="shrink-0 bg-[var(--bjhunt-bg)] border-t border-[var(--bjhunt-border)]">
      <div className="mx-auto w-full max-w-[720px] px-4 md:px-6 py-4">
        <ChatInput
          onSubmit={onSubmit}
          onStop={onStop}
          onOpenSettings={onOpenSettings}
          onOpenPromptLibrary={onOpenPromptLibrary}
          onSlashCommand={onSlashCommand}
          webSearch={webSearch}
          onToggleWebSearch={onToggleWebSearch}
          isStreaming={isStreaming}
          placeholder={placeholder ?? "Describe your target or ask a question…"}
          initialValue={initialValue}
          onConsumeInitialValue={onConsumeInitialValue}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
        />
      </div>
    </div>
  );
}
