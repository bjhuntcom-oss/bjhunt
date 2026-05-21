"use client";

import { useTranslations } from "next-intl";

const CARD_KEYS = [
  "orchestration",
  "nlp",
  "reporting",
  "scoring",
  "security",
  "compliance",
] as const;

export function FeaturesSection() {
  const t = useTranslations("features");
  const fc = useTranslations("features.cards");

  return (
    <section
      style={{
        borderTop: "1px solid var(--bjhunt-border)",
        background: "var(--bjhunt-bg)",
      }}
    >
      <div
        className="mx-auto w-full max-w-[1200px] px-6 md:px-8"
        style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem" }}
      >
        <div className="mb-2">
          <span
            style={{
              fontFamily: "var(--bjhunt-font-mono-400)",
              fontSize: "11px",
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "var(--bjhunt-text-muted)",
            }}
          >
            [ {t("eyebrow")} ]
          </span>
        </div>

        <h2
          style={{
            fontFamily: "var(--bjhunt-font-mono-700)",
            fontSize: "24px",
            fontWeight: 700,
            lineHeight: 1.3,
            textTransform: "uppercase",
            letterSpacing: "-0.02rem",
            color: "var(--bjhunt-text)",
            marginBottom: "1rem",
          }}
        >
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>
            {t("titleHighlight")}
          </span>
        </h2>

        <p
          className="mb-10"
          style={{
            maxWidth: "560px",
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--bjhunt-text-secondary)",
          }}
        >
          {t("description")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "-1px",
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {CARD_KEYS.map((key) => (
            <div
              key={key}
              style={{
                border: "1px solid var(--bjhunt-border)",
                borderRadius: 0,
                background: "transparent",
                padding: "44px 40px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: "16px",
                  fontWeight: 700,
                  lineHeight: 1.25,
                  color: "var(--bjhunt-text)",
                }}
              >
                {fc(`${key}.title`)}
              </h3>
              <p
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: "13px",
                  lineHeight: 1.6,
                  color: "var(--bjhunt-text-secondary)",
                }}
              >
                {fc(`${key}.description`)}
              </p>
              <span
                style={{
                  fontFamily: "var(--bjhunt-font-mono-500)",
                  fontSize: "11px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--bjhunt-brand)",
                  marginTop: "8px",
                }}
              >
                EN SAVOIR PLUS →
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}