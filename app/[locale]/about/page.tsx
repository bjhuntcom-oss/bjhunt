import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        color: "var(--bjhunt-text-muted)",
        fontSize: 11,
        fontFamily: "var(--bjhunt-font-mono)",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.18em",
      }}
    >
      {children}
    </span>
  );
}

function DotPatternSVG({ opacity = 0.15 }: { opacity?: number }) {
  return (
    <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity }} aria-hidden="true">
      <defs>
        <pattern id="dotGrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.5" fill="var(--bjhunt-text)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dotGrid)" />
    </svg>
  );
}

function DifferenceDiagram() {
  return (
    <div style={{ position: "relative", background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)" }}>
      <DotPatternSVG opacity={0.08} />
      <svg width="100%" viewBox="0 0 960 280" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "relative", shapeRendering: "geometricPrecision" }}>
        <rect x="0" y="0" width="960" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="480" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">THE BJHUNT DIFFERENCE — WHY WE BUILT THIS</text>

        <rect x="40" y="56" width="260" height="180" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <rect x="40" y="56" width="260" height="28" fill="var(--bjhunt-bg-surface)" />
        <text x="170" y="74" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text-muted)" fontWeight="700">THE PROBLEM</text>

        <text x="60" y="108" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">Fragmented toolchain</text>
        <text x="60" y="132" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">Manual report writing</text>
        <text x="60" y="156" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">Weeks of lead time</text>
        <text x="60" y="180" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">Inconsistent quality</text>
        <text x="60" y="204" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">No evidence chain</text>

        <path d="M300 146h60" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
        <polygon points="358,142 366,146 358,150" fill="var(--bjhunt-brand)" />

        <rect x="370" y="56" width="220" height="180" stroke="var(--bjhunt-brand)" strokeWidth="1.5" fill="var(--bjhunt-bg)" />
        <rect x="370" y="56" width="220" height="28" fill="var(--bjhunt-brand)" opacity="0.06" />
        <text x="480" y="74" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">BJHUNT 27B</text>

        <text x="390" y="108" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)">Single prompt interface</text>
        <text x="390" y="132" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)">Auto-generated reports</text>
        <text x="390" y="156" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)">Minutes, not weeks</text>
        <text x="390" y="180" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)">Consistent quality</text>
        <text x="390" y="204" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-brand)">SHA-256 evidence chain</text>

        <path d="M590 146h60" stroke="var(--bjhunt-border)" strokeWidth="1" strokeDasharray="4 2" />
        <polygon points="648,142 656,146 648,150" fill="var(--bjhunt-border)" />

        <rect x="660" y="56" width="260" height="180" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <rect x="660" y="56" width="260" height="28" fill="var(--bjhunt-bg-surface)" />
        <text x="790" y="74" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-text-muted)" fontWeight="700">RESULT</text>

        <text x="690" y="116" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="36" fontWeight="700" fill="var(--bjhunt-brand)">1,800x</text>
        <text x="690" y="140" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text-muted)">FASTER DELIVERY</text>

        <text x="690" y="176" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">3.2% false positive rate</text>
        <text x="690" y="200" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">PKCS#7 signed output</text>
        <text x="690" y="224" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)">14 compliance frameworks</text>
      </svg>
    </div>
  );
}

function ValuesDiagram() {
  return (
    <div style={{ position: "relative", background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)" }}>
      <DotPatternSVG opacity={0.06} />
      <svg width="100%" viewBox="0 0 960 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "relative", shapeRendering: "geometricPrecision" }}>
        <rect x="0" y="0" width="960" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="480" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">CORE VALUES — WHAT DRIVES EVERY DECISION</text>

        <rect x="40" y="56" width="280" height="124" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <text x="180" y="88" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="28" fontWeight="700" fill="var(--bjhunt-brand)">01</text>
        <text x="180" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="12" fill="var(--bjhunt-text)" fontWeight="700">PRECISION</text>
        <text x="180" y="136" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">3.2% false positive rate</text>
        <text x="180" y="156" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Court-grade evidence chain</text>
        <text x="180" y="172" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Every finding reproducible</text>

        <rect x="340" y="56" width="280" height="124" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <text x="480" y="88" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="28" fontWeight="700" fill="var(--bjhunt-brand)">02</text>
        <text x="480" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="12" fill="var(--bjhunt-text)" fontWeight="700">AUTONOMY</text>
        <text x="480" y="136" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">One prompt replaces weeks</text>
        <text x="480" y="156" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Zero configuration needed</text>
        <text x="480" y="172" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Self-healing execution</text>

        <rect x="640" y="56" width="280" height="124" stroke="var(--bjhunt-border)" strokeWidth="1" fill="var(--bjhunt-bg)" />
        <text x="780" y="88" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="28" fontWeight="700" fill="var(--bjhunt-brand)">03</text>
        <text x="780" y="112" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="12" fill="var(--bjhunt-text)" fontWeight="700">TRUST</text>
        <text x="780" y="136" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">PKCS#7 signed reports</text>
        <text x="780" y="156" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Fail-closed scope guard</text>
        <text x="780" y="172" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="10" fill="var(--bjhunt-text-muted)">Immutable audit trail</text>
      </svg>
    </div>
  );
}

function TimelineSVG() {
  return (
    <div style={{ position: "relative", background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)" }}>
      <DotPatternSVG opacity={0.06} />
      <svg width="100%" viewBox="0 0 960 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: "relative", shapeRendering: "geometricPrecision" }}>
        <rect x="0" y="0" width="960" height="36" fill="var(--bjhunt-bg)" />
        <circle cx="18" cy="18" r="5" fill="var(--bjhunt-critical)" />
        <circle cx="38" cy="18" r="5" fill="var(--bjhunt-warning)" />
        <circle cx="58" cy="18" r="5" fill="var(--bjhunt-success)" />
        <text x="480" y="24" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="10" fill="var(--bjhunt-text)" fontWeight="600">OUR JOURNEY — FROM PROBLEM TO PLATFORM</text>

        <line x1="80" y1="100" x2="880" y2="100" stroke="var(--bjhunt-border)" strokeWidth="1" />

        <circle cx="120" cy="100" r="6" fill="var(--bjhunt-brand)" />
        <text x="120" y="76" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">2023</text>
        <text x="120" y="128" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="9" fill="var(--bjhunt-text-muted)">Problem identified</text>
        <text x="120" y="144" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="8" fill="var(--bjhunt-text-muted)">Fragmented security tools</text>

        <circle cx="320" cy="100" r="6" fill="var(--bjhunt-brand)" />
        <text x="320" y="76" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">2024</text>
        <text x="320" y="128" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="9" fill="var(--bjhunt-text-muted)">Engine development</text>
        <text x="320" y="144" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="8" fill="var(--bjhunt-text-muted)">38 specialist personas</text>

        <circle cx="520" cy="100" r="6" fill="var(--bjhunt-brand)" />
        <text x="520" y="76" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">2025</text>
        <text x="520" y="128" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="9" fill="var(--bjhunt-text-muted)">Platform launch</text>
        <text x="520" y="144" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="8" fill="var(--bjhunt-text-muted)">BJHUNT 27B deployed</text>

        <circle cx="720" cy="100" r="6" fill="var(--bjhunt-brand)" />
        <text x="720" y="76" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">2026</text>
        <text x="720" y="128" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="9" fill="var(--bjhunt-text-muted)">Enterprise scale</text>
        <text x="720" y="144" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="8" fill="var(--bjhunt-text-muted)">Global deployment</text>

        <circle cx="880" cy="100" r="6" fill="var(--bjhunt-brand)" opacity="0.4" />
        <text x="880" y="76" textAnchor="middle" fontFamily="var(--bjhunt-font-mono, monospace)" fontSize="9" fill="var(--bjhunt-brand)" fontWeight="700">NOW</text>
        <text x="880" y="128" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="9" fill="var(--bjhunt-text-muted)">Continuous evolution</text>
        <text x="880" y="144" textAnchor="middle" fontFamily="var(--bjhunt-font-sans, sans-serif)" fontSize="8" fill="var(--bjhunt-text-muted)">Always improving</text>
      </svg>
    </div>
  );
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about" });
  const isFr = locale === "fr";

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid var(--bjhunt-border)", padding: "10rem 1.25rem 6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {t("heroEyebrow")} ]</Eyebrow>
          <h1 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05, letterSpacing: "-0.02rem", textTransform: "uppercase", marginTop: "1rem", marginBottom: "1.5rem" }}>
            {t("heroTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", color: "var(--bjhunt-text-muted)", fontSize: 16, lineHeight: "1.6rem", maxWidth: 640, marginBottom: "2.5rem" }}>
            {t("heroDescription")}
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href={`/${locale}/beta`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 48, padding: "0 1.5rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, textTransform: "uppercase",
                border: "none", background: "var(--bjhunt-brand)", color: "var(--bjhunt-text-inverted)", textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
            >
              {isFr ? "Accès anticipé" : "Early Access"}
            </Link>
            <Link
              href={`/${locale}/contact`}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", height: 48, padding: "0 1.5rem",
                fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, textTransform: "uppercase",
                border: "1px solid var(--bjhunt-border)", background: "transparent", color: "var(--bjhunt-text)", textDecoration: "none",
                transition: "border-color 0.15s ease",
              }}
            >
              {isFr ? "Contacter" : "Contact"}
            </Link>
          </div>
        </div>
      </section>

      {/* Difference Diagram */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <DifferenceDiagram />
        </div>
      </section>

      {/* Mission */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {t("mission.eyebrow")} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {t("mission.title")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("mission.titleHighlight")}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", color: "var(--bjhunt-text-muted)", fontSize: 16, lineHeight: "1.6rem", maxWidth: 720, marginTop: "1.5rem" }}>
            {t("mission.description")}
          </p>
        </div>
      </section>

      {/* Values */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {isFr ? "VALEURS" : "VALUES"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {isFr ? "Trois principes," : "Three principles,"}{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{isFr ? "une mission." : "one mission."}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", color: "var(--bjhunt-text-muted)", fontSize: 16, lineHeight: "1.6rem", maxWidth: 720, marginTop: "1.5rem", marginBottom: "2.5rem" }}>
            {isFr
              ? "Chaque décision chez BJHUNT est guidée par trois valeurs fondamentales. La précision dans chaque finding, l'autonomie dans l'exécution, et la confiance dans chaque rapport livré."
              : "Every decision at BJHUNT is guided by three core values. Precision in every finding, autonomy in execution, and trust in every delivered report."}
          </p>
          <ValuesDiagram />
        </div>
      </section>

      {/* Stats */}
      <section style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", borderTop: "1px solid var(--bjhunt-border)", borderBottom: "1px solid var(--bjhunt-border)" }}>
            {[
              { value: "27B", label: isFr ? "Paramètres" : "Parameters" },
              { value: "2.4M+", label: isFr ? "Documents" : "Documents" },
              { value: "500K", label: isFr ? "Contexte RAG" : "RAG Context" },
              { value: "3.2%", label: isFr ? "Taux de FP" : "FP Rate" },
            ].map((stat, index) => (
              <div
                key={stat.value}
                style={{
                  padding: "3rem 2rem",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  borderRight: index < 3 ? "1px solid var(--bjhunt-border)" : "none",
                  transition: "background-color 0.15s ease",
                }}
              >
                <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 36, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02rem", color: "var(--bjhunt-brand)" }}>
                  {stat.value}
                </span>
                <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--bjhunt-text-muted)", marginTop: "0.75rem" }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding: "6.25rem 1.25rem", borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {isFr ? "NOTRE PARCOURS" : "OUR JOURNEY"} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {isFr ? "Du problème" : "From problem"}{" "}
              <span style={{ color: "var(--bjhunt-brand)" }}>{isFr ? "à la plateforme." : "to platform."}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", color: "var(--bjhunt-text-muted)", fontSize: 16, lineHeight: "1.6rem", maxWidth: 720, marginTop: "1.5rem", marginBottom: "2.5rem" }}>
            {isFr
              ? "Notre parcours a commencé par une frustration partagée par tous les professionnels de la sécurité : des outils fragmentés, des rapports manuels, et des délais interminables. BJHUNT est né de la conviction qu'il devait exister une meilleure façon."
              : "Our journey started with a frustration shared by every security professional: fragmented tools, manual reports, and endless lead times. BJHUNT was born from the conviction that there had to be a better way."}
          </p>
          <TimelineSVG />
        </div>
      </section>

      {/* Team */}
      <section style={{ padding: "6.25rem 1.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {t("team.eyebrow")} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.5rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {t("team.title")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("team.titleHighlight")}</span>
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans)", color: "var(--bjhunt-text-muted)", fontSize: 16, lineHeight: "1.6rem", maxWidth: 720, marginTop: "1.5rem" }}>
            {t("team.description")}
          </p>
        </div>
      </section>
    </div>
  );
}
