"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Mail, Users, MapPin, ArrowUpRight, Check, Loader2 } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const [isPending, startTransition] = useTransition();
  const [formState, setFormState] = useState<"idle" | "success" | "error">("idle");
  const [formData, setFormData] = useState({ name: "", email: "", company: "", subject: "", message: "" });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 0.75rem",
    fontFamily: "var(--bjhunt-font-mono)",
    fontSize: 13,
    fontWeight: 400,
    background: "var(--bjhunt-bg-surface)",
    border: "1px solid var(--bjhunt-border)",
    color: "var(--bjhunt-text)",
    outline: "none",
    borderRadius: 0,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "var(--bjhunt-font-mono)",
    fontSize: 11,
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "var(--bjhunt-text-muted)",
    marginBottom: "0.375rem",
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed");
        setFormState("success");
        setFormData({ name: "", email: "", company: "", subject: "", message: "" });
      } catch {
        setFormState("error");
      }
    });
  };

  return (
    <div style={{ background: "var(--bjhunt-bg)", color: "var(--bjhunt-text)", minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "6.25rem 1.25rem 3.25rem", textAlign: "center" }}>
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
              {t("subjectDemo")}
            </p>
            <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 12, color: "var(--bjhunt-text-muted)", margin: 0 }}>
              Case study · 3 min read
            </p>
          </div>
          <span
            style={{
              fontFamily: "var(--bjhunt-font-mono)",
              fontSize: 11,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--bjhunt-text)",
              padding: "0.5rem 0.75rem",
              borderLeft: "1px solid var(--bjhunt-border)",
            }}
          >
            LEARN HOW
          </span>
        </div>

        {/* Offensive Toolchain */}
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
            OFFENSIVE TOOLCHAIN
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1.5rem", flexWrap: "wrap", opacity: 0.6 }}>
            {[
              { name: "Metasploit", src: "/tools/metasploit.svg" },
              { name: "Burp Suite", src: "/tools/burpsuite.svg" },
              { name: "Wireshark", src: "/tools/wireshark.svg" },
              { name: "OWASP", src: "/tools/owasp.svg" },
              { name: "Kali Linux", src: "/tools/kalilinux.svg" },
              { name: "Hack The Box", src: "/tools/hackthebox.svg" },
              { name: "TryHackMe", src: "/tools/tryhackme.svg" },
              { name: "PortSwigger", src: "/tools/portswigger.svg" },
            ].map((tool) => (
              <div key={tool.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem" }}>
                <img src={tool.src} alt={tool.name} width={28} height={28} style={{ color: "var(--bjhunt-brand)" }} />
                <span style={{ fontFamily: "var(--bjhunt-font-mono)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--bjhunt-text-muted)" }}>
                  {tool.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "3rem 1.25rem 4rem" }}>
        {formState === "success" ? (
          <div style={{ padding: "2rem", textAlign: "center", background: "var(--bjhunt-bg-surface)", border: "1px solid var(--bjhunt-border)" }}>
            <Check className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--bjhunt-brand)" }} />
            <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, fontWeight: 600 }}>{t("messageSent")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2
              style={{
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 13,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--bjhunt-text-muted)",
                textAlign: "center",
                marginBottom: "2rem",
              }}
            >
              {t("formTitle")}
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={labelStyle}>{t("firstName")}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t("firstNamePlaceholder")}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>{t("companyEmail")}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t("emailPlaceholder")}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>{t("company")}</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder={t("companyPlaceholder")}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>{t("subject")}</label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}
              >
                <option value="">{t("selectSubject")}</option>
                <option value="demo">{t("subjectDemo")}</option>
                <option value="pricing">{t("subjectPricing")}</option>
                <option value="technical">{t("subjectTechnical")}</option>
                <option value="partnership">{t("subjectPartnership")}</option>
                <option value="other">{t("subjectOther")}</option>
              </select>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={labelStyle}>{t("message")}</label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t("messagePlaceholder")}
                style={{ ...inputStyle, height: "auto", padding: "0.75rem", resize: "vertical", fontFamily: "var(--bjhunt-font-mono)" }}
              />
            </div>

            {formState === "error" && (
              <p style={{ color: "#ef4444", fontSize: 13, marginBottom: "1rem", fontFamily: "var(--bjhunt-font-sans)" }}>
                {t("connectionError")}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                height: 44,
                padding: "0 32px",
                fontFamily: "var(--bjhunt-font-mono)",
                fontSize: 12,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                background: "var(--bjhunt-text)",
                color: "var(--bjhunt-bg)",
                border: "none",
                cursor: isPending ? "wait" : "pointer",
                width: "100%",
                borderRadius: 0,
              }}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("sendBtn")}
            </button>
          </form>
        )}
      </div>

      {/* Contact Cards */}
      <div style={{ maxWidth: 1200, margin: "0 auto", borderTop: "1px solid var(--bjhunt-border)" }}>
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {[
            { icon: <Mail className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />, title: t("emailTitle"), desc: t("emailDesc"), cta: t("emailCta"), href: "mailto:hello@bjhunt.com" },
            { icon: <Users className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />, title: t("careersTitle"), desc: t("careersDesc"), cta: t("careersCta"), href: "/careers" },
            { icon: <MapPin className="w-5 h-5" style={{ color: "var(--bjhunt-brand)" }} />, title: t("locationTitle"), desc: t("locationDesc"), cta: t("locationCta"), href: "https://maps.google.com" },
          ].map((card, i) => (
            <div
              key={i}
              style={{
                flex: "1 1 300px",
                padding: "2.5rem 2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: "0.75rem",
                borderRight: i < 2 ? "1px solid var(--bjhunt-border)" : undefined,
              }}
            >
              {card.icon}
              <h3 style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 16, fontWeight: 700, margin: 0 }}>{card.title}</h3>
              <p style={{ fontFamily: "var(--bjhunt-font-sans)", fontSize: 14, lineHeight: 1.4, color: "var(--bjhunt-text-secondary)", margin: 0, maxWidth: 260 }}>{card.desc}</p>
              <a
                href={card.href}
                target={card.href.startsWith("http") ? "_blank" : undefined}
                rel={card.href.startsWith("http") ? "noopener noreferrer" : undefined}
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
                {card.cta} <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}