"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  { id: "t1", accent: "#00cc8a" }, // green  — network audit
  { id: "t2", accent: "#ff9900" }, // amber  — recon OSINT
  { id: "t3", accent: "#ff4444" }, // red    — CVE incident
  { id: "t4", accent: "#4488ff" }, // blue   — GitHub report
  { id: "t5", accent: "#aa44ff" }, // purple — pre-prod pipeline
] as const;

type ScenarioId = (typeof SCENARIOS)[number]["id"];

// Delays per step (ms)
const DELAYS = {
  user:    800,
  ai:      1200,
  data:    900,
  result:  1000,
};

// Visual data blocks — hardcoded technical data, not translated
const DATA_BLOCKS: Record<ScenarioId, React.ReactNode> = {
  t1: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[#999] italic">Agent Exploit analyse vos endpoints...</p>
      <div className="space-y-1 font-mono">
        {[
          ["/api/users",    "SQLi", "CRITIQUE", "#ff4444"],
          ["/api/search",   "XSS",  "HIGH",     "#ff9900"],
          ["/api/upload",   "SSRF", "MEDIUM",   "#ff9900"],
        ].map(([path, vuln, sev, color]) => (
          <div key={path} className="flex items-center gap-2">
            <span className="w-3 h-3 flex items-center justify-center text-[8px]" style={{ color: color as string }}>●</span>
            <span className="text-white">{path}</span>
            <span className="text-[#666]">→</span>
            <span style={{ color: color as string }}>{vuln}</span>
            <span className="ml-auto text-[8px] px-1.5 py-0.5" style={{ color: color as string, background: (color as string) + "15" }}>{sev}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  t2: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[#999] italic">Agent Recon cartographie la surface d'attaque...</p>
      <div className="space-y-1 font-mono">
        {[
          ["7 sous-domaines",    "trouvés",       "#00cc8a"],
          ["2 ports ouverts",    "sans auth",     "#ff9900"],
          ["TLS 1.2",           "à mettre à jour", "#ff9900"],
          ["Cloudflare WAF",    "détecté",        "#00cc8a"],
        ].map(([item, status, color]) => (
          <div key={item} className="flex items-center gap-2">
            <span style={{ color: color as string }}>›</span>
            <span className="text-white">{item}</span>
            <span className="text-[#666]">{status}</span>
          </div>
        ))}
      </div>
    </div>
  ),

  t3: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[#999] italic">Agent Analyst corrèle les événements suspects...</p>
      <div className="space-y-1.5 font-mono">
        <div className="flex items-center gap-2 px-2 py-1.5 border border-[#ff444430] bg-[#ff44440a]">
          <span className="text-[#ff4444]">⚠</span>
          <span className="text-white">185.220.101.47</span>
          <span className="text-[#888]">→ Nœud TOR</span>
          <span className="ml-auto text-[#ff4444] text-[8px]">248 tentatives</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-[#00cc8a]">✓</span>
          <span className="text-[#888]">IP bloquée automatiquement</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1">
          <span className="text-[#00cc8a]">✓</span>
          <span className="text-[#888]">Alerte configurée</span>
        </div>
      </div>
    </div>
  ),

  t4: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[#999] italic">Compilation du rapport exécutif...</p>
      <div className="space-y-2 font-mono">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-black text-white">94</span>
          <span className="text-[#888] text-[9px]">/100</span>
          <span className="text-[#00cc8a] text-[9px]">▲ +12</span>
        </div>
        <div className="space-y-1">
          {[
            ["ISO 27001", true], ["PCI-DSS", true], ["OWASP Top 10", true], ["SOC 2", false],
          ].map(([std, ok]) => (
            <div key={std as string} className="flex items-center gap-2">
              <span style={{ color: ok ? "#00cc8a" : "#666" }}>{ok ? "✓" : "○"}</span>
              <span className={ok ? "text-white" : "text-[#555]"}>{std as string}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),

  t5: (
    <div className="space-y-2 text-[10px]">
      <p className="text-[#999] italic">Agent Cloud Hunter inspecte vos conteneurs...</p>
      <div className="space-y-1 font-mono">
        {[
          { svc: "API Gateway",  status: "✓ Sécurisé",         color: "#00cc8a" },
          { svc: "PostgreSQL",   status: "✓ Sécurisé",         color: "#00cc8a" },
          { svc: "Redis",        status: "⚠ Port 6379 exposé", color: "#ff9900" },
          { svc: "Nginx",        status: "⚠ SSL expire J-18",  color: "#ff9900" },
          { svc: "Docker env",   status: "✗ Clé API exposée",  color: "#ff4444" },
        ].map(({ svc, status, color }) => (
          <div key={svc} className="flex items-center justify-between">
            <span className="text-white">{svc}</span>
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
  const [step, setStep] = useState(0); // 0=hidden 1=user 2=ai 3=data 4=result

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

    // Long pause before cycling to next scenario (~14s total visible)
    timers.push(setTimeout(nextScenario, elapsed + 9500));

    return () => timers.forEach(clearTimeout);
  }, [idx, nextScenario]);

  const tx = (key: string) => t(key as Parameters<typeof t>[0]);

  return (
    <div
      className={cn(
        "bg-[var(--bg-card)] border border-[var(--border)] font-mono text-[11px] leading-relaxed overflow-hidden",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-[var(--border)]">
        <div className="w-2 h-2 bg-[var(--border-strong)]" />
        <div className="w-2 h-2 bg-[var(--border-strong)]" />
        <div className="w-2 h-2" style={{ background: accent }} />
        <span className="ml-2 text-[8px] text-[#777777] uppercase tracking-[0.2em] truncate">
          bjhunt ai · {tx(`${sid}.label`)}
        </span>
        {/* Scenario progress dots */}
        <div className="ml-auto flex gap-1 flex-shrink-0">
          {SCENARIOS.map((s, i) => (
            <div
              key={s.id}
              className="transition-all duration-500"
              style={{
                width: i === idx ? 10 : 4,
                height: 4,
                background: i === idx ? accent : "var(--border-strong)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="p-5 space-y-4 min-h-[220px]">

        {/* User natural language input */}
        {step >= 1 && (
          <div className="space-y-1">
            <p className="text-[8px] text-[#777777] uppercase tracking-[0.2em]">
              {tx("youLabel")}
            </p>
            <p className="text-white text-[12px] leading-snug">
              &ldquo;{tx(`${sid}.user`)}&rdquo;
            </p>
          </div>
        )}

        {/* AI thinking */}
        {step >= 2 && (
          <div className="space-y-1">
            <p
              className="text-[8px] uppercase tracking-[0.2em] font-bold"
              style={{ color: accent }}
            >
              BJHUNT AI
            </p>
            <p className="text-[var(--text-muted)] text-[11px]">{tx(`${sid}.think`)}</p>
          </div>
        )}

        {/* Visual data block */}
        {step >= 3 && (
          <div
            className="pl-3 border-l py-1 space-y-2"
            style={{ borderColor: accent + "40" }}
          >
            {DATA_BLOCKS[sid]}
            {/* AI findings in natural language */}
            <div className="space-y-1 pt-1">
              <p className="text-[10px] text-[#aaa] leading-relaxed">{tx(`${sid}.find1`)}</p>
              <p className="text-[10px] text-[#aaa] leading-relaxed">{tx(`${sid}.find2`)}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {step >= 4 && (
          <p className="font-bold text-[11px]" style={{ color: accent }}>
            {tx(`${sid}.result`)}
          </p>
        )}

        {/* Blinking cursor while animating */}
        {step < 4 && <span className="terminal-cursor" />}
      </div>
    </div>
  );
}
