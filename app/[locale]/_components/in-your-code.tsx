"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function InYourCode() {
  const t = useTranslations("home.inYourCode");
  const items = t.raw("items") as Array<{ title: string; description: string }>;
  const [active, setActive] = useState(0);

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
        <p className="mb-12" style={{ maxWidth: "560px", fontFamily: "var(--bjhunt-font-sans)", fontSize: "14px", lineHeight: "20px", color: "var(--bjhunt-text-secondary)" }}>
          {t("description")}
        </p>

        <div style={{ display: "flex", gap: "-1px", marginBottom: "-1px" }}>
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                fontFamily: "var(--bjhunt-font-mono-500)",
                fontSize: "12px",
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "12px 24px",
                border: "1px solid var(--bjhunt-border)",
                background: active === i ? "var(--bjhunt-text)" : "transparent",
                color: active === i ? "var(--bjhunt-bg)" : "var(--bjhunt-text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div style={{ border: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-terminal-bg)", padding: "32px", minHeight: "320px" }}>
          {active === 0 && (
            <div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                REST API
              </div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "13px", lineHeight: "22px", color: "var(--bjhunt-terminal-text)" }}>
                <div><span style={{ color: "var(--bjhunt-text-muted)" }}>POST</span> <span style={{ color: "var(--bjhunt-success)" }}>https://api.bjhunt.com/v1/audits</span></div>
                <div style={{ marginTop: "12px", color: "var(--bjhunt-text-muted)" }}>{"{"}</div>
                <div>&nbsp;&nbsp;<span style={{ color: "var(--bjhunt-warning)" }}>"target"</span>: <span style={{ color: "var(--bjhunt-success)" }}>"api.example.com"</span>,</div>
                <div>&nbsp;&nbsp;<span style={{ color: "var(--bjhunt-warning)" }}>"scope"</span>: <span style={{ color: "var(--bjhunt-success)" }}>"full"</span>,</div>
                <div>&nbsp;&nbsp;<span style={{ color: "var(--bjhunt-warning)" }}>"frameworks"</span>: [<span style={{ color: "var(--bjhunt-success)" }}>"owasp"</span>, <span style={{ color: "var(--bjhunt-success)" }}>"pci-dss"</span>],</div>
                <div>&nbsp;&nbsp;<span style={{ color: "var(--bjhunt-warning)" }}>"prompt"</span>: <span style={{ color: "var(--bjhunt-success)" }}>"Test authentication and API endpoints"</span></div>
                <div style={{ color: "var(--bjhunt-text-muted)" }}>{"}"}</div>
                <div style={{ marginTop: "16px", color: "var(--bjhunt-text-muted)" }}>{"// 202 Accepted — audit_id: aud_7f3k...9x2m"}</div>
              </div>
            </div>
          )}
          {active === 1 && (
            <div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                CLI
              </div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "13px", lineHeight: "22px", color: "var(--bjhunt-terminal-text)" }}>
                <div><span style={{ color: "var(--bjhunt-brand)" }}>$</span> <span style={{ color: "var(--bjhunt-success)" }}>bjhunt</span> scan <span style={{ color: "var(--bjhunt-text-muted)" }}>--target</span> api.example.com <span style={{ color: "var(--bjhunt-text-muted)" }}>--full</span></div>
                <div style={{ marginTop: "8px", color: "var(--bjhunt-text-muted)" }}>Initializing BJHUNT 27B...</div>
                <div style={{ color: "var(--bjhunt-success)" }}>✓ Target validated: api.example.com</div>
                <div style={{ color: "var(--bjhunt-success)" }}>✓ Scope: full (all endpoints)</div>
                <div style={{ color: "var(--bjhunt-success)" }}>✓ Frameworks: OWASP, PCI-DSS, ISO 27001</div>
                <div style={{ marginTop: "8px", color: "var(--bjhunt-text-muted)" }}>Launching audit...</div>
                <div style={{ marginTop: "4px" }}>
                  <span style={{ color: "var(--bjhunt-brand)" }}>→</span> Reconnaissance phase
                  <span style={{ color: "var(--bjhunt-text-muted)", marginLeft: "12px" }}>2,347 endpoints</span>
                </div>
                <div>
                  <span style={{ color: "var(--bjhunt-brand)" }}>→</span> Vulnerability analysis
                  <span style={{ color: "var(--bjhunt-text-muted)", marginLeft: "12px" }}>47 findings</span>
                </div>
                <div>
                  <span style={{ color: "var(--bjhunt-brand)" }}>→</span> Attack path chaining
                  <span style={{ color: "var(--bjhunt-text-muted)", marginLeft: "12px" }}>3 critical paths</span>
                </div>
                <div style={{ marginTop: "12px", color: "var(--bjhunt-success)" }}>✓ Complete. Reports signed and available.</div>
                <div style={{ color: "var(--bjhunt-text-muted)" }}>FP rate: 3.2% | Duration: 4m 23s</div>
              </div>
            </div>
          )}
          {active === 2 && (
            <div>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                DASHBOARD
              </div>
              <div style={{ border: "1px solid var(--bjhunt-border-strong)", padding: "24px", background: "var(--bjhunt-bg-surface)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", color: "var(--bjhunt-text)" }}>
                    AUDIT RESULTS
                  </div>
                  <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-success)", border: "1px solid var(--bjhunt-success)", padding: "2px 8px" }}>
                    COMPLETED
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: "16px", marginBottom: "20px" }}>
                  <div style={{ border: "1px solid var(--bjhunt-border)", padding: "12px" }}>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "24px", fontWeight: 700, color: "var(--bjhunt-critical)" }}>3</div>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "10px", textTransform: "uppercase", color: "var(--bjhunt-text-muted)" }}>Critical</div>
                  </div>
                  <div style={{ border: "1px solid var(--bjhunt-border)", padding: "12px" }}>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "24px", fontWeight: 700, color: "var(--bjhunt-warning)" }}>8</div>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "10px", textTransform: "uppercase", color: "var(--bjhunt-text-muted)" }}>High</div>
                  </div>
                  <div style={{ border: "1px solid var(--bjhunt-border)", padding: "12px" }}>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "24px", fontWeight: 700, color: "var(--bjhunt-info)" }}>12</div>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "10px", textTransform: "uppercase", color: "var(--bjhunt-text-muted)" }}>Medium</div>
                  </div>
                  <div style={{ border: "1px solid var(--bjhunt-border)", padding: "12px" }}>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "24px", fontWeight: 700, color: "var(--bjhunt-brand)" }}>3.2%</div>
                    <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "10px", textTransform: "uppercase", color: "var(--bjhunt-text-muted)" }}>FP Rate</div>
                  </div>
                </div>
                <div style={{ fontFamily: "var(--bjhunt-font-mono-400)", fontSize: "11px", color: "var(--bjhunt-text-muted)" }}>
                  Target: api.example.com | Duration: 4m 23s | Frameworks: 13
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3" style={{ marginTop: "-1px" }}>
          {items.map((item, i) => (
            <div key={i} style={{ border: "1px solid var(--bjhunt-border)", padding: "24px 32px", background: "var(--bjhunt-bg)" }}>
              <div style={{ fontFamily: "var(--bjhunt-font-mono-700)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--bjhunt-text)", marginBottom: "4px" }}>
                {item.title}
              </div>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: "13px", lineHeight: "18px", color: "var(--bjhunt-text-secondary)" }}>
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
