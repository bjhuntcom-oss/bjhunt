"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import "./globals.css";

const content = {
  en: {
    eyebrow: "404 / NOT FOUND",
    title: "Lost in cyberspace",
    subtitle:
      "The page you're looking for has vanished into the digital void. Let's get you back on track.",
    home: "Back to home",
    contact: "Contact support",
  },
  fr: {
    eyebrow: "404 / INTROUVABLE",
    title: "Perdu dans le cyberespace",
    subtitle:
      "La page que vous recherchez s'est volatilisée dans le néant numérique. Reprenons le chemin.",
    home: "Retour à l'accueil",
    contact: "Contacter le support",
  },
};

function getInitialLocale(): "en" | "fr" {
  if (typeof window !== "undefined") {
    return window.location.pathname.startsWith("/fr") ? "fr" : "en";
  }
  return "en";
}

/**
 * Global 404 — refonte 2026 §B9.
 *
 * Renders its own <html>/<body> shell because Next.js mounts global not-found
 * outside the locale layout. Tokens-only styling, no hardcoded hex.
 */
export default function GlobalNotFound() {
  const [locale] = useState<"en" | "fr">(getInitialLocale);
  const t = content[locale];
  const homePath = locale === "fr" ? "/fr" : "/en";

  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          backgroundColor: "var(--bjhunt-bg)",
          color: "var(--bjhunt-text)",
          fontFamily: "var(--bjhunt-font-sans)",
        }}
      >
        <main
          className="min-h-screen flex items-center justify-center px-6 py-16"
          style={{ backgroundColor: "var(--bjhunt-bg)" }}
        >
          <div
            className="w-full max-w-lg text-center"
            style={{
              backgroundColor: "var(--bjhunt-bg-surface)",
              border: "1px solid var(--bjhunt-border)",
              borderRadius: "var(--bjhunt-radius-md)",
              padding: 32,
            }}
          >
            <p
              className="font-mono uppercase"
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "var(--bjhunt-text-muted)",
                margin: 0,
              }}
            >
              {t.eyebrow}
            </p>
            <h1
              style={{
                fontFamily: "var(--bjhunt-font-display)",
                fontSize: "clamp(28px, 3vw, 36px)",
                fontWeight: 400,
                lineHeight: 1.11,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-text)",
                margin: "16px 0 12px",
              }}
            >
              {t.title}
            </h1>
            <p
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: 14,
                lineHeight: 1.6,
                color: "var(--bjhunt-text-muted)",
                margin: "0 0 32px",
              }}
            >
              {t.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={homePath}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: "var(--bjhunt-radius)",
                  border: "1px solid var(--bjhunt-border)",
                  backgroundColor: "transparent",
                  color: "var(--bjhunt-text)",
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {t.home}
                <ArrowUpRight style={{ width: 16, height: 16 }} />
              </Link>
              <Link
                href={`${homePath}/contact`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 16px",
                  borderRadius: "var(--bjhunt-radius)",
                  border: "1px solid var(--bjhunt-border)",
                  backgroundColor: "transparent",
                  color: "var(--bjhunt-text-muted)",
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                {t.contact}
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
