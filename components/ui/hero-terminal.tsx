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
    <div className="space-y-1 text-[10px] font-mono">
      <div className="grid grid-cols-4 gap-2 text-[var(--text-subtle)] uppercase text-[8px] tracking-widest pb-1 border-b border-[#1a1a1a]">
        <span>HOST</span><span>PORT</span><span>SERVICE</span><span>STATUS</span>
      </div>
      {[
        ["192.168.1.1", "22",   "SSH",   true],
        ["192.168.1.1", "80",   "HTTP",  true],
        ["192.168.1.4", "3306", "MySQL", false],
        ["192.168.1.7", "443",  "HTTPS", true],
      ].map(([host, port, svc, ok]) => (
        <div key={`${host}-${port}`} className="grid grid-cols-4 gap-2">
          <span className="text-white">{host}</span>
          <span className="text-[#888]">{port}</span>
          <span className="text-[#888]">{svc}</span>
          <span style={{ color: ok ? "#00cc8a" : "#ff9900" }}>
            {ok ? "● OPEN" : "⚠ EXP"}
          </span>
        </div>
      ))}
    </div>
  ),

  t2: (
    <div className="space-y-1.5 text-[10px] font-mono">
      {[
        ["DNS A",   "→", "104.26.10.239"],
        ["DNS MX",  "→", "mail.target.com"],
        ["WHOIS",   "→", "Cloudflare, Inc."],
        ["SSL",     "→", "Let's Encrypt · exp 2025-09"],
        ["SUBS",    "→", "14 sous-domaines trouvés"],
      ].map(([k, arrow, v]) => (
        <div key={k} className="flex gap-3">
          <span className="text-[var(--text-subtle)] w-14 flex-shrink-0">{k}</span>
          <span className="text-[#444]">{arrow}</span>
          <span className="text-white">{v}</span>
        </div>
      ))}
    </div>
  ),

  t3: (
    <div className="space-y-2 text-[10px] font-mono">
      <div className="flex items-center justify-between border border-[#ff444430] px-3 py-2 bg-[#ff44440a]">
        <div>
          <span className="text-[#ff4444] font-bold">CVE-2024-3094</span>
          <span className="text-[var(--text-muted)] ml-3">xz-utils 5.6.0→5.6.1</span>
        </div>
        <span className="text-[#ff4444] text-[8px] uppercase tracking-widest border border-[#ff4444] px-1.5 py-0.5">
          CVSS 10.0
        </span>
      </div>
      <div className="space-y-1">
        {[
          { host: "prod-api-01",  affected: true },
          { host: "prod-api-02",  affected: true },
          { host: "staging-main", affected: false },
        ].map(({ host, affected }) => (
          <div key={host} className="flex justify-between">
            <span className="text-[#888]">{host}</span>
            <span style={{ color: affected ? "#ff4444" : "#00cc8a" }}>
              {affected ? "● VULNÉRABLE" : "✓ PATCHÉ"}
            </span>
          </div>
        ))}
      </div>
    </div>
  ),

  t4: (
    <div className="space-y-2 text-[10px] font-mono">
      {[
        { id: "#247", title: "fix: SQLi vuln /api/users",    status: "MERGÉ",  ok: true  },
        { id: "#251", title: "chore: update OpenSSL 3.2.1",  status: "MERGÉ",  ok: true  },
        { id: "#253", title: "sec: XSS in search endpoint",  status: "OUVERT", ok: false },
        { id: "#255", title: "fix: SSRF protection headers",  status: "REVIEW", ok: null  },
      ].map(({ id, title, status, ok }) => (
        <div key={id} className="flex items-center gap-3">
          <span className="text-[#4488ff] w-8 flex-shrink-0">{id}</span>
          <span className="text-[#888] flex-1 truncate">{title}</span>
          <span
            className="text-[8px] tracking-widest flex-shrink-0"
            style={{ color: ok === true ? "#00cc8a" : ok === false ? "#ff4444" : "#ff9900" }}
          >
            {status}
          </span>
        </div>
      ))}
    </div>
  ),

  t5: (
    <div className="space-y-1.5 text-[10px] font-mono">
      {[
        { check: "SAST",    label: "Static analysis",   ok: true,  note: "0 vulnérabilités" },
        { check: "DEPS",    label: "Dependencies",      ok: true,  note: "CVE database OK" },
        { check: "SECRETS", label: "Secret scanning",   ok: true,  note: "Aucun secret exposé" },
        { check: "HEADERS", label: "Security headers",  ok: false, note: "X-Frame-Options absent" },
        { check: "DAST",    label: "Dynamic scan",      ok: true,  note: "API endpoints clean" },
      ].map(({ check, ok, note }) => (
        <div key={check} className="flex items-center gap-3">
          <span
            className="w-4 flex-shrink-0"
            style={{ color: ok ? "#00cc8a" : "#ff9900" }}
          >
            {ok ? "✓" : "⚠"}
          </span>
          <span className="text-[var(--text-subtle)] w-16 flex-shrink-0 text-[8px] uppercase tracking-widest">{check}</span>
          <span className="text-[#666]">{note}</span>
        </div>
      ))}
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
        <span className="ml-2 text-[8px] text-[var(--text-subtle)] uppercase tracking-[0.2em] truncate">
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
            <p className="text-[8px] text-[var(--text-subtle)] uppercase tracking-[0.2em]">
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
            <p className="text-[var(--text-muted)] text-[11px]">{tx(`${sid}.thinking`)}</p>
          </div>
        )}

        {/* Visual data block */}
        {step >= 3 && (
          <div
            className="pl-3 border-l py-1"
            style={{ borderColor: accent + "40" }}
          >
            {DATA_BLOCKS[sid]}
          </div>
        )}

        {/* Result */}
        {step >= 4 && (
          <p className="font-bold text-[11px]" style={{ color: accent }}>
            ✓ {tx(`${sid}.result`)}
          </p>
        )}

        {/* Blinking cursor while animating */}
        {step < 4 && <span className="terminal-cursor" />}
      </div>
    </div>
  );
}
