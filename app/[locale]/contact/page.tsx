"use client";

import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTranslations } from "next-intl";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const fieldClass =
  "w-full bg-transparent border-0 border-b border-[var(--bjhunt-border)] " +
  "text-[var(--bjhunt-text)] text-[14px] font-normal py-3 px-0 outline-none " +
  "min-h-[44px] md:min-h-[40px] transition-colors " +
  "focus:border-[var(--success)] placeholder:text-[var(--bjhunt-text-subtle)] " +
  "[font-family:var(--bjhunt-font-sans)]";

const labelClass =
  "block mb-2 [font-family:var(--bjhunt-font-mono)] text-[12px] font-semibold " +
  "uppercase tracking-[0.18em] text-[var(--bjhunt-text-muted)]";

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

  if (submitted) {
    return (
      <div className="relative min-h-screen pt-20">
        <div className="relative z-10 mx-auto max-w-xl px-6 py-24 text-center">
          <div
            className="mx-auto mb-8 flex h-16 w-16 items-center justify-center"
            style={{ border: "1px solid var(--success)" }}
          >
            <Check className="h-7 w-7" style={{ color: "var(--success)" }} />
          </div>
          <h1
            className="m-0 mb-4 font-normal"
            style={{
              fontFamily: "var(--bjhunt-font-sans)",
              fontSize: "clamp(28px, 3vw, 36px)",
              letterSpacing: "-0.025em",
              lineHeight: 1.11,
            }}
          >
            {t("messageSent")}
          </h1>
          <p
            className="m-0 font-normal"
            style={{ fontSize: 16, lineHeight: 1.6, color: "var(--bjhunt-text-muted)" }}
          >
            {t("confirmationMsg")} {formData.email} {t("within48h")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-14">
      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-12 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left column — heading + lede */}
          <header>
            <p
              className="m-0 mb-6 [font-family:var(--bjhunt-font-mono)] uppercase font-semibold"
              style={{ fontSize: 12, letterSpacing: "0.18em", color: "var(--bjhunt-text-muted)" }}
            >
              06 / Contact
            </p>
            <h1
              className="m-0 font-normal"
              style={{
                fontFamily: "var(--bjhunt-font-sans)",
                fontSize: "clamp(28px, 3vw, 36px)",
                letterSpacing: "-0.025em",
                lineHeight: 1.11,
              }}
            >
              Parlons-nous
              <em className="not-italic" style={{ color: "var(--bjhunt-text-muted)" }}>.</em>
            </h1>
            <p
              className="mt-6 max-w-md font-normal"
              style={{ fontSize: 16, lineHeight: 1.6, color: "var(--bjhunt-text-muted)" }}
            >
              Une question, un partenariat, ou un besoin spécifique — réponse sous 24h ouvrées.
            </p>
          </header>

          {/* Right column — form card */}
          <div
            className="px-6 md:px-8 py-8"
            style={{
              border: "1px solid var(--bjhunt-border)",
              background: "var(--bjhunt-bg-secondary)",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="contact-name" className={labelClass}>{t("fullName")} *</label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("namePlaceholder")}
                    required
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className={labelClass}>{t("professionalEmail")} *</label>
                  <input
                    id="contact-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t("emailPlaceholder")}
                    required
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-company" className={labelClass}>{t("company")}</label>
                <input
                  id="contact-company"
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder={t("companyPlaceholder")}
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className={labelClass}>{t("subject")} *</label>
                <select
                  id="contact-subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className={`${fieldClass} appearance-none pr-6`}
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
                <label htmlFor="contact-message" className={labelClass}>{t("message")} *</label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder={t("messagePlaceholder")}
                  required
                  className={`${fieldClass} resize-y leading-relaxed`}
                />
              </div>

              <div className="pt-2 overflow-x-auto">
                <HCaptcha
                  sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITEKEY || ""}
                  onVerify={(token) => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken("")}
                  ref={captchaRef}
                  theme="dark"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  id="contact-error"
                  className="flex items-center gap-3 px-4 py-3 text-[13px] font-normal"
                  style={{
                    border: "1px solid var(--severity-critical)",
                    background: "var(--severity-critical-bg)",
                    color: "var(--severity-critical)",
                  }}
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                aria-describedby={error ? "contact-error" : undefined}
                className="inline-flex w-full items-center justify-center gap-3 mt-2 px-5 font-medium uppercase tracking-[0.16em] transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--success)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bjhunt-bg-secondary)]"
                style={{
                  fontSize: 12,
                  color: "var(--success)",
                  border: "1px solid var(--success)",
                  background: "transparent",
                  minHeight: 44,
                  fontFamily: "var(--bjhunt-font-mono)",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "var(--success-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loading ? "Envoi…" : "Envoyer le message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
