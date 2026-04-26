/**
 * EmptyState — refonte 2026 / B5.
 *
 * Centered prose. Eyebrow mono UPPERCASE, H1 system-ui,
 * 3 example prompt chips in a hairline gap-px grid (ghost variant).
 */
"use client";

import { Globe, Cloud, Database } from "lucide-react";
import { Eyebrow, H1 } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface Props {
  onPrompt: (prompt: string) => void;
}

const PROMPTS = [
  {
    icon: <Globe className="w-4 h-4" />,
    eyebrow: "Web",
    text: "Scan my web application for vulnerabilities",
  },
  {
    icon: <Cloud className="w-4 h-4" />,
    eyebrow: "Cloud",
    text: "Audit my AWS infrastructure",
  },
  {
    icon: <Database className="w-4 h-4" />,
    eyebrow: "Active Directory",
    text: "Find attack paths in my Active Directory",
  },
];

export function EmptyState({ onPrompt }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center px-4 py-10">
      <Eyebrow className="mb-6">BJHUNT / New conversation</Eyebrow>
      <H1 className="text-[var(--bjhunt-text)] max-w-[640px]">
        Que cherchez-vous à auditer&nbsp;?
      </H1>
      <p className="mt-6 mb-10 font-sans text-[14px] leading-[1.6] text-[var(--bjhunt-text-secondary)] max-w-[520px]">
        Décrivez une cible, choisissez un spécialiste, ou posez n&rsquo;importe
        quelle question. Dix-sept agents vous attendent — Recon, Exploit, Cloud
        Hunter, AD Operator…
      </p>

      {/* Hairline grid of 3 example prompts (gap-px reveals border bg) */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-px max-w-[720px] w-full bg-[var(--bjhunt-border)] border border-[var(--bjhunt-border)] rounded-[var(--bjhunt-radius)] overflow-hidden"
      >
        {PROMPTS.map((p) => (
          <button
            key={p.text}
            type="button"
            onClick={() => onPrompt(p.text)}
            className={cn(
              "group flex flex-col items-start gap-2 px-4 py-4 text-left",
              "bg-[var(--bjhunt-bg)] hover:bg-white/[0.04] transition-colors",
            )}
          >
            <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]">
              <span className="text-[var(--bjhunt-text-muted)]">{p.icon}</span>
              {p.eyebrow}
            </span>
            <span className="font-mono text-[12px] text-[var(--bjhunt-text)] leading-[1.4]">
              {p.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
