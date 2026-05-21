"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const HCAPTCHA_SITEKEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY ?? "";

function BetaFormContent() {
  const t = useTranslations("beta");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "true";

  const [formData, setFormData] = useState({ name: "", email: "", company: "", role: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(justRegistered);
  const [error, setError] = useState("");
  const [betaCount, setBetaCount] = useState<number | null>(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);
  const BETA_LIMIT = 100;

  useEffect(() => {
    const loadBetaCount = async () => {
      try {
        const response = await fetch("/api/beta", { cache: "no-store" });
        if (!response.ok) { setBetaCount(null); return; }
        const data = await response.json();
        setBetaCount(typeof (data as { count?: unknown }).count === "number" ? (data as { count: number }).count : null);
      } catch { setBetaCount(null); }
    };
    loadBetaCount();
  }, []);

  const spotsLeft = betaCount !== null ? Math.max(0, BETA_LIMIT - betaCount) : null;
  const progress = betaCount !== null ? Math.min(100, Math.round((betaCount / BETA_LIMIT) * 100)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (HCAPTCHA_SITEKEY && !captchaToken) { setError(t("captchaError")); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/beta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, captchaToken }) });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        captchaRef.current?.resetCaptcha(); setCaptchaToken("");
        throw new Error(payload.error || "Failed to submit");
      }
      setSubmitted(true);
      if (betaCount !== null) setBetaCount(betaCount + 1);
    } catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSubmitting(false); }
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.5rem",
    fontFamily: "var(--bjhunt-font-mono)",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.18em",
    color: "var(--bjhunt-text-muted)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid #ebebeb",
    background: "#ebebeb",
    borderRadius: 0,
    height: 40,
    padding: "0 0.75rem",
    fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
    fontSize: 14,
    lineHeight: "1.25rem",
    color: "var(--bjhunt-text)",
    outline: "none",
  };

  if (submitted) {
    return (
      <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 1200, width: "100%", padding: "0 1.25rem", textAlign: "center" as const }}>
          <div
            style={{
              width: 56,
              height: 56,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 2rem",
              border: "1px solid var(--bjhunt-border)",
              borderRadius: 0,
            }}
          >
            <Check style={{ width: 24, height: 24 }} />
          </div>
          <h1
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              lineHeight: 1.11,
              letterSpacing: "-0.02rem",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {t("requestRegistered")}
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 400, margin: "1rem auto 0" }}>
            {t("confirmationMsg")}
          </p>
          <Link
            href={`/${locale}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              color: "var(--bjhunt-text-muted)",
              textDecoration: "none",
              marginTop: "2.5rem",
            }}
          >
            <ArrowRight style={{ width: 12, height: 12, transform: "rotate(180deg)" }} /> {t("backHome")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh" }}>
      <section
        style={{
          borderBottom: "1px solid var(--bjhunt-border)",
          padding: "10rem 1.25rem 6.25rem",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
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
              [ {t("eyebrow")} ]
            </span>
            <span
              style={{
                display: "inline-flex",
                padding: "0.25rem 0.375rem",
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                borderRadius: 0,
                border: "1px solid var(--bjhunt-warning)",
                background: "var(--bjhunt-warning-tint)",
                color: "var(--bjhunt-warning)",
              }}
            >
              {t("limitedSeats")}
            </span>
          </div>
          <h1
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 5vw, 3rem)",
              lineHeight: 1,
              letterSpacing: "-0.02rem",
              textTransform: "uppercase",
              margin: 0,
            }}
          >
            {t("title")}
            <span style={{ color: "var(--bjhunt-text-muted)" }}>.</span>
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 560, marginTop: "1rem", marginBottom: 0 }}>
            {t("description")}
          </p>
        </div>
      </section>

      <section style={{ paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
          <div style={{ maxWidth: 640 }}>
            {betaCount !== null && (
              <div
                style={{
                  border: "1px solid var(--bjhunt-border)",
                  background: "var(--bjhunt-bg)",
                  padding: "1.25rem",
                  borderRadius: 0,
                  marginBottom: "2.5rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--bjhunt-text-muted)" }}>
                    {t("progressLabel")}
                  </span>
                  <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 14 }}>
                    {betaCount}<span style={{ color: "var(--bjhunt-text-disabled)" }}>/{BETA_LIMIT}</span>
                  </span>
                </div>
                <div style={{ height: 1, background: "var(--bjhunt-border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progress}%`, background: "var(--bjhunt-brand)", transition: "width 1s ease-out" }} />
                </div>
                <p style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: 13, lineHeight: 1.5, color: "var(--bjhunt-text-muted)", margin: "0.75rem 0 0 0", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)" }}>
                  <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--bjhunt-brand)" }} />
                  {spotsLeft !== null && spotsLeft > 0 ? t("spotsRemaining", { count: spotsLeft, limit: BETA_LIMIT }) : t("waitlistActive")}
                </p>
              </div>
            )}

            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[t("benefitScans"), t("benefitApi"), t("benefitReport"), t("benefitSupport")].map((item) => (
                <li key={item} style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", fontSize: 14, lineHeight: 1.5, color: "var(--bjhunt-text-muted)", fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)" }}>
                  <span style={{ fontSize: 12, flexShrink: 0, fontFamily: "var(--bjhunt-font-mono)", color: "var(--bjhunt-text-disabled)" }}>—</span>
                  {item}
                </li>
              ))}
            </ul>

            <div
              style={{
                border: "1px solid var(--bjhunt-border)",
                background: "var(--bjhunt-bg)",
                padding: "2.75rem 2.5rem",
                borderRadius: 0,
              }}
            >
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }} noValidate>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div>
                    <label htmlFor="beta-name" style={labelStyle}>{t("fullName")} *</label>
                    <input id="beta-name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder={t("namePlaceholder")} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor="beta-email" style={labelStyle}>{t("professionalEmail")} *</label>
                    <input id="beta-email" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder={t("emailPlaceholder")} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label htmlFor="beta-company" style={labelStyle}>{t("company")} <span style={{ color: "var(--bjhunt-text-disabled)" }}>({t("optional")})</span></label>
                  <input id="beta-company" type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} placeholder={t("companyPlaceholder")} style={inputStyle} />
                </div>

                <div>
                  <label htmlFor="beta-role" style={labelStyle}>{t("whyJoin")} *</label>
                  <textarea id="beta-role" required rows={4} value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder={t("whyJoinPlaceholder")} style={{ ...inputStyle, height: "auto", padding: "0.75rem", resize: "vertical" as const }} />
                </div>

                {HCAPTCHA_SITEKEY ? (
                  <div style={{ paddingTop: "0.5rem", overflowX: "auto" }}>
                    <HCaptcha sitekey={HCAPTCHA_SITEKEY} onVerify={(token) => setCaptchaToken(token)} onExpire={() => setCaptchaToken("")} onError={() => setCaptchaToken("")} ref={captchaRef} theme="light" />
                  </div>
                ) : (
                  <p style={{ margin: 0, fontFamily: "var(--bjhunt-font-mono)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--bjhunt-text-disabled)" }}>
                    {t("captchaDisabled")}
                  </p>
                )}

                {error && (
                  <div
                    role="alert"
                    aria-live="polite"
                    style={{
                      padding: "0.75rem 1rem",
                      fontSize: 13,
                      borderRadius: 0,
                      border: "1px solid var(--bjhunt-critical)",
                      background: "var(--bjhunt-critical-tint)",
                      color: "var(--bjhunt-critical)",
                    }}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    width: "100%",
                    height: 52,
                    fontFamily: "var(--bjhunt-font-mono)",
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: "0.875rem",
                    textTransform: "uppercase",
                    borderRadius: 0,
                    border: "none",
                    background: "#000",
                    color: "#fff",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.5 : 1,
                    marginTop: "0.5rem",
                  }}
                >
                  {submitting ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                  {submitting ? t("submitting") : t("requestAccess")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BetaPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bjhunt-bg)" }} />}>
      <BetaFormContent />
    </Suspense>
  );
}