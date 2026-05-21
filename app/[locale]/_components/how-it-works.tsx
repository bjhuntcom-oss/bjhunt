"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function HowItWorks() {
  const t = useTranslations("home.howItWorks");
  const tabs = t.raw("tabs") as Array<{ label: string; title: string; description: string }>;
  const [active, setActive] = useState(0);

  return (
    <section style={{ borderTop: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg)" }}>
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-8" style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div className="mb-2">
          <span style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text-muted)" }}>
            [ {t("eyebrow")} ]
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "clamp(1.75rem, 4vw, 3.75rem)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", letterSpacing: "-0.05rem", color: "var(--bjhunt-text)", marginBottom: "1rem" }}>
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>{t("titleHighlight")}</span>
        </h2>

        <div style={{ display: "flex", gap: "-1px", marginBottom: "-1px" }}>
          {tabs.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                fontFamily: "var(--bjhunt-font-mono-500)",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "12px 24px",
                border: "1px solid var(--bjhunt-border)",
                background: active === i ? "var(--bjhunt-text)" : "transparent",
                color: active === i ? "var(--bjhunt-bg)" : "var(--bjhunt-text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-terminal-bg)", padding: "32px", minHeight: "200px" }}>
          <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            STEP {active + 1}
          </div>
          <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "20px", fontWeight: 700, color: "var(--bjhunt-text)", marginBottom: "12px" }}>
            {tabs[active].title}
          </div>
          <div style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "14px", lineHeight: "24px", color: "var(--bjhunt-terminal-text)" }}>
            {tabs[active].description}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ marginTop: "-1px" }}>
          {tabs.map((tab, i) => (
            <div key={i} style={{ border: "1px solid var(--bjhunt-border)", padding: "24px 32px", background: "var(--bjhunt-bg)" }}>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "24px", fontWeight: 700, color: "var(--bjhunt-brand)", marginBottom: "4px" }}>
                {i + 1}
              </div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-500)", fontSize: "12px", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--bjhunt-text)", marginBottom: "4px" }}>
                {tab.label}
              </div>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "13px", lineHeight: "18px", color: "var(--bjhunt-text-secondary)" }}>
                {tab.description.slice(0, 100)}...
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
