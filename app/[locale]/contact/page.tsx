"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Mail, Users, MapPin, ArrowUpRight, Loader2 } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const isFr = typeof document !== "undefined" && document.documentElement.lang === "fr";

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh" }}>
      {/* Hero Section */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "6.25rem 1.25rem 3.25rem",
          textAlign: "center",
        }}
      >
        {/* Promo Label */}
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontFamily: "var(--bjhunt-font-mono)",
            fontWeight: 400,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--bjhunt-text-muted)",
            marginBottom: "1rem",
            textDecoration: "underline",
            textUnderlineOffset: "3px",
          }}
        >
          {t("heroLabel")}
        </span>

        {/* H1 Title */}
        <h1
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontWeight: 700,
            fontSize: "clamp(2rem, 5vw, 3.75rem)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            margin: "0 auto 1rem",
            maxWidth: 900,
          }}
        >
          {t("heroTitle")}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
            color: "var(--bjhunt-text)",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.5,
            maxWidth: 680,
            margin: "0 auto 1.5rem",
          }}
        >
          {t("heroSubtitle")}
        </p>

        {/* Case Study Card */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bjhunt-bg-surface)",
            border: "1px solid var(--bjhunt-border)",
            padding: "0.5rem 0.5rem 0.5rem 1rem",
            gap: "0.75rem",
            maxWidth: 480,
            margin: "0 auto 2rem",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: "var(--bjhunt-bg)",
              border: "1px solid var(--bjhunt-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--bjhunt-brand)" }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div style={{ textAlign: "left", flex: 1 }}>
            <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
              {isFr ? "Audit complet en 48h" : "Full audit in 48h"}
            </p>
            <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 12, color: "var(--bjhunt-text-muted)", margin: 0 }}>
              {isFr ? "Étude de cas · 3 min" : "Case study · 3 min read"}
            </p>
          </div>
          <a
            href="/case-study"
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--bjhunt-text)",
              textDecoration: "none",
              padding: "0.5rem 0.75rem",
              borderLeft: "1px solid var(--bjhunt-border)",
            }}
          >
            {isFr ? "LIRE" : "READ"}
          </a>
        </div>

        {/* Trusted By */}
        <div style={{ marginTop: "1.5rem" }}>
          <p
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 400,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "var(--bjhunt-text-muted)",
              marginBottom: "1rem",
            }}
          >
            {t("trustedBy")}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "2rem",
              flexWrap: "wrap",
              opacity: 0.5,
            }}
          >
            {["Hugging Face", "Gumloop", "Manus", "Groq", "Lindy"].map((name) => (
              <span
                key={name}
                style={{
                  fontFamily: "var(--bjhunt-font-sans)",
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--bjhunt-text)",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Calendly/Form Section */}
      <div
        id="book-call"
        style={{
          maxWidth: 800,
          margin: "0 auto",
          padding: "3rem 1.25rem 4rem",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
            fontSize: 16,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "2rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {t("formTitle")}
        </h2>

        <ContactForm />
      </div>

      {/* Contact Cards Section */}
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          borderTop: "1px solid var(--bjhunt-border)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {/* Email Card */}
          <div
            style={{
              flex: "1 1 300px",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "0.75rem",
              borderRight: "1px solid var(--bjhunt-border)",
            }}
          >
            <Mail className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />
            <h3
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t("emailTitle")}
            </h3>
            <p
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--bjhunt-text-secondary)",
                margin: 0,
                maxWidth: 260,
              }}
            >
              {t("emailDesc")}
            </p>
            <a
              href="mailto:hello@bjhunt.com"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                height: 36,
                padding: "0 14px",
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: "var(--bjhunt-text)",
                color: "var(--bjhunt-bg)",
                textDecoration: "none",
                borderRadius: 0,
                marginTop: "0.25rem",
              }}
            >
              {t("emailCta")} <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {/* Careers Card */}
          <div
            style={{
              flex: "1 1 300px",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "0.75rem",
              borderRight: "1px solid var(--bjhunt-border)",
            }}
          >
            <Users className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />
            <h3
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t("careersTitle")}
            </h3>
            <p
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--bjhunt-text-secondary)",
                margin: 0,
                maxWidth: 260,
              }}
            >
              {t("careersDesc")}
            </p>
            <a
              href="/careers"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                height: 36,
                padding: "0 14px",
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: "var(--bjhunt-text)",
                color: "var(--bjhunt-bg)",
                textDecoration: "none",
                borderRadius: 0,
                marginTop: "0.25rem",
              }}
            >
              {t("careersCta")} <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>

          {/* Location Card */}
          <div
            style={{
              flex: "1 1 300px",
              padding: "2.5rem 2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: "0.75rem",
            }}
          >
            <MapPin className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />
            <h3
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 16,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {t("locationTitle")}
            </h3>
            <p
              style={{
                fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--bjhunt-text-secondary)",
                margin: 0,
                maxWidth: 260,
              }}
            >
              {t("locationDesc")}
            </p>
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                height: 36,
                padding: "0 14px",
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 11,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: "var(--bjhunt-text)",
                color: "var(--bjhunt-bg)",
                textDecoration: "none",
                borderRadius: 0,
                marginTop: "0.25rem",
              }}
            >
              {t("locationCta")} <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 0" }}>
        <p
          style={{
            fontFamily: "var(--bjhunt-font-mono)",
            fontSize: 14,
            color: "var(--bjhunt-text)",
          }}
        >
          {t("messageSent")}
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: "1px solid var(--bjhunt-border)",
    background: "var(--bjhunt-bg)",
    borderRadius: 0,
    height: 44,
    padding: "0 0.75rem",
    fontFamily: "var(--bjhunt-font-sans, IBM Plex Sans, sans-serif)",
    fontSize: 14,
    color: "var(--bjhunt-text)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "0.375rem",
    fontFamily: "var(--bjhunt-font-mono)",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--bjhunt-text-muted)",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }} noValidate>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
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

      {error && (
        <p
          style={{
            fontSize: 13,
            color: "var(--bjhunt-critical)",
            fontFamily: "var(--bjhunt-font-sans)",
            margin: 0,
          }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          height: 48,
          fontFamily: "var(--bjhunt-font-mono)",
          fontSize: 12,
          fontWeight: 500,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          borderRadius: 0,
          border: "none",
          background: "var(--bjhunt-text)",
          color: "var(--bjhunt-bg)",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? t("sending") : t("sendBtn")}
      </button>
    </form>
  );
}
