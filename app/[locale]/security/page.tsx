import { getTranslations } from "next-intl/server";
import { Shield, FileText, Key, Lock, Container, CheckCircle } from "lucide-react";

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

export default async function SecurityPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "security" });

  const cards = [
    { icon: Shield, eyebrow: locale === "fr" ? "Isolation" : "Isolation", title: t("isolation.title"), description: t("isolation.description") },
    { icon: FileText, eyebrow: "Audit", title: t("auditTrails.title"), description: t("auditTrails.description") },
    { icon: Key, eyebrow: "SSO", title: t("sso.title"), description: t("sso.description") },
    { icon: Lock, eyebrow: locale === "fr" ? "Chiffrement" : "Encryption", title: t("encryption.title"), description: t("encryption.description") },
    { icon: Container, eyebrow: "Scope Guard", title: t("sandboxSecurity.title"), description: t("sandboxSecurity.description") },
    { icon: CheckCircle, eyebrow: locale === "fr" ? "Conformité" : "Compliance", title: t("compliance.title"), description: t("compliance.description") },
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
          <Eyebrow>[ {t("heroEyebrow")} ]</Eyebrow>
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
            {t("heroTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
          </h1>
          <p
            style={{
              fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
              color: "var(--bjhunt-text-muted)",
              fontSize: 14,
              lineHeight: "1.5rem",
              maxWidth: 560,
              marginTop: "1.5rem",
              marginBottom: 0,
            }}
          >
            {t("heroDescription")}
          </p>
        </div>
      </section>

      <section
        style={{
          borderTop: "1px solid var(--bjhunt-border)",
          paddingTop: "6.25rem",
          paddingBottom: "6.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 0,
            }}
          >
            {cards.map((card, i) => {
              const Icon = card.icon;
              const hasRightBorder = i % 3 !== 2;
              const hasBottomBorder = i < 3;
              return (
                <div
                  key={card.title}
                  style={{
                    padding: "2.75rem 2.5rem",
                    display: "flex",
                    flexDirection: "column" as const,
                    borderTop: i >= 3 ? "1px solid var(--bjhunt-border)" : "none",
                    borderRight: hasRightBorder ? "1px solid var(--bjhunt-border)" : "none",
                  }}
                >
                  <Eyebrow>[ {card.eyebrow} ]</Eyebrow>
                  <div style={{ marginTop: "1rem" }}>
                    <Icon style={{ width: 20, height: 20, color: "var(--bjhunt-text-muted)" }} />
                  </div>
                  <h3
                    style={{
                      fontFamily: "var(--bjhunt-font-mono)",
                      fontWeight: 700,
                      fontSize: 16,
                      lineHeight: 1.25,
                      letterSpacing: "-0.02rem",
                      textTransform: "uppercase",
                      margin: "1rem 0 0 0",
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                      color: "var(--bjhunt-text-muted)",
                      fontSize: 14,
                      lineHeight: "1.5rem",
                      marginTop: "0.75rem",
                      marginBottom: 0,
                    }}
                  >
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}