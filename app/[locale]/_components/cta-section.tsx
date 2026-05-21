"use client";

import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";

export function CTASection() {
  const t = useTranslations("cta");

  return (
    <section
      style={{
        background: "var(--bjhunt-bg)",
        borderTop: "1px solid var(--bjhunt-border)",
      }}
    >
      <div
        className="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-6 px-6 md:px-8"
        style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem" }}
      >
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

        <h2
          style={{
            fontFamily: "var(--bjhunt-font-mono-700)",
            fontSize: "clamp(28px, 4vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02rem",
            textTransform: "uppercase",
            color: "var(--bjhunt-text)",
            textAlign: "center",
          }}
        >
          {t("title")}{" "}
          <span style={{ color: "var(--bjhunt-brand)" }}>
            {t("titleHighlight")}
          </span>
        </h2>

        <p
          className="max-w-[520px] text-center"
          style={{
            fontFamily: "var(--bjhunt-font-sans)",
            fontSize: "14px",
            lineHeight: "20px",
            color: "var(--bjhunt-text-secondary)",
          }}
        >
          {t("description")}
        </p>

        <Link
          href="/beta"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: "52px",
            padding: "0 2rem",
            background: "var(--bjhunt-cta-primary)",
            color: "var(--bjhunt-text-inverted)",
            fontFamily: "var(--bjhunt-font-mono-500)",
            fontSize: "12px",
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderRadius: 0,
            textDecoration: "none",
            border: "none",
            cursor: "pointer",
            transition: "background-color 0.15s",
            marginTop: "8px",
          }}
        >
          {t("cta")}
        </Link>

        <p
          style={{
            fontFamily: "var(--bjhunt-font-mono-400)",
            fontSize: "11px",
            fontWeight: 400,
            letterSpacing: "0.04em",
            color: "var(--bjhunt-text-disabled)",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {t("note")}
        </p>
      </div>
    </section>
  );
}