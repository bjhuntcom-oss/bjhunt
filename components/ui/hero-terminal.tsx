"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Refonte 2026: hardcoded scenario hex retired — accent maps to tri-state. */
const SCENARIOS = [
  { id: "t1", accent: "var(--state-success)" },  // network audit
  { id: "t2", accent: "var(--state-warning)" },  // recon OSINT
  { id: "t3", accent: "var(--state-critical)" }, // CVE incident
  { id: "t4", accent: "var(--state-success)" },  // GitHub report
  { id: "t5", accent: "var(--state-warning)" },  // pre-prod pipeline
] as const;

type ScenarioId = (typeof SCENARIOS)[number]["id"];

const DELAYS = {
  user:    800,
  ai:      1200,
  data:    900,
  result:  1000,
};

const C_CRITICAL = "var(--state-critical)";
const C_WARNING  = "var(--state-warning)";
const C_SUCCESS  = "var(--state-success)";
const C_MUTED    = "var(--bjhunt-text-muted)";

const DATA_BLOCKS: Record<ScenarioId, React.ReactNode> = {
  t1: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[var(--bjhunt-text-muted)] italic">Agent Exploit analyse vos endpoints...</p>
      <div className="space-y-1 font-mono">
        {[
          ["/api/users",    "SQLi", "CRITIQUE", C_CRITICAL],
          ["/api/search",   "XSS",  "HIGH",     C_WARNING],
          ["/api/upload",   "SSRF", "MEDIUM",   C_WARNING],
        ].map(([path, vuln, sev, color]) => (
          <div key={path} className="flex items-center gap-2">
            <span className="w-3 h-3 flex items-center justify-center text-[8px]" style={{ color: color as string }}>{"●"}</span>
            <span className="text-[var(--bjhunt-text)]">{path}</span>
            <span className="text-[var(--bjhunt-text-muted)]">{"→"}</span>
            <span style={{ color: color as string }}>{vuln}</span>
            <span className="ml-auto text-[8px] px-1.5 py-0.5" style={{ color: color as string }}>{sev}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  t2: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[var(--bjhunt-text-muted)] italic">Agent Recon cartographie la surface d&rsquo;attaque...</p>
      <div className="space-y-1 font-mono">
        {[
          ["7 sous-domaines",    "trouvés",       C_SUCCESS],
          ["2 ports ouverts",    "sans auth",     C_WARNING],
          ["TLS 1.2",           "à mettre à jour", C_WARNING],
          ["Cloudflare WAF",    "détecté",        C_SUCCESS],
        ].map(([item, status, color]) => (
          <div key={item} className="flex items-center gap-2">
            <span style={{ color: color as string }}>{"›"}</span>
            <span className="text-[var(--bjhunt-text)]">{item}</span>
            <span className="text-[var(--bjhunt-text-muted)]">{status}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  t3: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[var(--bjhunt-text-muted)] italic">Agent Analyst corrèle les événements suspects...</p>
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center gap-2 px-2 py-1.5 border" style={{ borderColor: C_CRITICAL, background: "var(--state-critical-tint)" }}>
          <span style={{ color: C_CRITICAL }}>{"⚠"}</span>
          <span className="text-[var(--bjhunt-text)]">185.220.101.47</span>
          <span style={{ color: C_MUTED }}>{"→ Nœud TOR"}</span>
          <span className="ml-auto text-[8px]" style={{ color: C_CRITICAL }}>248 tentatives</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span style={{ color: C_SUCCESS }}>{"✓"}</span>
          <span style={{ color: C_MUTED }}>IP bloquée automatiquement</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span style={{ color: C_SUCCESS }}>{"✓"}</span>
          <span style={{ color: C_MUTED }}>Alerte configurée</span>
        </div>
      </div>
    </div>
  ),

  t4: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[var(--bjhunt-text-muted)] italic">Compilation du rapport exécutif...</p>
      <div className="space-y-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-[var(--bjhunt-text)]">94</span>
          <span className="text-[var(--bjhunt-text-muted)] text-[9px]">/100</span>
          <span className="text-[9px]" style={{ color: C_SUCCESS }}>{"▲ +12"}</span>
        </div>
        <div className="space-y-1">
          {[
            ["ISO 27001", true], ["PCI-DSS", true], ["OWASP Top 10", true], ["SOC 2", false],
          ].map(([std, ok]) => (
            <div key={std as string} className="flex items-center gap-2">
              <span style={{ color: ok ? C_SUCCESS : C_MUTED }}>{ok ? "✓" : "○"}</span>
              <span className={ok ? "text-[var(--bjhunt-text)]" : "text-[var(--bjhunt-text-muted)]"}>{std as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  t5: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[var(--bjhunt-text-muted)] italic">Agent Cloud Hunter inspecte vos conteneurs...</p>
      <div className="space-y-1 font-mono">
        {[
          { svc: "API Gateway",  status: "✓ Sécurisé",         color: C_SUCCESS },
          { svc: "PostgreSQL",   status: "✓ Sécurisé",         color: C_SUCCESS },
          { svc: "Redis",        status: "⚠ Port 6379 exposé", color: C_WARNING },
          { svc: "Nginx",        status: "⚠ SSL expire J-18",  color: C_WARNING },
          { svc: "Docker env",   status: "✗ Clé API exposée",  color: C_CRITICAL },
        ].map(({ svc, status, color }) => (
          <div key={svc} className="flex items-center justify-between">
            <span className="text-[var(--bjhunt-text)]">{svc}</span>
            <span style={{ color }} className="text-[9px]">{status}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export function HeroTerminal({ className }: { className?: string }) {
  const t = useTranslations("heroTerminals");
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);

  const scenario = SCENARIOS[idx];
  const sid = scenario.id as ScenarioId;
  const accent = scenario.accent;

  const nextScenario = useCallback(() => {
    setIdx((i) => (i + 1) % SCENARIOS.length);
    setStep(0);
  }, []);

  useEffect(() => {
    setStep(0);
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const steps: (keyof typeof DELAYS)[] = ["user", "ai", "data", "result"];
    steps.forEach((key, i) => {
      elapsed += DELAYS[key];
      timers.push(setTimeout(() => setStep(i + 1), elapsed));
    });

    timers.push(setTimeout(nextScenario, elapsed + 9500));

    return () => timers.forEach(clearTimeout);
  }, [idx, nextScenario]);

  const tx = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div
      className={cn(
        "bg-[var(--bjhunt-bg-surface)] border border-[var(--bjhunt-border)] font-mono text-[11px] leading-relaxed overflow-hidden",
        "rounded-[var(--bjhunt-radius-md)]",
        className
      )}
    >
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--bjhunt-border)]">
        <div className="w-2 h-2 rounded-full bg-[var(--bjhunt-border-strong)]" />
        <div className="w-2 h-2 rounded-full bg-[var(--bjhunt-border-strong)]" />
        <div className="w-2 h-2 rounded-full" style={{ background: accent }} />
        <span className="ml-2 text-[8px] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.2em] truncate">
          bjhunt ai · {tx(`${sid}.label`)}
        </span>
        <div className="ml-auto flex gap-1 flex-shrink-0">
          {SCENARIOS.map((s, i) => (
            <div
              key={s.id}
              className="transition-all duration-500"
              style={{
                width: i === idx ? 10 : 4,
                height: 4,
                background: i === idx ? accent : "var(--bjhunt-border-strong)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4 min-h-[220px]">
        {step >= 1 && (
          <div className="space-y-1">
            <p className="text-[8px] text-[var(--bjhunt-text-muted)] uppercase tracking-[0.2em]">
              {tx("youLabel")}
            </p>
            <p className="text-[var(--bjhunt-text)] text-[12px] leading-snug">
              &ldquo;{tx(`${sid}.user`)}&rdquo;
            </p>
          </div>
        )}

        {step >= 2 && (
          <div className="space-y-1">
            <p
              className="text-[8px] uppercase tracking-[0.2em] font-bold"
              style={{ color: accent }}
            >
              BJHUNT AI
            </p>
            <p className="text-[var(--bjhunt-text-muted)] text-[11px]">{tx(`${sid}.think`)}</p>
          </div>
        )}

        {step >= 3 && (
          <div
            className="pl-3 border-l py-1 space-y-2"
            style={{ borderColor: accent }}
          >
            {DATA_BLOCKS[sid]}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] text-[var(--bjhunt-text-secondary)] leading-relaxed">{tx(`${sid}.find1`)}</p>
              <p className="text-[10px] text-[var(--bjhunt-text-secondary)] leading-relaxed">{tx(`${sid}.find2`)}</p>
            </div>
          </div>
        )}

        {step >= 4 && (
          <p className="font-bold text-[11px]" style={{ color: accent }}>
            {tx(`${sid}.result`)}
          </p>
        )}

        {step < 4 && (
          <span
            aria-hidden
            className="inline-block w-[7px] h-[14px] align-text-bottom bg-[var(--bjhunt-text)] animate-pulse"
          />
        )}
      </div>
    </div>
  );
}
