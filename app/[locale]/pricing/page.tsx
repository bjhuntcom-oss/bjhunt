import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Check, ChevronDown } from "lucide-react";

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

function PricingDiagram() {
  return (
    <svg width="100%" viewBox="0 0 480 140" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="478" height="138" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <rect x="1" y="1" width="478" height="32" fill="var(--bjhunt-bg-surface)" />
      <text x="240" y="21" textAnchor="middle" fontFamily="monospace" fontSize="9" fill="var(--bjhunt-text-muted)">CAPABILITY TIERS — SCALE WITH YOUR THREAT SURFACE</text>
      <rect x="40" y="55" width="120" height="60" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <text x="100" y="78" textAnchor="middle" fontFamily="monospace" fontSize="18" fontWeight="700" fill="var(--bjhunt-brand)">$100</text>
      <text x="100" y="100" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">PROFESSIONAL</text>
      <path d="M160 85h40" stroke="var(--bjhunt-border)" strokeWidth="1" strokeDasharray="4 2" />
      <polygon points="198,81 206,85 198,89" fill="var(--bjhunt-border)" />
      <rect x="200" y="55" width="120" height="60" stroke="var(--bjhunt-text)" strokeWidth="1.5" />
      <text x="260" y="78" textAnchor="middle" fontFamily="monospace" fontSize="18" fontWeight="700" fill="var(--bjhunt-text)">$500</text>
      <text x="260" y="100" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">BUSINESS</text>
      <path d="M320 85h40" stroke="var(--bjhunt-border)" strokeWidth="1" strokeDasharray="4 2" />
      <polygon points="358,81 366,85 358,89" fill="var(--bjhunt-border)" />
      <rect x="360" y="55" width="80" height="60" stroke="var(--bjhunt-text)" strokeWidth="1" opacity="0.5" />
      <text x="400" y="88" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="var(--bjhunt-text-muted)">CUSTOM</text>
      <text x="400" y="102" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">ENTERPRISE</text>
    </svg>
  );
}

function ValueDiagram() {
  return (
    <svg width="100%" viewBox="0 0 480 160" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="478" height="158" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <rect x="1" y="1" width="478" height="32" fill="var(--bjhunt-bg-surface)" />
      <text x="240" y="21" textAnchor="middle" fontFamily="monospace" fontSize="9" fill="var(--bjhunt-text-muted)">ROI — ONE AUDIT REPLACES 3 WEEKS OF MANUAL WORK</text>
      <rect x="40" y="55" width="100" height="80" fill="var(--bjhunt-bg-surface)" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <text x="90" y="80" textAnchor="middle" fontFamily="monospace" fontSize="24" fontWeight="700" fill="var(--bjhunt-critical)">120h</text>
      <text x="90" y="100" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">MANUAL AUDIT</text>
      <text x="90" y="115" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">AVG. TIME</text>
      <path d="M140 95h30" stroke="var(--bjhunt-brand)" strokeWidth="2" />
      <polygon points="168,91 176,95 168,99" fill="var(--bjhunt-brand)" />
      <rect x="176" y="55" width="100" height="80" fill="var(--bjhunt-brand)" opacity="0.05" stroke="var(--bjhunt-brand)" strokeWidth="1.5" />
      <text x="226" y="80" textAnchor="middle" fontFamily="monospace" fontSize="24" fontWeight="700" fill="var(--bjhunt-brand)">4min</text>
      <text x="226" y="100" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">BJHUNT 27B</text>
      <text x="226" y="115" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">AUDIT TIME</text>
      <rect x="316" y="55" width="124" height="80" stroke="var(--bjhunt-border)" strokeWidth="1" />
      <text x="378" y="78" textAnchor="middle" fontFamily="monospace" fontSize="20" fontWeight="700" fill="var(--bjhunt-success)">1,800x</text>
      <text x="378" y="100" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">FASTER</text>
      <text x="378" y="115" textAnchor="middle" fontFamily="monospace" fontSize="8" fill="var(--bjhunt-text-muted)">3.2% FP RATE</text>
    </svg>
  );
}

const PLANS = [
  { key: "professional", featured: false, href: "/beta" },
  { key: "business", featured: true, href: "/beta" },
  { key: "enterprise", featured: false, href: "/contact" },
] as const;

const COMPARISON_ROWS = [
  { feature: "Audits per month", professional: "2", business: "20", enterprise: "Unlimited" },
  { feature: "IPs / targets", professional: "1 IP / target", business: "3+ IPs / targets", enterprise: "Unlimited" },
  { feature: "Compliance frameworks", professional: "5 core", business: "13 full", enterprise: "13 + custom" },
  { feature: "PKCS#7 signed reports", professional: true, business: true, enterprise: true },
  { feature: "RFC 3161 timestamping", professional: false, business: true, enterprise: true },
  { feature: "Precision scoring (CVSS v4 + EPSS + KEV + DREAD)", professional: true, business: true, enterprise: true },
  { feature: "Real-time streaming (12 typed events)", professional: true, business: true, enterprise: true },
  { feature: "Attack path chaining", professional: true, business: true, enterprise: true },
  { feature: "REST API access", professional: true, business: true, enterprise: true },
  { feature: "Webhooks & SDK", professional: false, business: true, enterprise: true },
  { feature: "Secure sharing & collaborative canvas", professional: false, business: true, enterprise: true },
  { feature: "SSO/SAML integration", professional: false, business: false, enterprise: true },
  { feature: "Custom retention policy", professional: false, business: false, enterprise: true },
  { feature: "Guaranteed SLA", professional: false, business: false, enterprise: true },
  { feature: "Dedicated support engineer", professional: false, business: false, enterprise: true },
  { feature: "Custom integrations", professional: false, business: false, enterprise: true },
  { feature: "On-premise deployment option", professional: false, business: false, enterprise: true },
  { feature: "Support", professional: "Email", business: "Priority email", enterprise: "Dedicated Slack" },
];

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pricing" });
  const isFr = locale === "fr";

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)" }}>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid var(--bjhunt-border)", padding: "10rem 1.25rem 6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Eyebrow>[ {t("heroEyebrow")} ]</Eyebrow>
          <h1 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 5vw, 3rem)", lineHeight: 1, letterSpacing: "-0.02rem", textTransform: "uppercase", marginTop: "1rem", marginBottom: 0 }}>
            {t("heroTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("heroHighlight")}</span>
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 560, marginTop: "1rem", marginBottom: 0 }}>
            {t("heroDescription")}
          </p>
        </div>
      </section>

      {/* Pricing Diagram */}
      <section style={{ borderTop: "1px solid var(--bjhunt-border)", padding: "4rem 1.25rem" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <PricingDiagram />
        </div>
      </section>

      {/* Value Diagram */}
      <section style={{ borderTop: "1px solid var(--bjhunt-border)", padding: "4rem 1.25rem", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <ValueDiagram />
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "-1px" }}>
            {PLANS.map((plan) => {
              const planName = t(`${plan.key}.name`);
              const planPrice = t(`${plan.key}.price`);
              const planPeriod = t(`${plan.key}.period`);
              const planDesc = t(`${plan.key}.description`);
              const planBadge = t(`${plan.key}.badge`);
              const planCta = t(`${plan.key}.cta`);
              const features = t.raw(`${plan.key}.features`) as string[];

              return (
                <div
                  key={plan.key}
                  style={{
                    border: plan.featured ? "2px solid var(--bjhunt-brand)" : "1px solid var(--bjhunt-border)",
                    background: plan.featured ? "var(--bjhunt-bg-inverted, #000)" : "var(--bjhunt-bg)",
                    color: plan.featured ? "#fff" : "var(--bjhunt-text)",
                    padding: "2.75rem 2.5rem",
                    display: "flex",
                    flexDirection: "column" as const,
                  }}
                >
                  {planBadge && (
                    <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--bjhunt-brand)", marginBottom: "0.5rem" }}>
                      {planBadge}
                    </span>
                  )}
                  <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: plan.featured ? "rgba(255,255,255,0.5)" : "var(--bjhunt-text-muted)" }}>
                    {planName.toUpperCase()}
                  </span>
                  <div style={{ marginTop: "1rem", display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                    <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 32, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02rem" }}>
                      {planPrice}
                    </span>
                    {planPeriod && (
                      <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, color: plan.featured ? "rgba(255,255,255,0.5)" : "var(--bjhunt-text-muted)" }}>
                        {planPeriod}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", fontSize: 14, lineHeight: "1.5rem", color: plan.featured ? "rgba(255,255,255,0.6)" : "var(--bjhunt-text-muted)", marginTop: "0.5rem", marginBottom: 0 }}>
                    {planDesc}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: "1.5rem 0 0 0", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                    {features.map((f) => (
                      <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: 14, lineHeight: "1.5rem", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: plan.featured ? "rgba(255,255,255,0.8)" : "var(--bjhunt-text-secondary)" }}>
                        <Check style={{ width: 16, height: 16, flexShrink: 0, color: plan.featured ? "#f80" : "#49a147" }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: "auto", paddingTop: "2rem" }}>
                    <Link
                      href={plan.href === "/beta" ? `/${locale}/beta` : `/${locale}/contact`}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", height: 40, width: "100%",
                        fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem",
                        textTransform: "uppercase", textDecoration: "none",
                        border: plan.featured ? "none" : "1px solid var(--bjhunt-border)",
                        background: plan.featured ? "var(--bjhunt-brand)" : "var(--bjhunt-bg)",
                        color: plan.featured ? "#000" : "var(--bjhunt-text)",
                      }}
                    >
                      {planCta}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ borderTop: "1px solid var(--bjhunt-border)", paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <Eyebrow>[ {t("compareEyebrow")} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {t("compareTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("compareHighlight")}</span>
            </h2>
          </div>

          <div style={{ marginTop: "2rem", borderTop: "1px solid var(--bjhunt-border)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
              <div style={{ padding: "1rem 0" }}></div>
              {["Professional", "Business", "Enterprise"].map((name) => (
                <div key={name} style={{ padding: "1rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--bjhunt-text-muted)", textAlign: "center" }}>{name}</div>
              ))}
            </div>

            {/* Audits */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
              <div style={{ padding: "0.75rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text)" }}>{t("categories.scans")}</div>
              <div></div><div></div><div></div>
            </div>
            {COMPARISON_ROWS.slice(0, 2).map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
                <div style={{ padding: "0.75rem 0", fontSize: 14, color: "var(--bjhunt-text-secondary)" }}>{row.feature}</div>
                <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>{row.professional}</div>
                <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>{row.business}</div>
                <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>{row.enterprise}</div>
              </div>
            ))}

            {/* Reports */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
              <div style={{ padding: "0.75rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text)" }}>{t("categories.reports")}</div>
              <div></div><div></div><div></div>
            </div>
            {COMPARISON_ROWS.slice(2, 7).map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
                <div style={{ padding: "0.75rem 0", fontSize: 14, color: "var(--bjhunt-text-secondary)" }}>{row.feature}</div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.professional === "boolean" ? (row.professional ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.professional}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.business === "boolean" ? (row.business ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.business}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.enterprise === "boolean" ? (row.enterprise ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.enterprise}</span>}
                </div>
              </div>
            ))}

            {/* API */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
              <div style={{ padding: "0.75rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text)" }}>{t("categories.api")}</div>
              <div></div><div></div><div></div>
            </div>
            {COMPARISON_ROWS.slice(7, 10).map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
                <div style={{ padding: "0.75rem 0", fontSize: 14, color: "var(--bjhunt-text-secondary)" }}>{row.feature}</div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.professional === "boolean" ? (row.professional ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.professional}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.business === "boolean" ? (row.business ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.business}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.enterprise === "boolean" ? (row.enterprise ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.enterprise}</span>}
                </div>
              </div>
            ))}

            {/* Enterprise */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
              <div style={{ padding: "0.75rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text)" }}>Enterprise</div>
              <div></div><div></div><div></div>
            </div>
            {COMPARISON_ROWS.slice(10, 16).map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
                <div style={{ padding: "0.75rem 0", fontSize: 14, color: "var(--bjhunt-text-secondary)" }}>{row.feature}</div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.professional === "boolean" ? (row.professional ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.professional}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.business === "boolean" ? (row.business ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.business}</span>}
                </div>
                <div style={{ padding: "0.75rem 0", textAlign: "center" }}>
                  {typeof row.enterprise === "boolean" ? (row.enterprise ? <Check style={{ width: 16, height: 16, margin: "0 auto", color: "#49a147" }} /> : <span style={{ color: "var(--bjhunt-text-muted)" }}>—</span>) : <span style={{ fontSize: 14, color: "var(--bjhunt-text)" }}>{row.enterprise}</span>}
                </div>
              </div>
            ))}

            {/* Support */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)", background: "var(--bjhunt-bg-surface, var(--bjhunt-bg))" }}>
              <div style={{ padding: "0.75rem 0", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--bjhunt-text)" }}>{t("categories.support")}</div>
              <div></div><div></div><div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--bjhunt-border)" }}>
              <div style={{ padding: "0.75rem 0", fontSize: 14, color: "var(--bjhunt-text-secondary)" }}>Support channel</div>
              <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>Email</div>
              <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>Priority email</div>
              <div style={{ padding: "0.75rem 0", fontSize: 14, textAlign: "center", color: "var(--bjhunt-text)" }}>Dedicated Slack</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ borderTop: "1px solid var(--bjhunt-border)", paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <Eyebrow>[ {t("faqEyebrow")} ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0 }}>
              {t("faqTitle")} <span style={{ color: "var(--bjhunt-brand)" }}>{t("faqHighlight")}</span>
            </h2>
          </div>
          <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--bjhunt-border)" }}>
            {[
              { q: isFr ? "Pourquoi pas de plan gratuit ?" : "Why no free plan?", a: isFr ? "BJHUNT est une plateforme offensive de classe entreprise. Chaque audit consume des ressources de calcul significatives via BJHUNT 27B. Nous ne proposons pas de plan gratuit parce que la qualité de nos résultats exige une infrastructure dédiée." : "BJHUNT is an enterprise-grade offensive platform. Each audit consumes significant compute resources via BJHUNT 27B. We don't offer a free plan because the quality of our results demands dedicated infrastructure." },
              { q: isFr ? "Puis-je changer de plan ?" : "Can I change plans?", a: isFr ? "Oui, upgrade ou downgrade à tout moment. La différence est calculée au prorata sur la période restante." : "Yes, upgrade or downgrade anytime. The difference is prorated on the remaining period." },
              { q: isFr ? "Qu'est-ce qui différencie Business de Professional ?" : "What differentiates Business from Professional?", a: isFr ? "Business inclut les 13 frameworks de conformité complets, l'horodatage RFC 3161, les webhooks, le canvas collaboratif, et 10x plus d'audits mensuelles avec 3+ IPs/cibles." : "Business includes all 13 compliance frameworks, RFC 3161 timestamping, webhooks, collaborative canvas, and 10x more monthly audits across 3+ IPs/targets." },
              { q: isFr ? "Les rapports sont-ils vérifiables par un auditeur externe ?" : "Are reports verifiable by an external auditor?", a: isFr ? "Oui. PKCS#7 signé, RFC 3161 timestampé, SHA-256 hashé. Acceptable par un QSA, un auditeur interne, ou un tribunal." : "Yes. PKCS#7 signed, RFC 3161 timestamped, SHA-256 hashed. Acceptable by a QSA, internal auditor, or court." },
              { q: isFr ? "Quels frameworks sont supportés ?" : "Which frameworks are supported?", a: isFr ? "OWASP Top 10, PCI-DSS v4.0, ISO 27001, SOC 2, NIST CSF, RGPD, NIS2, DORA, HIPAA, CIS Controls, MITRE ATT&CK — et plus à venir." : "OWASP Top 10, PCI-DSS v4.0, ISO 27001, SOC 2, NIST CSF, GDPR, NIS2, DORA, HIPAA, CIS Controls, MITRE ATT&CK — and more coming." },
              { q: isFr ? "Proposez-vous un déploiement on-premise ?" : "Do you offer on-premise deployment?", a: isFr ? "Oui, exclusivement sur le plan Enterprise. Contactez notre équipe commerciale pour discuter de votre infrastructure." : "Yes, exclusively on the Enterprise plan. Contact our sales team to discuss your infrastructure." },
            ].map((faq) => (
              <details key={faq.q} style={{ borderBottom: "1px solid var(--bjhunt-border)" }}>
                <summary style={{ display: "flex", cursor: "pointer", listStyle: "none", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1.25rem 0", fontSize: 16, fontWeight: 600, lineHeight: 1.5 }}>
                  <span>{faq.q}</span>
                  <ChevronDown style={{ width: 16, height: 16, flexShrink: 0, color: "var(--bjhunt-text-muted)" }} />
                </summary>
                <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 640, marginTop: 0, marginBottom: "1rem" }}>
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: "1px solid var(--bjhunt-border)", paddingTop: "6.25rem", paddingBottom: "6.25rem", background: "var(--bjhunt-bg-inverted, #000)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <Eyebrow>[ <span style={{ color: "var(--bjhunt-brand)" }}>{t("supportEyebrow")}</span> ]</Eyebrow>
          <div style={{ marginTop: "1rem" }}>
            <h2 style={{ fontFamily: "var(--bjhunt-font-mono)", fontWeight: 700, fontSize: "clamp(1.75rem, 3vw, 2.25rem)", lineHeight: 1.1, letterSpacing: "-0.02rem", textTransform: "uppercase", margin: 0, color: "#fff" }}>
              {t("supportTitle")}
            </h2>
          </div>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "rgba(255,255,255,0.5)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 560, marginTop: "1rem", marginBottom: 0 }}>
            {t("supportText")}
          </p>
          <Link href={`/${locale}/contact`} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", height: 40, padding: "0 1rem", fontFamily: "var(--bjhunt-font-mono)", fontSize: 12, fontWeight: 500, lineHeight: "0.875rem", textTransform: "uppercase", textDecoration: "none", border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", marginTop: "1.5rem" }}>
            {t("supportCta")} →
          </Link>
        </div>
      </section>
    </div>
  );
}
