// app/[locale]/investors/page.tsx
//
// BJHUNT 2026 refonte — body weight 400 (NOT 200), token colors,
// clean polyline (no fill area), ghost button.

"use client";

import { GrowthLineSVG } from "@/components/animations/growth-line";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";

export default function InvestorsPage() {
  return (
    <div style={{ background: "var(--bjhunt-2026-bg)" }}>
      {/* HERO */}
      <section
        className="py-16 md:py-24"
        style={{ borderBottom: "1px solid var(--bjhunt-2026-border)" }}
      >
        <div className="mx-auto w-full max-w-[1280px] px-6 md:px-8 lg:px-12">
          <p
            className="m-0 mb-4 font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            01 / Investisseurs
          </p>
          <h1
            className="m-0"
            style={{
              fontFamily: "var(--bjhunt-2026-font-display)",
              fontSize: "clamp(40px, 5vw, 60px)",
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-2026-text)",
            }}
          >
            Investir dans la
            <br />
            <em
              className="not-italic"
              style={{ color: "var(--bjhunt-2026-text-secondary)" }}
            >
              cybersecurite AI-First.
            </em>
          </h1>
        </div>
      </section>

      {/* KPI STRIP — 4 cells, hairline grid */}
      <section style={{ borderBottom: "1px solid var(--bjhunt-2026-border)" }}>
        <div className="mx-auto w-full max-w-[1280px]">
          <div
            className="grid grid-cols-2 gap-px md:grid-cols-4"
            style={{ background: "var(--bjhunt-2026-border)" }}
          >
            {[
              { value: "2026", label: "LANCEMENT" },
              { value: "Beta", label: "PHASE ACTUELLE" },
              { value: "10B€", label: "MARCHE ADRESSABLE" },
              { value: "0",    label: "FAUX POSITIFS" },
            ].map(({ value, label }) => (
              <div
                key={label}
                className="flex flex-col gap-1 p-6 md:p-8"
                style={{ background: "var(--bjhunt-2026-bg)" }}
              >
                <div
                  style={{
                    fontFamily: "var(--bjhunt-2026-font-mono)",
                    fontSize: 28,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: "var(--bjhunt-2026-text)",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </div>
                <div
                  className="font-mono uppercase"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.18em",
                    color: "var(--bjhunt-2026-text-muted)",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY BJHUNT + GROWTH POLYLINE */}
      <section style={{ borderBottom: "1px solid var(--bjhunt-2026-border)" }}>
        <div className="mx-auto grid w-full max-w-[1280px] grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col gap-6 px-6 py-12 md:px-8 md:py-16 lg:px-12">
            <p
              className="m-0 font-mono uppercase"
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                color: "var(--bjhunt-2026-text-muted)",
              }}
            >
              02 / Pourquoi BJHUNT
            </p>
            <h2
              className="m-0"
              style={{
                fontFamily: "var(--bjhunt-2026-font-display)",
                fontSize: "clamp(22px, 2.4vw, 24px)",
                fontWeight: 600,
                lineHeight: 1.33,
                letterSpacing: "-0.025em",
                color: "var(--bjhunt-2026-text)",
              }}
            >
              Le marche de la securite AI evolue. Nous sommes en avance.
            </h2>
            <ul className="m-0 flex flex-col gap-3 p-0" style={{ listStyle: "none" }}>
              {[
                "Detection CVE en temps reel sans agent",
                "API-first, integration CI/CD native",
                "Zero faux positifs grace au modele AI proprietaire",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <StatusDot state="success" />
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: 1.6,
                      color: "var(--bjhunt-2026-text-secondary)",
                    }}
                  >
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="flex items-center justify-center px-6 py-12 md:px-8 md:py-16 lg:px-12"
            style={{ borderTop: "1px solid var(--bjhunt-2026-border)", minHeight: 280 }}
          >
            <GrowthLineSVG className="w-full max-w-md" />
          </div>
        </div>
      </section>

      {/* INVESTOR CONTACT CTA */}
      <section className="py-16 md:py-20">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-4 px-6 md:px-8 lg:px-12">
          <p
            className="m-0 font-mono uppercase"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.18em",
              color: "var(--bjhunt-2026-text-muted)",
            }}
          >
            03 / Contact investisseurs
          </p>
          <h2
            className="m-0"
            style={{
              fontFamily: "var(--bjhunt-2026-font-display)",
              fontSize: "clamp(22px, 2.4vw, 24px)",
              fontWeight: 600,
              lineHeight: 1.33,
              letterSpacing: "-0.025em",
              color: "var(--bjhunt-2026-text)",
            }}
          >
            Interesse par BJHUNT ?
          </h2>
          <Button asChild variant="ghost" size="md">
            <a href="mailto:partner@bjhunt.com">Contacter l&apos;equipe →</a>
          </Button>
        </div>
      </section>
    </div>
  );
}
