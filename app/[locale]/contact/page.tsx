"use client";

import { useState, useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useTranslations } from "next-intl";
import { Check, AlertCircle, Loader2 } from "lucide-react";

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  borderBottom: "1px solid var(--bjhunt-border)",
  color: "var(--bjhunt-text)",
  padding: "12px 2px",
  fontSize: 14,
  fontWeight: 300,
  outline: "none",
  fontFamily: "var(--bjhunt-font-sans)",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  marginBottom: 8,
  fontFamily: "var(--bjhunt-font-mono)",
  fontSize: 9,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  color: "var(--bjhunt-text-subtle)",
};

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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 50% 40% at 50% 0%, rgba(48,209,88,0.05), transparent 55%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-xl px-8 py-24 text-center">
          <div
            className="mx-auto mb-8 flex h-16 w-16 items-center justify-center"
            style={{ border: "1px solid rgba(48,209,88,0.40)" }}
          >
            <Check className="h-7 w-7" style={{ color: "#30D158" }} />
          </div>
          <h1
            className="m-0 mb-4"
            style={{ fontSize: 44, fontWeight: 200, letterSpacing: "-0.03em", lineHeight: 1.0 }}
          >
            {t("messageSent")}
          </h1>
          <p
            className="m-0"
            style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, color: "var(--bjhunt-text-muted)" }}
          >
            {t("confirmationMsg")} {formData.email} {t("within48h")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 80% 0%, rgba(99,102,241,0.06), transparent 55%)",
        }}
      />
      {/* Hero */}
      <header
        className="relative z-10 px-8 py-20 md:px-12 lg:px-16"
        style={{ borderBottom: "1px solid var(--bjhunt-border)" }}
      >
        <p
          className="m-0 mb-6 font-mono uppercase"
          style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--bjhunt-text-subtle)" }}
        >
          06 / Contact
        </p>
        <h1
          className="m-0 max-w-3xl"
          style={{
            fontSize: "clamp(40px, 7vw, 72px)",
            fontWeight: 200,
            letterSpacing: "-0.04em",
            lineHeight: 0.95,
          }}
        >
          Parlons-nous<em className="not-italic" style={{ color: "var(--bjhunt-text-muted)", fontWeight: 200 }}>.</em>
        </h1>
        <p
          className="mt-6 max-w-xl"
          style={{ fontSize: 17, fontWeight: 300, lineHeight: 1.6, color: "var(--bjhunt-text-muted)" }}
        >
          Une question, un partenariat, ou un besoin spécifique — réponse sous 24h ouvrées.
        </p>
      </header>

      {/* Form */}
      <div className="relative z-10 mx-auto max-w-xl px-8 py-20">
        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div>
              <label style={LABEL_STYLE}>{t("fullName")} *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder={t("namePlaceholder")}
                required
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>{t("professionalEmail")} *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t("emailPlaceholder")}
                required
                style={FIELD_STYLE}
              />
            </div>
          </div>

          <div>
            <label style={LABEL_STYLE}>{t("company")}</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              placeholder={t("companyPlaceholder")}
              style={FIELD_STYLE}
            />
          </div>

          <div>
            <label style={LABEL_STYLE}>{t("subject")} *</label>
            <select
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              style={{ ...FIELD_STYLE, appearance: "none", paddingRight: 24 }}
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
            <label style={LABEL_STYLE}>{t("message")} *</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              rows={5}
              placeholder={t("messagePlaceholder")}
              required
              style={{ ...FIELD_STYLE, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <div className="pt-2">
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
              className="flex items-center gap-3 px-4 py-3 text-[12px]"
              style={{
                border: "1px solid rgba(255,69,58,0.30)",
                background: "rgba(255,69,58,0.06)",
                color: "#FF8A82",
              }}
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-3 px-5 py-3.5 font-mono uppercase disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              fontSize: 11,
              letterSpacing: "0.22em",
              color: "var(--bjhunt-text)",
              border: "1px solid var(--bjhunt-border-strong)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {loading ? "Envoi…" : "Envoyer le message →"}
          </button>
        </form>
      </div>
    </div>
  );
}
