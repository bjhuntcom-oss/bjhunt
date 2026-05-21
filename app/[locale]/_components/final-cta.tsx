"use client";

import { useTranslations } from "next-intl";

export function FinalCta() {
  const t = useTranslations("home.cta");

  return (
    <section style={{ borderTop: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-inverted)" }}>
      <div className="mx-auto w-full max-w-[1200px] px-6 md:px-8" style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div className="mb-2">
          <span style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-brand)" }}>
            [ {t("eyebrow")} ]
          </span>
        </div>
        <h2 style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "clamp(1.75rem, 4vw, 3.75rem)", fontWeight: 700, lineHeight: 1, textTransform: "uppercase", letterSpacing: "-0.05rem", color: "var(--bjhunt-text-inverted)", marginBottom: "1rem" }}>
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>{t("titleHighlight")}</span>
        </h2>
        <p className="mb-12" style={{ maxWidth: "560px", fontFamily: "var(--bjhunt-font-sans)", fontSize: "14px", lineHeight: "20px", color: "var(--bjhunt-text-muted)" }}>
          {t("description")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginBottom: "16px" }}>
          <a
            href="/beta"
            style={{
              fontFamily: "var(--bjhunt-font-mono-500)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0 2rem",
              height: "52px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--bjhunt-brand)",
              color: "var(--bjhunt-bg-inverted)",
              border: "none",
              cursor: "pointer",
              textDecoration: "none",
              transition: "background-color 0.15s",
            }}
          >
            {t("button")}
          </a>
          <a
            href="/contact"
            style={{
              fontFamily: "var(--bjhunt-font-mono-500)",
              fontSize: "12px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "0 2rem",
              height: "52px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              color: "var(--bjhunt-text-inverted)",
              border: "1px solid var(--bjhunt-border-strong)",
              cursor: "pointer",
              textDecoration: "none",
              transition: "border-color 0.15s",
            }}
          >
            Contact Sales
          </a>
        </div>

        <p style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)" }}>
          {t("note")}
        </p>
      </div>
    </section>
  );
}
