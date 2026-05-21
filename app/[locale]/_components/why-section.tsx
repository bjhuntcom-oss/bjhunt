"use client";

import { useTranslations } from "next-intl";

function ShieldIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L6 12v12c0 11.1 7.68 21.48 18 24 10.32-2.52 18-12.9 18-24V12L24 4z" stroke="var(--bjhunt-text)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 24l4 4 8-8" stroke="var(--bjhunt-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="18" stroke="var(--bjhunt-text)" strokeWidth="2" />
      <path d="M24 14v10l7 4" stroke="var(--bjhunt-brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="var(--bjhunt-text)" strokeWidth="2" />
      <circle cx="24" cy="24" r="12" stroke="var(--bjhunt-text)" strokeWidth="1.5" opacity="0.5" />
      <circle cx="24" cy="24" r="5" stroke="var(--bjhunt-brand)" strokeWidth="2" />
      <circle cx="24" cy="24" r="1.5" fill="var(--bjhunt-brand)" />
    </svg>
  );
}

const ICONS = [ShieldIcon, ClockIcon, TargetIcon];

export function WhySection() {
  const t = useTranslations("home.why");
  const cards = t.raw("cards") as Array<{ stat: string; label: string }>;

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

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "-1px" }}>
          {cards.map((card, i) => {
            const Icon = ICONS[i];
            return (
              <div key={i} style={{ border: "1px solid var(--bjhunt-border)", padding: "44px 40px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <Icon />
                <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 700, lineHeight: 1, color: "var(--bjhunt-text)" }}>
                  {card.stat}
                </div>
                <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "14px", lineHeight: "20px", color: "var(--bjhunt-text-secondary)" }}>
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
