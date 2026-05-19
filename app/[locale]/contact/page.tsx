"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const fieldClass =
  "w-full bg-transparent border-0 border-b text-[14px] font-normal py-3 px-0 outline-none " +
  "min-h-[44px] md:min-h-[40px] transition-colors " +
  "focus:border-bjhunt-brand placeholder:text-bjhunt-text-disabled font-sans";

const labelClass =
  "block mb-2 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted";

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
      <div className="relative min-h-screen pt-20" style={{ background: "var(--bjhunt-bg)" }}>
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center border" style={{ borderColor: "var(--bjhunt-success)" }}>
            <Check className="h-7 w-7 text-bjhunt-success" />
          </div>
          <h1 className="m-0 mb-4 font-sans font-normal text-[clamp(28px,3vw,36px)] leading-[1.11] tracking-[-0.025em] text-bjhunt-text">
            {t("messageSent")}
          </h1>
          <p className="m-0 font-sans font-normal text-[16px] leading-[1.6] text-bjhunt-text-muted">
            {t("confirmationMsg")} {formData.email} {t("within48h")}
          </p>
          <a href="/" className="mt-8 inline-flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.18em] text-bjhunt-text-muted hover:text-bjhunt-brand transition-colors">
            {t("backHome")} →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-14" style={{ background: "var(--bjhunt-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-6xl px-6 py-16 md:px-12 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          <header>
            <p className="mb-5 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-bjhunt-text-muted m-0">
              Contact
            </p>
            <h1 className="m-0 font-sans font-normal text-[clamp(28px,3vw,36px)] leading-[1.11] tracking-[-0.025em] text-bjhunt-text">
              {t("heading")}
              <span className="text-bjhunt-text-muted">.</span>
            </h1>
            <p className="mt-5 max-w-md font-sans text-[16px] font-normal leading-[1.6] text-bjhunt-text-muted m-0">
              {t("lede")}
            </p>
          </header>

          <div
            className="px-6 md:px-8 py-8"
            style={{
              border: "1px solid var(--bjhunt-border)",
              background: "var(--bjhunt-bg-surface)",
              borderRadius: "var(--bjhunt-radius-md)",
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
                    style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }}
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
                    style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }}
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
                  style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }}
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
                  style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }}
                >
                  <option value="" style={{ color: "var(--bjhunt-text-disabled)" }}>{t("selectSubject")}</option>
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
                  style={{ borderColor: "var(--bjhunt-border)", color: "var(--bjhunt-text)" }}
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
                <div role="alert" aria-live="polite" className="flex items-center gap-3 px-4 py-3 text-[13px] font-normal"
                  style={{ border: "1px solid var(--bjhunt-critical)", background: "var(--bjhunt-critical-tint)", color: "var(--bjhunt-critical)" }}>
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 mt-2 px-5 min-h-[44px] font-mono text-[12px] font-medium uppercase tracking-[0.16em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-bjhunt-brand"
                style={{
                  color: "var(--bjhunt-text-inverted)",
                  background: "var(--bjhunt-brand)",
                  border: "none",
                  borderRadius: "var(--bjhunt-radius-sm)",
                }}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {loading ? t("sending") : t("sendBtn")}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
