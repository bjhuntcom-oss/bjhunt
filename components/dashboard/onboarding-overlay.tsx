"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Code,
  Wrench,
  Slash,
  Bot,
  FileDown,
  ArrowRight,
  X,
} from "lucide-react";

const STORAGE_KEY = "bjhunt_onboarded";

interface OnboardingOverlayProps {
  locale: string;
  onPrefillChat?: (prompt: string) => void;
}

const ACTION_CARDS = [
  {
    id: "web-scan",
    icon: Globe,
    title: "Scanner un site web",
    description: "Lancez un audit de securite complet sur un domaine ou une IP.",
    prompt: "Scan the website https://example.com for vulnerabilities — run recon, port scan, and web fingerprinting.",
  },
  {
    id: "code-audit",
    icon: Code,
    title: "Auditer du code",
    description: "Analyse statique de code source pour detecter des failles.",
    prompt: "Analyze the following source code for security vulnerabilities, focusing on injection flaws and auth bypass.",
  },
  {
    id: "explore-tools",
    icon: Wrench,
    title: "Explorer les outils",
    description: "Decouvrez le playground avec bash, CVE lookup, JWT parse et plus.",
    navigateTo: "/dashboard/tools",
  },
] as const;

const TIPS = [
  {
    icon: Slash,
    text: "Utilisez / pour les commandes rapides",
  },
  {
    icon: Bot,
    text: "Changez d'agent avec le selecteur dans la barre d'outils",
  },
  {
    icon: FileDown,
    text: "Exportez vos rapports en un clic depuis la page Scans",
  },
] as const;

export function OnboardingOverlay({ locale, onPrefillChat }: OnboardingOverlayProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const done = localStorage.getItem(STORAGE_KEY);
      if (!done) {
        setVisible(true);
      }
    }
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
      style={{ background: "var(--bjhunt-bg-overlay, rgba(0,0,0,0.7))" }}
    >
      <div className="relative w-full max-w-[520px] mx-4 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg-surface)] rounded-[var(--bjhunt-radius-md)]">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors z-10 rounded-[var(--bjhunt-radius-sm)]"
          title="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-5">
          {[0, 1, 2].map((s) => (
            <div
              key={s}
              className="h-[2px] flex-1 transition-colors"
              style={{
                backgroundColor: s <= step ? "var(--bjhunt-text)" : "var(--bjhunt-border)",
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
          {/* ── Step 0: Welcome ──────────────────────────────────── */}
          {step === 0 && (
            <div className="text-center py-6">
              <h1 className="font-mono font-semibold text-[18px] text-[var(--bjhunt-text)] uppercase tracking-[0.18em] mb-3">
                Bienvenue sur BJHUNT
              </h1>
              <p className="font-sans text-[14px] text-[var(--bjhunt-text-muted)] leading-relaxed max-w-[380px] mx-auto mb-8">
                La plateforme de cybersecurite autonome propulsee par 17 agents IA
              </p>
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 h-10 px-6 font-mono font-semibold text-[12px] uppercase tracking-[0.18em] bg-[var(--bjhunt-bg-surface)] border border-[var(--state-success)] text-[var(--state-success)] rounded-[var(--bjhunt-radius)] hover:bg-[var(--state-success-tint)] transition-colors"
              >
                Commencer
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* ── Step 1: Choose action ────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="font-mono font-semibold text-[14px] text-[var(--bjhunt-text)] uppercase tracking-[0.18em] mb-1">
                Choisissez votre premiere action
              </h2>
              <p className="font-sans text-[13px] text-[var(--bjhunt-text-muted)] mb-5">
                Selectionnez un point de depart pour explorer la plateforme
              </p>

              <div className="space-y-2">
                {ACTION_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        if ("navigateTo" in card && card.navigateTo) {
                          finish();
                          router.push(`/${locale}${card.navigateTo}`);
                        } else if ("prompt" in card && card.prompt) {
                          finish();
                          onPrefillChat?.(card.prompt);
                        }
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 border border-[var(--bjhunt-border)] text-left hover:border-[var(--bjhunt-border-strong)] hover:bg-white/[0.04] transition-colors group rounded-[var(--bjhunt-radius)]"
                    >
                      <div className="w-9 h-9 flex items-center justify-center border border-[var(--bjhunt-border-strong)] flex-shrink-0 mt-0.5 group-hover:border-[var(--bjhunt-text)] transition-colors rounded-[var(--bjhunt-radius-sm)]">
                        <Icon className="w-4 h-4 text-[var(--bjhunt-text-muted)] group-hover:text-[var(--bjhunt-text)] transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-sans font-semibold text-[13px] text-[var(--bjhunt-text)] mb-0.5">
                          {card.title}
                        </div>
                        <div className="font-sans text-[12px] text-[var(--bjhunt-text-muted)] leading-relaxed">
                          {card.description}
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)] flex-shrink-0 mt-2 group-hover:text-[var(--bjhunt-text)] transition-colors" />
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={() => setStep(0)}
                  className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                >
                  Passer
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Quick tips ───────────────────────────────── */}
          {step === 2 && (
            <div>
              <h2 className="font-mono font-semibold text-[14px] text-[var(--bjhunt-text)] uppercase tracking-[0.18em] mb-1">
                Conseils rapides
              </h2>
              <p className="font-sans text-[13px] text-[var(--bjhunt-text-muted)] mb-5">
                Quelques raccourcis pour etre productif des le depart
              </p>

              <div className="space-y-3">
                {TIPS.map((tip, i) => {
                  const Icon = tip.icon;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 border border-[var(--bjhunt-border)] bg-[var(--bjhunt-bg)] rounded-[var(--bjhunt-radius)]"
                    >
                      <div className="w-8 h-8 flex items-center justify-center border border-[var(--bjhunt-border-strong)] flex-shrink-0 rounded-[var(--bjhunt-radius-sm)]">
                        <Icon className="w-3.5 h-3.5 text-[var(--bjhunt-text-muted)]" />
                      </div>
                      <span className="font-sans text-[13px] text-[var(--bjhunt-text)] leading-relaxed">
                        {tip.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="font-mono font-semibold text-[11px] uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)] hover:text-[var(--bjhunt-text)] transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={finish}
                  className="inline-flex items-center gap-2 h-10 px-5 font-mono font-semibold text-[12px] uppercase tracking-[0.18em] bg-[var(--bjhunt-bg-surface)] border border-[var(--state-success)] text-[var(--state-success)] rounded-[var(--bjhunt-radius)] hover:bg-[var(--state-success-tint)] transition-colors"
                >
                  Terminer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
