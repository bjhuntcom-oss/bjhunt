"use client";

import { useTranslations } from "next-intl";

function BrainIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4c-6 0-10 4-10 10 0 3 1 5 3 7l2 2v9h10v-9l2-2c2-2 3-4 3-7 0-6-4-10-10-10z" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M16 16c0-2 2-4 4-4s4 2 4 4" stroke="var(--bjhunt-brand)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 22h12M16 26h8" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.4" />
      <circle cx="17" cy="14" r="1" fill="var(--bjhunt-brand)" />
      <circle cx="23" cy="14" r="1" fill="var(--bjhunt-brand)" />
    </svg>
  );
}

function ChainIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="14" width="10" height="12" rx="0" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <rect x="15" y="14" width="10" height="12" rx="0" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <rect x="26" y="14" width="10" height="12" rx="0" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <path d="M14 20h1M25 20h1" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <path d="M8 18h2M8 22h2" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.3" />
      <path d="M30 18h2M30 22h2" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 4h16l8 8v24H8V4z" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M24 4v8h8" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M14 20h12M14 26h8" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.3" />
      <path d="M12 14l2 2 4-4" stroke="var(--bjhunt-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BullseyeIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.5" />
      <circle cx="20" cy="20" r="5" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="1.5" fill="var(--bjhunt-brand)" />
      <path d="M20 4v4M20 32v4M4 20h4M32 20h4" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.3" />
    </svg>
  );
}

function ShieldLockIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4L6 10v10c0 8 6 14 14 16 8-2 14-8 14-16V10L20 4z" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="15" y="18" width="10" height="8" rx="0" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <path d="M17 18v-3a3 3 0 016 0v3" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <circle cx="20" cy="22" r="1" fill="var(--bjhunt-brand)" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 28c0-4 3-7 6-7s6 3 6 7" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 24c0-6 4-11 10-11s10 5 10 11" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 20c0-9 6-16 14-16s14 7 14 16" stroke="var(--bjhunt-text)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 32c0-2 2-4 4-4s4 2 4 4" stroke="var(--bjhunt-brand)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 16c0-12 8-22 18-22s18 10 18 22" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.3" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = [<BrainIcon />, <ChainIcon />, <DocumentIcon />, <BullseyeIcon />, <ShieldLockIcon />, <FingerprintIcon />];

export function FeaturesGrid() {
  const t = useTranslations("home.featuresGrid");
  const features = t.raw("features") as Array<{ title: string; description: string }>;

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "-1px" }}>
          {features.map((feature, i) => (
            <div key={i} style={{ border: "1px solid var(--bjhunt-border)", padding: "44px 40px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {ICONS[i]}
              <h3 style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01rem", color: "var(--bjhunt-text)" }}>
                {feature.title}
              </h3>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "13px", lineHeight: "20px", color: "var(--bjhunt-text-secondary)" }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
