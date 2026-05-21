"use client";

import { useTranslations } from "next-intl";

function WebApiDiagram() {
  return (
    <svg width="100%" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "24px" }}>
      <rect x="40" y="20" width="240" height="160" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <rect x="60" y="40" width="200" height="20" fill="var(--bjhunt-bg-surface)" />
      <circle cx="74" cy="50" r="4" fill="var(--bjhunt-critical)" />
      <circle cx="88" cy="50" r="4" fill="var(--bjhunt-warning)" />
      <circle cx="102" cy="50" r="4" fill="var(--bjhunt-success)" />
      <rect x="60" y="72" width="80" height="8" fill="var(--bjhunt-text)" opacity="0.15" />
      <rect x="60" y="88" width="120" height="6" fill="var(--bjhunt-text)" opacity="0.1" />
      <rect x="60" y="100" width="100" height="6" fill="var(--bjhunt-text)" opacity="0.1" />
      <rect x="60" y="112" width="60" height="6" fill="var(--bjhunt-text)" opacity="0.1" />
      <rect x="180" y="80" width="80" height="60" stroke="var(--bjhunt-brand)" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x="220" y="114" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="8" fill="var(--bjhunt-brand)">XSS</text>
      <rect x="180" y="148" width="80" height="32" stroke="var(--bjhunt-critical)" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x="220" y="168" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="8" fill="var(--bjhunt-critical)">SQLi</text>
      <path d="M148 88h28" stroke="var(--bjhunt-brand)" strokeWidth="1" />
      <path d="M148 100h28" stroke="var(--bjhunt-critical)" strokeWidth="1" />
      <line x1="40" y1="180" x2="280" y2="180" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <text x="160" y="194" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="7" fill="var(--bjhunt-text-muted)">API ENDPOINTS SCANNED</text>
    </svg>
  );
}

function CloudDiagram() {
  return (
    <svg width="100%" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "24px" }}>
      <path d="M80 60c0-16 13-30 30-30 8 0 15 3 20 8 5-10 16-18 28-18 18 0 32 14 32 32 14 2 24 14 24 28 0 16-13 30-30 30H110c-17 0-30-14-30-30 0-8 3-15 8-20z" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <rect x="100" y="120" width="40" height="30" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <rect x="160" y="120" width="40" height="30" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <rect x="220" y="120" width="40" height="30" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <line x1="120" y1="150" x2="120" y2="170" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <line x1="180" y1="150" x2="180" y2="170" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <line x1="240" y1="150" x2="240" y2="170" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <line x1="120" y1="170" x2="240" y2="170" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <path d="M140 100v16" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <path d="M200 100v16" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <rect x="108" y="128" width="24" height="4" fill="var(--bjhunt-success)" opacity="0.6" />
      <rect x="168" y="128" width="24" height="4" fill="var(--bjhunt-warning)" opacity="0.6" />
      <rect x="228" y="128" width="24" height="4" fill="var(--bjhunt-critical)" opacity="0.6" />
      <circle cx="160" cy="70" r="8" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <path d="M157 70l2 2 4-4" stroke="var(--bjhunt-brand)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="160" y="188" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="7" fill="var(--bjhunt-text-muted)">INFRASTRUCTURE LAYERS</text>
    </svg>
  );
}

function ComplianceDiagram() {
  return (
    <svg width="100%" viewBox="0 0 320 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: "24px" }}>
      <rect x="80" y="20" width="160" height="140" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <rect x="80" y="20" width="160" height="24" fill="var(--bjhunt-bg-surface)" />
      <text x="160" y="36" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="8" fill="var(--bjhunt-text)" fontWeight="700">COMPLIANCE REPORT</text>
      <line x1="100" y1="60" x2="220" y2="60" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <path d="M100 76l6 6 12-12" stroke="var(--bjhunt-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="128" y="80" fontFamily="var(--bjhunt-font-mono)" fontSize="9" fill="var(--bjhunt-text)">OWASP Top 10</text>
      <path d="M100 96l6 6 12-12" stroke="var(--bjhunt-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="128" y="100" fontFamily="var(--bjhunt-font-mono)" fontSize="9" fill="var(--bjhunt-text)">PCI-DSS v4.0</text>
      <path d="M100 116l6 6 12-12" stroke="var(--bjhunt-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="128" y="120" fontFamily="var(--bjhunt-font-mono)" fontSize="9" fill="var(--bjhunt-text)">ISO 27001</text>
      <path d="M100 136l6 6 12-12" stroke="var(--bjhunt-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="128" y="140" fontFamily="var(--bjhunt-font-mono)" fontSize="9" fill="var(--bjhunt-text)">SOC 2 Type II</text>
      <rect x="248" y="30" width="40" height="50" stroke="var(--bjhunt-brand)" strokeWidth="1" strokeDasharray="3 2" />
      <text x="268" y="50" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="6" fill="var(--bjhunt-brand)">PKCS#7</text>
      <text x="268" y="62" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="6" fill="var(--bjhunt-brand)">SIGNED</text>
      <line x1="240" y1="55" x2="248" y2="55" stroke="var(--bjhunt-brand)" strokeWidth="1" />
      <text x="160" y="188" textAnchor="middle" fontFamily="var(--bjhunt-font-mono)" fontSize="7" fill="var(--bjhunt-text-muted)">13 FRAMEWORKS · ONE AUDIT</text>
    </svg>
  );
}

const DIAGRAMS = [<WebApiDiagram />, <CloudDiagram />, <ComplianceDiagram />];

export function UseCasesSection() {
  const t = useTranslations("home.useCases");
  const cards = t.raw("cards") as Array<{ title: string; description: string }>;

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
        <p className="mb-16" style={{ maxWidth: "560px", fontFamily: "var(--bjhunt-font-sans)", fontSize: "14px", lineHeight: "20px", color: "var(--bjhunt-text-secondary)" }}>
          {t("description")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "-1px" }}>
          {cards.map((card, i) => (
            <div key={i} style={{ border: "1px solid var(--bjhunt-border)", padding: "44px 40px", display: "flex", flexDirection: "column" }}>
              {DIAGRAMS[i]}
              <h3 style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "16px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "-0.01rem", color: "var(--bjhunt-text)", marginBottom: "8px" }}>
                {card.title}
              </h3>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "13px", lineHeight: "20px", color: "var(--bjhunt-text-secondary)", flex: 1 }}>
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
