import { Link } from "@/i18n/routing";

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

export default async function InvestorsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isFr = locale === "fr";

  const stats = [
    { value: "2026", label: "LAUNCH" },
    { value: "Beta", label: "CURRENT PHASE" },
    { value: "10B€", label: "ADDRESSABLE MARKET" },
    { value: "0", label: "FALSE POSITIVES" },
  ];

  const points = isFr
    ? [
        "Détection CVE en temps réel sans agents",
        "API-first, intégration native CI/CD",
        "Zéro faux positifs avec le modèle propriétaire",
      ]
    : [
        "Real-time CVE detection without agents",
        "API-first, native CI/CD integration",
        "Zero false positives with proprietary AI model",
      ];

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}>
      <section
        style={{
          borderBottom: "1px solid var(--bjhunt-border)",
          padding: "10rem 1.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[INVESTORS]</Eyebrow>
          <h1
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 5vw, 3rem)",
              lineHeight: 1,
              letterSpacing: "-0.02rem",
              textTransform: "uppercase",
              marginTop: "1rem",
              marginBottom: 0,
            }}
          >
            {isFr ? "Investissez dans la" : "Invest in the"}
            <br />
            <span style={{ color: "#f80" }}>{isFr ? "sécurité IA." : "AI-first security."}</span>
          </h1>
        </div>
      </section>

      <section style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              borderTop: "1px solid var(--bjhunt-border)",
              borderBottom: "1px solid var(--bjhunt-border)",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: "2.75rem 2.5rem",
                  display: "flex",
                  flexDirection: "column" as const,
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center" as const,
                  borderRight: i < stats.length - 1 ? "1px solid var(--bjhunt-border)" : "none",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: "-0.02rem",
                    color: "#f80",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    color: "var(--bjhunt-text-muted)",
                    marginTop: "0.5rem",
                  }}
                >
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          borderTop: "1px solid var(--bjhunt-border)",
          borderBottom: "1px solid var(--bjhunt-border)",
          paddingTop: "6.25rem",
          paddingBottom: "6.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <Eyebrow>[WHY BJHUNT]</Eyebrow>
          <div style={{ marginTop: "0.75rem" }}>
            <h2
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02rem",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {isFr ? "Le marché de la sécurité IA évolue." : "The AI security market is evolving."}
              <br />
              <span style={{ color: "#f80" }}>{isFr ? "Nous sommes en avance." : "We are ahead."}</span>
            </h2>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {points.map((point) => (
              <li key={point} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#49a147", marginTop: 6, flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", fontSize: 14, lineHeight: 1.6, color: "var(--bjhunt-text-secondary)" }}>
                  {point}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        style={{
          paddingTop: "6.25rem",
          paddingBottom: "6.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <Eyebrow>[INVESTOR CONTACT]</Eyebrow>
          <div style={{ marginTop: "0.75rem" }}>
            <h2
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontWeight: 700,
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.02rem",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {isFr ? "Intéressé par BJHUNT ?" : "Interested in BJHUNT?"}
            </h2>
          </div>
          <a
            href="mailto:partner@bjhunt.com"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              padding: "0 1rem",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 12,
              fontWeight: 500,
              lineHeight: "0.875rem",
              textTransform: "uppercase",
              borderRadius: 0,
              textDecoration: "none",
              border: "1px solid var(--bjhunt-border)",
              background: "var(--bjhunt-bg)",
              color: "var(--bjhunt-text)",
              marginTop: "1.5rem",
            }}
          >
            {isFr ? "Contacter l'équipe" : "Contact the team"} →
          </a>
        </div>
      </section>
    </div>
  );
}