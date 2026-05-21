"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Check, AlertCircle, Loader2, ChevronDown } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setError(t("captchaError"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("genericError"));
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t("connectionError"));
    }
    setLoading(false);
    setCaptchaToken("");
    captchaRef.current?.resetCaptcha();
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isFr = typeof document !== "undefined" && document.documentElement.lang === "fr";

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
            {t("messageSent")}
          </h1>
          <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", marginTop: "1rem", marginBottom: 0 }}>
            {t("confirmationMsg")} {formData.email} {t("within48h")}
          </p>
          <a
            href="/"
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
              marginTop: "2rem",
            }}
          >
            {t("backHome")} →
          </a>
        </div>
      </div>
    );
  }

  const faqs = [
    { q: isFr ? "Quels services proposez-vous ?" : "What services do you offer?", a: isFr ? "BJHUNT propose des audits de sécurité offensifs autonomes propulsés par IA." : "BJHUNT provides autonomous offensive security audits powered by AI." },
    { q: isFr ? "Comment fonctionne la plateforme ?" : "How does the platform work?", a: isFr ? "Vous définissez une cible, notre orchestrateur IA déploie les agents spécialisés dans une sandbox isolée, et vous recevez un rapport détaillé." : "You define a target, our AI orchestrator deploys specialized agents in an isolated sandbox, and you receive a detailed report." },
    { q: isFr ? "Est-ce que BJHUNT remplace un pentester humain ?" : "Does BJHUNT replace human pentesters?", a: isFr ? "BJHUNT complète le travail des équipes de sécurité en automatisant les tâches répétitives." : "BJHUNT complements security teams by automating repetitive tasks." },
  ];

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

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6.25rem 1.25rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem" }}>
          <div>
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
              [CONTACT]
            </span>
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
              {t("heading")}
              <span style={{ color: "var(--bjhunt-text-muted)" }}>.</span>
            </h1>
            <p style={{ fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)", color: "var(--bjhunt-text-muted)", fontSize: 14, lineHeight: "1.5rem", maxWidth: 400, marginTop: "1rem", marginBottom: 0 }}>
              {t("lede")}
            </p>
          </div>

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
                  <label htmlFor="contact-name" style={labelStyle}>{t("fullName")} *</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("namePlaceholder")}
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" style={labelStyle}>{t("professionalEmail")} *</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t("emailPlaceholder")}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-company" style={labelStyle}>{t("company")}</label>
                <input
                  id="contact-company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={t("companyPlaceholder")}
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="contact-subject" style={labelStyle}>{t("subject")} *</label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  style={{ ...inputStyle, appearance: "none" as const }}
                >
                  <option value="">{t("selectSubject")}</option>
                  <option value="demo">{t("subjectDemo")}</option>
                  <option value="pricing">{t("subjectPricing")}</option>
                  <option value="technical">{t("subjectTechnical")}</option>
                  <option value="partnership">{t("subjectPartnership")}</option>
                  <option value="other">{t("subjectOther")}</option>
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" style={labelStyle}>{t("message")} *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder={t("messagePlaceholder")}
                  required
                  style={{
                    ...inputStyle,
                    height: "auto",
                    padding: "0.75rem",
                    resize: "vertical" as const,
                  }}
                />
              </div>

              <div style={{ paddingTop: "0.5rem", overflowX: "auto" }}>
                <HCaptcha
                  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ""}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken("")}
                  ref={captchaRef}
                  theme="light"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    fontSize: 13,
                    borderRadius: 0,
                    border: "1px solid var(--bjhunt-critical)",
                    background: "var(--bjhunt-critical-tint)",
                    color: "var(--bjhunt-critical)",
                  }}
                >
                  <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
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
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  marginTop: "0.5rem",
                }}
              >
                {loading ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : null}
                {loading ? t("sending") : t("sendBtn")}
              </button>
            </form>
          </div>
        </div>
      </div>

      <section style={{ borderTop: "1px solid var(--bjhunt-border)", paddingTop: "6.25rem", paddingBottom: "6.25rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", paddingLeft: "1.25rem", paddingRight: "1.25rem" }}>
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
            [FAQ]
          </span>
          <div style={{ marginTop: "1rem" }}>
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
              {isFr ? "Questions" : "Frequently"} <span style={{ color: "var(--bjhunt-brand)" }}>{isFr ? "Fréquentes" : "Asked"}</span>
            </h2>
          </div>
          <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--bjhunt-border)" }}>
            {faqs.map((faq) => (
              <details
                key={faq.q}
                style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
              >
                <summary
                  style={{
                    display: "flex",
                    cursor: "pointer",
                    listStyle: "none",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: "1.25rem 0",
                    fontSize: 16,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  <span>{faq.q}</span>
                  <ChevronDown style={{ width: 16, height: 16, flexShrink: 0, color: "var(--bjhunt-text-muted)" }} />
                </summary>
                <p
                  style={{
                    fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                    color: "var(--bjhunt-text-muted)",
                    fontSize: 14,
                    lineHeight: "1.5rem",
                    maxWidth: 640,
                    marginTop: 0,
                    marginBottom: "1rem",
                  }}
                >
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}